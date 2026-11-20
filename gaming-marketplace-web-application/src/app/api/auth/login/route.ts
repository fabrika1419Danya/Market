import { NextResponse } from "next/server";
import { db, users } from "@/db";
import { eq, or } from "drizzle-orm";
import {
  verifyPassword,
  signAccessToken,
  setAuthCookie,
  toSafeUser,
} from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export async function POST(request: Request) {
  try {
    await ensureSeeded();
    const body = await request.json();
    const login = String(body.login || body.email || body.username || "").trim();
    const password = String(body.password || "");

    if (!login || !password) {
      return NextResponse.json(
        { error: "Введите логин (или email) и пароль" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(
        or(eq(users.username, login), eq(users.email, login.toLowerCase()))
      );

    if (!user) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 }
      );
    }

    const [updated] = await db
      .update(users)
      .set({ isOnline: true, lastSeenAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();

    const token = await signAccessToken({
      sub: String(updated.id),
      username: updated.username,
      email: updated.email,
    });
    await setAuthCookie(token);

    return NextResponse.json({
      user: toSafeUser(updated),
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Ошибка входа в систему" },
      { status: 500 }
    );
  }
}
