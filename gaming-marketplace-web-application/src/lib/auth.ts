import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "fp_auth_token";
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "payloot-secure-escrow-jwt-secret-key-2026-v1"
);

export interface JwtPayloadData {
  sub: string;
  username: string;
  email: string;
}

export interface SafeUser {
  id: number;
  username: string;
  email: string;
  balance: number;
  avatar: string;
  bio: string;
  rating: number;
  reviewsCount: number;
  isOnline: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export function toSafeUser(row: typeof users.$inferSelect): SafeUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    balance: Number(row.balance),
    avatar: row.avatar,
    bio: row.bio,
    rating: Number(row.rating),
    reviewsCount: row.reviewsCount,
    isOnline: row.isOnline,
    lastSeenAt: row.lastSeenAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signAccessToken(payload: JwtPayloadData): Promise<string> {
  return new SignJWT({
    username: payload.username,
    email: payload.email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

export async function verifyAccessToken(
  token: string
): Promise<JwtPayloadData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (!payload.sub || typeof payload.username !== "string") {
      return null;
    }
    return {
      sub: payload.sub,
      username: payload.username,
      email: typeof payload.email === "string" ? payload.email : "",
    };
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(
  touchOnline = false
): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const decoded = await verifyAccessToken(token);
    if (!decoded) return null;

    const userId = Number(decoded.sub);
    if (!Number.isInteger(userId) || userId <= 0) return null;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return null;

    if (touchOnline) {
      await db
        .update(users)
        .set({ isOnline: true, lastSeenAt: new Date() })
        .where(eq(users.id, user.id));
      user.isOnline = true;
    }

    return toSafeUser(user);
  } catch {
    return null;
  }
}
