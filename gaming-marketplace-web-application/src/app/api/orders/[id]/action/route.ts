import { NextResponse } from "next/server";
import {
  db,
  orders,
  users,
  lots,
  messages,
  walletTransactions,
} from "@/db";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { emitChatMessage } from "@/lib/chatBus";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(true);
    if (!user) {
      return NextResponse.json(
        { error: "Требуется авторизация" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { error: "Некорректный номер заказа" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const action = String(body.action || "");
    const reason = String(body.reason || "").trim();

    const updatedOrder = await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!order) {
        throw new Error("Заказ не найден");
      }

      const isBuyer = order.buyerId === user.id;
      const isSeller = order.sellerId === user.id;
      if (!isBuyer && !isSeller) {
        throw new Error("У вас нет доступа к этому заказу");
      }

      const amountNum = Number(order.amount);

      if (action === "complete") {
        if (!isBuyer) {
          throw new Error(
            "Только покупатель может подтвердить получение товара и разблокировать оплату"
          );
        }
        if (order.status !== "paid" && order.status !== "disputed") {
          throw new Error("Заказ уже закрыт");
        }

        // Release escrow funds to seller
        await tx
          .update(users)
          .set({
            balance: sql`${users.balance} + ${order.amount}::numeric`,
          })
          .where(eq(users.id, order.sellerId));

        await tx.insert(walletTransactions).values({
          userId: order.sellerId,
          type: "sale_release",
          amount: order.amount,
          description: `Разблокировка средств гарантом по заказу #${order.id}`,
          orderId: order.id,
        });

        const [done] = await tx
          .update(orders)
          .set({
            status: "completed",
            completedAt: new Date(),
          })
          .where(eq(orders.id, order.id))
          .returning();

        const [doneMsg] = await tx
          .insert(messages)
          .values({
            senderId: user.id,
            receiverId: order.sellerId,
            orderId: order.id,
            isSystem: true,
            text: `✅ Покупатель ${user.username} подтвердил выполнение заказа #${order.id}. Средства (${amountNum.toLocaleString("ru-RU")} ₽) зачислены на баланс продавца.`,
          })
          .returning();

        emitChatMessage({
          id: doneMsg.id,
          senderId: doneMsg.senderId,
          receiverId: doneMsg.receiverId,
          orderId: doneMsg.orderId,
          isSystem: doneMsg.isSystem,
          text: doneMsg.text,
          timestamp: doneMsg.timestamp.toISOString(),
        });

        return done;
      }

      if (action === "dispute") {
        if (order.status !== "paid") {
          throw new Error("Спор можно открыть только по активному оплаченному заказу");
        }
        const disputeReason =
          reason || "Товар не соответствует описанию или задержка передачи";

        const [disputed] = await tx
          .update(orders)
          .set({
            status: "disputed",
            disputeReason,
          })
          .where(eq(orders.id, order.id))
          .returning();

        const receiverId = isBuyer ? order.sellerId : order.buyerId;
        await tx.insert(messages).values({
          senderId: user.id,
          receiverId,
          orderId: order.id,
          isSystem: true,
          text: `⚠️ Пользователь ${user.username} открыл арбитражный спор по заказу #${order.id}. Причина: «${disputeReason}». Средства остаются замороженными.`,
        });

        return disputed;
      }

      if (action === "refund") {
        // Seller can refund voluntarily at any time while paid/disputed; buyer can cancel if disputed in demo arbitration
        if (order.status !== "paid" && order.status !== "disputed") {
          throw new Error("Возврат невозможен для завершённого заказа");
        }
        if (!isSeller && order.status !== "disputed") {
          throw new Error(
            "Покупатель может сначала открыть спор, либо попросить продавца отменить заказ"
          );
        }

        // Return frozen funds to buyer
        await tx
          .update(users)
          .set({
            balance: sql`${users.balance} + ${order.amount}::numeric`,
          })
          .where(eq(users.id, order.buyerId));

        await tx.insert(walletTransactions).values({
          userId: order.buyerId,
          type: "refund",
          amount: order.amount,
          description: `Возврат средств гарантом по заказу #${order.id}`,
          orderId: order.id,
        });

        // Restore stock count on lot
        await tx
          .update(lots)
          .set({
            stockCount: sql`${lots.stockCount} + 1`,
            isActive: true,
          })
          .where(eq(lots.id, order.lotId));

        const [refunded] = await tx
          .update(orders)
          .set({
            status: "refunded",
            completedAt: new Date(),
          })
          .where(eq(orders.id, order.id))
          .returning();

        const receiverId = isSeller ? order.buyerId : order.sellerId;
        await tx.insert(messages).values({
          senderId: user.id,
          receiverId,
          orderId: order.id,
          isSystem: true,
          text: `↩️ Заказ #${order.id} отменён (${isSeller ? "возврат от продавца" : "решение арбитража"}). Сумма ${amountNum.toLocaleString("ru-RU")} ₽ полностью возвращена покупателю.`,
        });

        return refunded;
      }

      throw new Error("Неизвестное действие по заказу");
    });

    return NextResponse.json({
      ok: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        disputeReason: updatedOrder.disputeReason,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка обработки заказа";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
