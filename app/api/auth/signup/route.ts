import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, projectCollaborators } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = body.name ? String(body.name) : null;

  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });

  const [user] = await db.insert(users).values({ email, passwordHash: hashPassword(password), name }).returning();

  // Link any invites sent to this email before the account existed.
  await db
    .update(projectCollaborators)
    .set({ userId: user.id, status: "accepted" })
    .where(and(eq(projectCollaborators.invitedEmail, email), eq(projectCollaborators.status, "pending")));

  const { token, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({ id: user.id, email: user.email, name: user.name }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", expires: new Date(expiresAt) });
  return res;
}
