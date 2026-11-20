import { NextResponse } from "next/server";
import { db, users, walletTransactions } from "@/db";
import { eq, or } from "drizzle-orm";
import {
  hashPassword,
  signAccessToken,
  setAuthCookie,
  toSafeUser,
} from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = await request.json();
    const username = String(body.username || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password = String(body.password || "");

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Имя пользователя должно содержать от 3 до 24 символов (латиница, цифры, _)",
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Укажите корректный адрес электронной почты" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 6 символов" },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: users.id, username: users.username, email: users.email })
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)));

    if (existing.length > 0) {
      const conflict =
        existing[0].username.toLowerCase() === username.toLowerCase()
          ? "Пользователь с таким никнеймом уже зарегистрирован"
          : "Этот email уже используется другим аккаунтом";
      return NextResponse.json({ error: conflict }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const initials = username.slice(0, 2).toUpperCase();

    const [created] = await db
      .insert(users)
      .values({
        username,
        email,
        passwordHash,
        balance: "2500.00",
        avatar: initials,
        bio: "Участник биржи игровых ценностей PayLoot",
        rating: "5.00",
        reviewsCount: 0,
        isOnline: true,
      })
      .returning();

    await db.insert(walletTransactions).values({
      userId: created.id,
      type: "topup",
      amount: "2500.00",
      description: "Приветственный демо-баланс для тестирования безопасных сделок",
    });

    const token = await signAccessToken({
      sub: String(created.id),
      username: created.username,
      email: created.email,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      user: toSafeUser(created),
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Не удалось завершить регистрацию" },
      { status: 500 }
    );
  }
}
