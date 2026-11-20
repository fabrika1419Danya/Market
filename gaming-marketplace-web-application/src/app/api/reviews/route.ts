import { NextResponse } from "next/server";
import { db, reviews, orders, users, messages } from "@/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

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
    const orderId = Number(body.orderId);
    const rating = Math.round(Number(body.rating));
    const text = String(body.text || "").trim();

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { error: "Некорректный заказ" },
        { status: 400 }
      );
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Оценка должна быть от 1 до 5 звёзд" },
        { status: 400 }
      );
    }
    if (text.length < 3 || text.length > 600) {
      return NextResponse.json(
        { error: "Текст отзыва должен содержать от 3 до 600 символов" },
        { status: 400 }
      );
    }

    const created = await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!order) {
        throw new Error("Заказ не найден");
      }
      if (order.buyerId !== user.id) {
        throw new Error("Оставить отзыв может только покупатель заказа");
      }
      if (order.status !== "completed") {
        throw new Error(
          "Оставить отзыв можно после подтверждения выполнения заказа"
        );
      }

      const existing = await tx
        .select()
        .from(reviews)
        .where(eq(reviews.orderId, orderId));

      if (existing.length > 0) {
        throw new Error("Отзыв по этому заказу уже опубликован");
      }

      const [newReview] = await tx
        .insert(reviews)
        .values({
          orderId,
          authorId: user.id,
          targetUserId: order.sellerId,
          rating,
          text,
        })
        .returning();

      const sellerReviews = await tx
        .select()
        .from(reviews)
        .where(eq(reviews.targetUserId, order.sellerId));

      const avg =
        sellerReviews.reduce((acc, r) => acc + r.rating, 0) /
        sellerReviews.length;

      await tx
        .update(users)
        .set({
          rating: avg.toFixed(2),
          reviewsCount: sellerReviews.length,
        })
        .where(eq(users.id, order.sellerId));

      await tx.insert(messages).values({
        senderId: user.id,
        receiverId: order.sellerId,
        orderId,
        isSystem: true,
        text: `★ Покупатель ${user.username} оставил отзыв (${rating}/5): «${text}»`,
      });

      return newReview;
    });

    return NextResponse.json({
      review: {
        id: created.id,
        orderId: created.orderId,
        rating: created.rating,
        text: created.text,
        createdAt: created.createdAt.toISOString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось сохранить отзыв";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
