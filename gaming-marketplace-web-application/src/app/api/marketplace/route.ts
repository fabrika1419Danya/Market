import { NextResponse } from "next/server";
import { db, games, lots, users } from "@/db";
import { and, desc, eq, gt } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeeded();
    const { searchParams } = new URL(request.url);
    const gameSlug = searchParams.get("game") || "";
    const category = searchParams.get("category") || "";
    const search = (searchParams.get("q") || "").trim().toLowerCase();
    const onlineOnly = searchParams.get("online") === "1";
    const autoOnly = searchParams.get("auto") === "1";
    const sort = searchParams.get("sort") || "default";

    const allGames = await db.select().from(games);

    const allActiveRows = await db
      .select({
        lot: lots,
        seller: {
          id: users.id,
          username: users.username,
          avatar: users.avatar,
          rating: users.rating,
          reviewsCount: users.reviewsCount,
          isOnline: users.isOnline,
          createdAt: users.createdAt,
        },
        game: {
          id: games.id,
          name: games.name,
          slug: games.slug,
          icon: games.icon,
        },
      })
      .from(lots)
      .innerJoin(users, eq(lots.sellerId, users.id))
      .innerJoin(games, eq(lots.gameId, games.id))
      .where(and(eq(lots.isActive, true), gt(lots.stockCount, 0)))
      .orderBy(desc(lots.createdAt));

    // Compute per-game and per-category counts
    const gameStats: Record<
      number,
      { total: number; byCategory: Record<string, number> }
    > = {};

    for (const g of allGames) {
      gameStats[g.id] = { total: 0, byCategory: {} };
      for (const c of g.categories) {
        gameStats[g.id].byCategory[c] = 0;
      }
    }

    for (const row of allActiveRows) {
      const st = gameStats[row.game.id];
      if (st) {
        st.total += 1;
        st.byCategory[row.lot.category] =
          (st.byCategory[row.lot.category] || 0) + 1;
      }
    }

    let filtered = allActiveRows;

    if (gameSlug) {
      filtered = filtered.filter((r) => r.game.slug === gameSlug);
    }
    if (category) {
      filtered = filtered.filter((r) => r.lot.category === category);
    }
    if (onlineOnly) {
      filtered = filtered.filter((r) => r.seller.isOnline);
    }
    if (autoOnly) {
      filtered = filtered.filter((r) =>
        Boolean(r.lot.autoDeliveryText && r.lot.autoDeliveryText.trim())
      );
    }
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.lot.title.toLowerCase().includes(search) ||
          r.lot.description.toLowerCase().includes(search) ||
          r.lot.serverName.toLowerCase().includes(search) ||
          r.game.name.toLowerCase().includes(search) ||
          r.seller.username.toLowerCase().includes(search)
      );
    }

    if (sort === "price_asc") {
      filtered.sort((a, b) => Number(a.lot.price) - Number(b.lot.price));
    } else if (sort === "price_desc") {
      filtered.sort((a, b) => Number(b.lot.price) - Number(a.lot.price));
    } else if (sort === "rating") {
      filtered.sort(
        (a, b) =>
          Number(b.seller.rating) - Number(a.seller.rating) ||
          b.seller.reviewsCount - a.seller.reviewsCount
      );
    }

    return NextResponse.json({
      games: allGames.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        icon: g.icon,
        categories: g.categories,
        totalLots: gameStats[g.id]?.total || 0,
        categoryCounts: gameStats[g.id]?.byCategory || {},
      })),
      lots: filtered.map(({ lot, seller, game }) => ({
        id: lot.id,
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
        game,
        seller: {
          id: seller.id,
          username: seller.username,
          avatar: seller.avatar,
          rating: Number(seller.rating),
          reviewsCount: seller.reviewsCount,
          isOnline: seller.isOnline,
          createdAt: seller.createdAt.toISOString(),
        },
      })),
    });
  } catch (error) {
    console.error("Marketplace GET error:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить каталог лотов" },
      { status: 500 }
    );
  }
}
