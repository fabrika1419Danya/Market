import { NextResponse } from "next/server";
import { db, lots, games, users, reviews } from "@/db";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSeeded();
    const { id } = await context.params;
    const lotId = Number(id);
    if (!Number.isInteger(lotId)) {
      return NextResponse.json({ error: "Некорректный ID лота" }, { status: 400 });
    }

    const [row] = await db
      .select({
        lot: lots,
        game: games,
        seller: users,
      })
      .from(lots)
      .innerJoin(games, eq(lots.gameId, games.id))
      .innerJoin(users, eq(lots.sellerId, users.id))
      .where(eq(lots.id, lotId));

    if (!row) {
      return NextResponse.json({ error: "Лот не найден" }, { status: 404 });
    }

    const sellerReviews = await db
      .select({
        review: reviews,
        authorUsername: users.username,
      })
      .from(reviews)
      .innerJoin(users, eq(reviews.authorId, users.id))
      .where(eq(reviews.targetUserId, row.seller.id))
      .orderBy(desc(reviews.createdAt))
      .limit(5);

    const viewer = await getCurrentUser(false);
    const isOwner = viewer?.id === row.seller.id;

    return NextResponse.json({
      lot: {
        id: row.lot.id,
        category: row.lot.category,
        serverName: row.lot.serverName,
        title: row.lot.title,
        description: row.lot.description,
        price: Number(row.lot.price),
        stockCount: row.lot.stockCount,
        isActive: row.lot.isActive,
        hasAutoDelivery: Boolean(
          row.lot.autoDeliveryText && row.lot.autoDeliveryText.trim()
        ),
        autoDeliveryText: isOwner ? row.lot.autoDeliveryText || "" : undefined,
        createdAt: row.lot.createdAt.toISOString(),
        game: {
          id: row.game.id,
          name: row.game.name,
          slug: row.game.slug,
          icon: row.game.icon,
        },
        seller: {
          id: row.seller.id,
          username: row.seller.username,
          avatar: row.seller.avatar,
          bio: row.seller.bio,
          rating: Number(row.seller.rating),
          reviewsCount: row.seller.reviewsCount,
          isOnline: row.seller.isOnline,
          createdAt: row.seller.createdAt.toISOString(),
        },
      },
      sellerReviews: sellerReviews.map((r) => ({
        id: r.review.id,
        rating: r.review.rating,
        text: r.review.text,
        authorUsername: r.authorUsername,
        createdAt: r.review.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Lot detail error:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить данные лота" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser(true);
    if (!user) {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    }
    const { id } = await context.params;
    const lotId = Number(id);

    const [existing] = await db.select().from(lots).where(eq(lots.id, lotId));
    if (!existing || existing.sellerId !== user.id) {
      return NextResponse.json({ error: "Лот не найден" }, { status: 404 });
    }

    const body = await request.json();
    const updates: Partial<typeof lots.$inferInsert> = {};

    if (typeof body.isActive === "boolean") {
      updates.isActive = body.isActive;
    }
    if (body.price !== undefined) {
      const p = Number(body.price);
      if (Number.isFinite(p) && p >= 10) {
        updates.price = p.toFixed(2);
      }
    }
    if (body.stockCount !== undefined) {
      const s = Math.max(0, Math.floor(Number(body.stockCount)));
      updates.stockCount = s;
    }
    if (typeof body.title === "string" && body.title.trim().length >= 6) {
      updates.title = body.title.trim().slice(0, 220);
    }
    if (
      typeof body.description === "string" &&
      body.description.trim().length >= 10
    ) {
      updates.description = body.description.trim();
    }
    if (body.autoDeliveryText !== undefined) {
      updates.autoDeliveryText =
        String(body.autoDeliveryText || "").trim() || null;
    }

    const [updated] = await db
      .update(lots)
      .set(updates)
      .where(eq(lots.id, lotId))
      .returning();

    return NextResponse.json({ ok: true, lot: updated });
  } catch (error) {
    console.error("Lot PATCH error:", error);
    return NextResponse.json(
      { error: "Ошибка обновления лота" },
      { status: 500 }
    );
  }
}
