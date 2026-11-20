import { NextResponse } from "next/server";
import { db, messages, users, orders, lots } from "@/db";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { emitChatMessage } from "@/lib/chatBus";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const user = await getCurrentUser(true);
    if (!user) {
      return NextResponse.json(
        { error: "Требуется авторизация" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const partnerIdParam = Number(searchParams.get("partnerId") || 0);
    const partnerUsername = (searchParams.get("partner") || "").trim();

    // Fetch all messages involving this user to build conversation list
    const allUserMessages = await db
      .select()
      .from(messages)
      .where(
        or(eq(messages.senderId, user.id), eq(messages.receiverId, user.id))
      )
      .orderBy(desc(messages.timestamp));

    const partnerIdsSet = new Set<number>();
    const lastMessageByPartner = new Map<
      number,
      typeof messages.$inferSelect
    >();

    for (const m of allUserMessages) {
      const otherId = m.senderId === user.id ? m.receiverId : m.senderId;
      if (otherId === user.id) continue;
      partnerIdsSet.add(otherId);
      if (!lastMessageByPartner.has(otherId)) {
        lastMessageByPartner.set(otherId, m);
      }
    }

    let resolvedPartnerId = partnerIdParam > 0 ? partnerIdParam : 0;

    if (!resolvedPartnerId && partnerUsername) {
      const [u] = await db
        .select()
        .from(users)
        .where(eq(users.username, partnerUsername));
      if (u && u.id !== user.id) {
        resolvedPartnerId = u.id;
      }
    }

    if (resolvedPartnerId > 0 && resolvedPartnerId !== user.id) {
      partnerIdsSet.add(resolvedPartnerId);
    }

    const partnerIds = Array.from(partnerIdsSet);
    const partnerRows =
      partnerIds.length > 0
        ? await db.select().from(users).where(inArray(users.id, partnerIds))
        : [];

    const partnerMap = new Map(partnerRows.map((p) => [p.id, p]));

    const contacts = partnerIds
      .map((pid) => {
        const p = partnerMap.get(pid);
        if (!p) return null;
        const lastMsg = lastMessageByPartner.get(pid);
        return {
          id: p.id,
          username: p.username,
          avatar: p.avatar,
          rating: Number(p.rating),
          reviewsCount: p.reviewsCount,
          isOnline: p.isOnline,
          lastMessage: lastMsg
            ? {
                text: lastMsg.text,
                timestamp: lastMsg.timestamp.toISOString(),
                isSystem: lastMsg.isSystem,
              }
            : null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => {
        if (!a.lastMessage && b.lastMessage) return -1;
        if (a.lastMessage && !b.lastMessage) return 1;
        if (a.lastMessage && b.lastMessage) {
          return (
            new Date(b.lastMessage.timestamp).getTime() -
            new Date(a.lastMessage.timestamp).getTime()
          );
        }
        return 0;
      });

    const activePartnerId =
      resolvedPartnerId > 0
        ? resolvedPartnerId
        : contacts.length > 0
          ? contacts[0].id
          : 0;

    let threadMessages: Array<{
      id: number;
      senderId: number;
      receiverId: number;
      orderId: number | null;
      isSystem: boolean;
      text: string;
      timestamp: string;
    }> = [];

    let sharedOrders: Array<{
      id: number;
      amount: number;
      status: string;
      role: "buyer" | "seller";
      lotTitle: string;
      deliveredData: string | null;
    }> = [];

    if (activePartnerId > 0) {
      const dialogRows = await db
        .select()
        .from(messages)
        .where(
          or(
            and(
              eq(messages.senderId, user.id),
              eq(messages.receiverId, activePartnerId)
            ),
            and(
              eq(messages.senderId, activePartnerId),
              eq(messages.receiverId, user.id)
            )
          )
        )
        .orderBy(asc(messages.timestamp));

      threadMessages = dialogRows.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        receiverId: m.receiverId,
        orderId: m.orderId,
        isSystem: m.isSystem,
        text: m.text,
        timestamp: m.timestamp.toISOString(),
      }));

      const orderRows = await db
        .select({
          order: orders,
          lotTitle: lots.title,
        })
        .from(orders)
        .innerJoin(lots, eq(orders.lotId, lots.id))
        .where(
          or(
            and(
              eq(orders.buyerId, user.id),
              eq(orders.sellerId, activePartnerId)
            ),
            and(
              eq(orders.buyerId, activePartnerId),
              eq(orders.sellerId, user.id)
            )
          )
        )
        .orderBy(desc(orders.createdAt))
        .limit(5);

      sharedOrders = orderRows.map((o) => ({
        id: o.order.id,
        amount: Number(o.order.amount),
        status: o.order.status,
        role: o.order.buyerId === user.id ? "buyer" : "seller",
        lotTitle: o.lotTitle,
        deliveredData: o.order.deliveredData,
      }));
    }

    return NextResponse.json({
      contacts,
      activePartnerId,
      messages: threadMessages,
      sharedOrders,
    });
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить чат" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(true);
    if (!user) {
      return NextResponse.json(
        { error: "Требуется авторизация" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const receiverId = Number(body.receiverId);
    const orderId = body.orderId ? Number(body.orderId) : null;
    const text = String(body.text || "").trim();

    if (!Number.isInteger(receiverId) || receiverId <= 0 || receiverId === user.id) {
      return NextResponse.json(
        { error: "Некорректный получатель сообщения" },
        { status: 400 }
      );
    }

    if (!text || text.length > 2000) {
      return NextResponse.json(
        { error: "Сообщение должно содержать от 1 до 2000 символов" },
        { status: 400 }
      );
    }

    const [receiver] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, receiverId));

    if (!receiver) {
      return NextResponse.json(
        { error: "Получатель не найден" },
        { status: 404 }
      );
    }

    const [created] = await db
      .insert(messages)
      .values({
        senderId: user.id,
        receiverId,
        orderId: orderId && Number.isInteger(orderId) ? orderId : null,
        isSystem: false,
        text,
      })
      .returning();

    const payload = {
      id: created.id,
      senderId: created.senderId,
      receiverId: created.receiverId,
      orderId: created.orderId,
      isSystem: created.isSystem,
      text: created.text,
      timestamp: created.timestamp.toISOString(),
    };

    emitChatMessage(payload);

    return NextResponse.json({ message: payload });
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json(
      { error: "Не удалось отправить сообщение" },
      { status: 500 }
    );
  }
}
