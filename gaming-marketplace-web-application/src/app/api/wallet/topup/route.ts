import { NextResponse } from "next/server";
import { db, users, walletTransactions } from "@/db";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser, toSafeUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(true);
    if (!user) {
      return NextResponse.json({ error: "Требуется авторизация" }, { status: 401 });
    }

    const body = await request.json();
    const amount = Number(body.amount);
    const method = String(body.method || "СБП");

    if (!Number.isFinite(amount) || amount < 50 || amount > 250000) {
      return NextResponse.json(
        { error: "Сумма пополнения должна быть от 50 ₽ до 250 000 ₽" },
        { status: 400 }
      );
    }

    const fixedAmount = amount.toFixed(2);

    const updatedUser = await db.transaction(async (tx) => {
      const [u] = await tx
        .update(users)
        .set({
          balance: sql`${users.balance} + ${fixedAmount}::numeric`,
        })
        .where(eq(users.id, user.id))
        .returning();

      await tx.insert(walletTransactions).values({
        userId: user.id,
        type: "topup",
        amount: fixedAmount,
        description: `Пополнение внутреннего баланса (${method})`,
      });

      return u;
    });

    return NextResponse.json({
      user: toSafeUser(updatedUser),
    });
  } catch (error) {
    console.error("Wallet topup error:", error);
    return NextResponse.json(
      { error: "Ошибка пополнения баланса" },
      { status: 500 }
    );
  }
}
