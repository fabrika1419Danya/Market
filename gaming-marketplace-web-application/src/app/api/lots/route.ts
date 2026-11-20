import { NextResponse } from "next/server";
import { db, lots, games } from "@/db";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await getCurrentUser(true);
  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
  }

  const rows = await db
    .select({ lot: lots, game: games })
    .from(lots)
    .innerJoin(games, eq(lots.gameId, games.id))
    .where(eq(lots.sellerId, user.id))
    .orderBy(desc(lots.createdAt));

  return NextResponse.json({
    lots: rows.map(({ lot, game }) => ({
      id: lot.id,
      gameId: lot.gameId,
      gameName: game.name,
      gameSlug: game.slug,
      gameIcon: game.icon,
      category: lot.category,
      serverName: lot.serverName,
      title: lot.title,
      description: lot.description,
      price: Number(lot.price),
      stockCount: lot.stockCount,
      isActive: lot.isActive,
      autoDeliveryText: lot.autoDeliveryText || "",
      createdAt: lot.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const user = await getCurrentUser(true);
    if (!user) {
      return NextResponse.json(
        { error: "Войдите в аккаунт, чтобы выставить лот на продажу" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const gameId = Number(body.gameId);
    const category = String(body.category || "").trim();
    const serverName = String(body.serverName || "Все серверы").trim().slice(0, 100);
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const price = Number(body.price);
    const stockCount = Math.max(1, Math.floor(Number(body.stockCount) || 1));
    const autoDeliveryText = String(body.autoDeliveryText || "").trim() || null;

    const validCategories = ["Аккаунты", "Валюта", "Услуги", "Предметы"];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: "Выберите корректную категорию лота" },
        { status: 400 }
      );
    }

    if (title.length < 6 || title.length > 220) {
      return NextResponse.json(
        { error: "Краткое описание (заголовок) должно быть от 6 до 220 символов" },
        { status: 400 }
      );
    }

    if (description.length < 10) {
      return NextResponse.json(
        { error: "Подробное описание должно содержать минимум 10 символов" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price < 10 || price > 500000) {
      return NextResponse.json(
        { error: "Цена должна быть от 10 ₽ до 500 000 ₽" },
        { status: 400 }
      );
    }

    const [game] = await db.select().from(games).where(eq(games.id, gameId));
    if (!game) {
      return NextResponse.json({ error: "Игра не найдена" }, { status: 404 });
    }

    const [created] = await db
      .insert(lots)
      .values({
        sellerId: user.id,
        gameId: game.id,
        category,
        serverName: serverName || "Все серверы",
        title,
        description,
        price: price.toFixed(2),
        stockCount,
        isActive: true,
        autoDeliveryText,
      })
      .returning();

    return NextResponse.json({
      lot: {
        id: created.id,
        gameId: created.gameId,
        category: created.category,
        serverName: created.serverName,
        title: created.title,
        description: created.description,
        price: Number(created.price),
        stockCount: created.stockCount,
        isActive: created.isActive,
        hasAutoDelivery: Boolean(created.autoDeliveryText),
      },
    });
  } catch (error) {
    console.error("Create lot error:", error);
    return NextResponse.json(
      { error: "Не удалось создать лот" },
      { status: 500 }
    );
  }
}
