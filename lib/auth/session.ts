import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const SESSION_COOKIE = "session_token";
const SESSION_DAYS = 30;

export interface CurrentUser {
  id: number;
  email: string;
  name: string | null;
}

export async function createSession(userId: number): Promise<{ token: string; expiresAt: string }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.insert(sessions).values({ token, userId, expiresAt });
  return { token, expiresAt };
}

export async function destroySessionToken(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

async function getUserFromToken(token: string | undefined): Promise<CurrentUser | null> {
  if (!token) return null;
  const [row] = await db
    .select({ id: users.id, email: users.email, name: users.name, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token));
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await destroySessionToken(token);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name };
}

/** For use in Server Components and Route Handlers alike (reads the cookie jar). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  return getUserFromToken(jar.get(SESSION_COOKIE)?.value);
}

/** For use in Route Handlers, which see the raw Request and its cookie header. */
export async function getCurrentUserFromRequest(req: Request): Promise<CurrentUser | null> {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return getUserFromToken(match?.[1]);
}
