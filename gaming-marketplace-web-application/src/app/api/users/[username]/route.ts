import { NextResponse } from "next/server";
import { db, users, lots, games, reviews, orders } from "@/db";
import { and, desc, eq } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    await ensureSeeded();
    const { username } = await context.params;
    const decodedUsername = decodeURIComponent(username);

    const [profileUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, decodedUsername));

    if (!profileUser) {
      return NextResponse.json(
        { error: "Пользователь не найден" },
        { status: 404 }
      );
    }

    const activeLotsRows = await db
      .select({
        lot: lots,
        game: games,
      })
      .from(lots)
      .innerJoin(games, eq(lots.gameId, games.id))
      .where(
        and(eq(lots.sellerId, profileUser.id), eq(lots.isActive, true))
      )
      .orderBy(desc(lots.createdAt));

    const reviewRows = await db
      .select({
        review: reviews,
        authorUsername: users.username,
        authorAvatar: users.avatar,
        orderAmount: orders.amount,
        lotTitle: lots.title,
        gameName: games.name,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.authorId, users.id))
      .innerJoin(orders, eq(reviews.orderId, orders.id))
      .innerJoin(lots, eq(orders.lotId, lots.id))
      .innerJoin(games, eq(lots.gameId, games.id))
      .where(eq(reviews.targetUserId, profileUser.id))
      .orderBy(desc(reviews.createdAt));

    const viewer = await getCurrentUser(false);

    return NextResponse.json({
      profile: {
        id: profileUser.id,
        username: profileUser.username,
        avatar: profileUser.avatar,
        bio: profileUser.bio,
        rating: Number(profileUser.rating),
        reviewsCount: profileUser.reviewsCount,
        isOnline: profileUser.isOnline,
        lastSeenAt: profileUser.lastSeenAt.toISOString(),
        createdAt: profileUser.createdAt.toISOString(),
        isSelf: viewer?.id === profileUser.id,
      },
      lots: activeLotsRows
        .filter((r) => r.lot.stockCount > 0)
        .map(({ lot, game }) => ({
          id: lot.id,
          gameId: game.id,
          gameName: game.name,
          gameSlug: game.slug,
          gameIcon: game.icon,
          category: lot.category,
          serverName: lot.serverName,
          title: lot.title,
          description: lot.description,
          price: Number(lot.price),
          stockCount: lot.stockCount,
          hasAutoDelivery: Boolean(
            lot.autoDeliveryText && lot.autoDeliveryText.trim().length > 0
          ),
          createdAt: lot.createdAt.toISOString(),
        })),
      reviews: reviewRows.map((r) => ({
        id: r.review.id,
        orderId: r.review.orderId,
        rating: r.review.rating,
        text: r.review.text,
        createdAt: r.review.createdAt.toISOString(),
        authorUsername: r.authorUsername,
        authorAvatar: r.authorAvatar,
        orderAmount: Number(r.orderAmount),
        lotTitle: r.lotTitle,
        gameName: r.gameName,
      })),
    });
  } catch (error) {
    console.error("User profile fetch error:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки профиля пользователя" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const viewer = await getCurrentUser(true);
    if (!viewer) {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    }
    const { username } = await context.params;
    if (viewer.username !== decodeURIComponent(username)) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }
    const body = await request.json();
    const bio = String(body.bio || "").trim().slice(0, 300);

    await db.update(users).set({ bio }).where(eq(users.id, viewer.id));
    return NextResponse.json({ ok: true, bio });
  } catch {
    return NextResponse.json(
      { error: "Не удалось обновить профиль" },
      { status: 500 }
    );
  }
}
