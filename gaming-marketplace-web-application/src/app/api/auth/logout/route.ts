import { NextResponse } from "next/server";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { clearAuthCookie, getCurrentUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await getCurrentUser(false);
    if (user) {
      await db
        .update(users)
        .set({ isOnline: false, lastSeenAt: new Date() })
        .where(eq(users.id, user.id));
    }
    await clearAuthCookie();
    return NextResponse.json({ ok: true });
  } catch {
    await clearAuthCookie();
    return NextResponse.json({ ok: true });
  }
}
