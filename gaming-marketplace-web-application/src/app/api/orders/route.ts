import { NextResponse } from "next/server";
import {
  db,
  orders,
  lots,
  games,
  users,
  reviews,
  messages,
  walletTransactions,
} from "@/db";
import { desc, eq, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { emitChatMessage } from "@/lib/chatBus";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeeded();
    const user = await getCurrentUser(true);
    if (!user) {
      return NextResponse.json(
        { error: "Требуется авторизация" },
        { status: 401 }
      );
    }

    const buyerAlias = alias(users, "buyer_user");
    const sellerAlias = alias(users, "seller_user");

    const rows = await db
      .select({
        order: orders,
        lot: lots,
        game: games,
        buyer: {
          id: buyerAlias.id,
          username: buyerAlias.username,
          avatar: buyerAlias.avatar,
          isOnline: buyerAlias.isOnline,
        },
        seller: {
          id: sellerAlias.id,
          username: sellerAlias.username,
          avatar: sellerAlias.avatar,
          isOnline: sellerAlias.isOnline,
          rating: sellerAlias.rating,
        },
        review: reviews,
      })
      .from(orders)
      .innerJoin(lots, eq(orders.lotId, lots.id))
      .innerJoin(games, eq(lots.gameId, games.id))
      .innerJoin(buyerAlias, eq(orders.buyerId, buyerAlias.id))
      .innerJoin(sellerAlias, eq(orders.sellerId, sellerAlias.id))
      .leftJoin(reviews, eq(reviews.orderId, orders.id))
      .where(or(eq(orders.buyerId, user.id), eq(orders.sellerId, user.id)))
      .orderBy(desc(orders.createdAt));

    return NextResponse.json({
      orders: rows.map((r) => ({
        id: r.order.id,
        role: r.order.buyerId === user.id ? "buyer" : "seller",
        amount: Number(r.order.amount),
        status: r.order.status,
        deliveredData: r.order.deliveredData,
        disputeReason: r.order.disputeReason,
        createdAt: r.order.createdAt.toISOString(),
        completedAt: r.order.completedAt
          ? r.order.completedAt.toISOString()
          : null,
        lot: {
          id: r.lot.id,
          title: r.lot.title,
          category: r.lot.category,
          serverName: r.lot.serverName,
          gameName: r.game.name,
          gameIcon: r.game.icon,
          gameSlug: r.game.slug,
        },
        buyer: r.buyer,
        seller: {
          ...r.seller,
          rating: Number(r.seller.rating),
        },
        review: r.review
          ? {
              id: r.review.id,
              rating: r.review.rating,
              text: r.review.text,
              createdAt: r.review.createdAt.toISOString(),
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Orders GET error:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить список заказов" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const user = await getCurrentUser(true);
    if (!user) {
      return NextResponse.json(
        { error: "Войдите в аккаунт для безопасной покупки" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const lotId = Number(body.lotId);
    const buyerComment = String(body.comment || "").trim();

    if (!Number.isInteger(lotId) || lotId <= 0) {
      return NextResponse.json(
        { error: "Некорректный идентификатор лота" },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      const [lot] = await tx.select().from(lots).where(eq(lots.id, lotId));
      if (!lot || !lot.isActive || lot.stockCount <= 0) {
        throw new Error("Лот уже раскуплен или снят с продажи");
      }

      if (lot.sellerId === user.id) {
        throw new Error("Нельзя купить собственный лот");
      }

      const [freshBuyer] = await tx
        .select()
        .from(users)
        .where(eq(users.id, user.id));

      const priceNum = Number(lot.price);
      const balanceNum = Number(freshBuyer.balance);

      if (balanceNum < priceNum) {
        throw new Error(
          `Недостаточно средств на балансе. Не хватает ${(priceNum - balanceNum).toFixed(0)} ₽`
        );
      }

      // 1. Freeze funds on buyer balance
      const [updatedBuyer] = await tx
        .update(users)
        .set({
          balance: sql`${users.balance} - ${lot.price}::numeric`,
        })
        .where(eq(users.id, user.id))
        .returning();

      // 2. Decrement lot stock
      const newStock = lot.stockCount - 1;
      await tx
        .update(lots)
        .set({
          stockCount: newStock,
          isActive: newStock > 0 ? lot.isActive : false,
        })
        .where(eq(lots.id, lot.id));

      // 3. Snapshot auto-delivery credentials if configured
      const deliveredData =
        lot.autoDeliveryText && lot.autoDeliveryText.trim().length > 0
          ? lot.autoDeliveryText.trim()
          : null;

      // 4. Create escrow order with status 'paid'
      const [createdOrder] = await tx
        .insert(orders)
        .values({
          buyerId: user.id,
          sellerId: lot.sellerId,
          lotId: lot.id,
          amount: lot.price,
          status: "paid",
          deliveredData,
        })
        .returning();

      // 5. Log wallet escrow freeze
      await tx.insert(walletTransactions).values({
        userId: user.id,
        type: "escrow_hold",
        amount: (-priceNum).toFixed(2),
        description: `Оплата лота «${lot.title.slice(0, 60)}» (Заказ #${createdOrder.id})`,
        orderId: createdOrder.id,
      });

      // 6. Send system escrow message to live chat
      const [sysMsg] = await tx
        .insert(messages)
        .values({
          senderId: user.id,
          receiverId: lot.sellerId,
          orderId: createdOrder.id,
          isSystem: true,
          text: `Покупатель ${user.username} оплатил заказ #${createdOrder.id} на сумму ${priceNum.toLocaleString("ru-RU")} ₽. Средства заморожены гарантом биржи до подтверждения выполнения.`,
        })
        .returning();

      emitChatMessage({
        id: sysMsg.id,
        senderId: sysMsg.senderId,
        receiverId: sysMsg.receiverId,
        orderId: sysMsg.orderId,
        isSystem: sysMsg.isSystem,
        text: sysMsg.text,
        timestamp: sysMsg.timestamp.toISOString(),
      });

      if (buyerComment) {
        await tx.insert(messages).values({
          senderId: user.id,
          receiverId: lot.sellerId,
          orderId: createdOrder.id,
          isSystem: false,
          text: buyerComment,
        });
      }

      if (deliveredData) {
        await tx.insert(messages).values({
          senderId: lot.sellerId,
          receiverId: user.id,
          orderId: createdOrder.id,
          isSystem: true,
          text: `⚡ Автовыдача по заказу #${createdOrder.id} выполнена! Данные товара доставлены в карточку заказа. Проверьте товар и нажмите «Подтвердить выполнение».`,
        });
      }

      return {
        order: createdOrder,
        newBalance: Number(updatedBuyer.balance),
        sellerId: lot.sellerId,
      };
    });

    return NextResponse.json({
      orderId: result.order.id,
      status: result.order.status,
      deliveredData: result.order.deliveredData,
      newBalance: result.newBalance,
      sellerId: result.sellerId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось оформить сделку";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
