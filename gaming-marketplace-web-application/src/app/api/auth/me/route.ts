import { NextResponse } from "next/server";
import { db, orders, walletTransactions } from "@/db";
import { desc, eq, or, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeeded();
  const user = await getCurrentUser(true);
  if (!user) {
    return NextResponse.json({ user: null, activeDealsCount: 0, transactions: [] });
  }

  const activeOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        or(eq(orders.buyerId, user.id), eq(orders.sellerId, user.id)),
        or(eq(orders.status, "paid"), eq(orders.status, "disputed"))
      )
    );

  const txRows = await db
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.userId, user.id))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(20);

  return NextResponse.json({
    user,
    activeDealsCount: activeOrders.length,
    transactions: txRows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      orderId: t.orderId,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}
