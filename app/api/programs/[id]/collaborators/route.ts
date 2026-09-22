import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { programCollaborators, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireProgramRole } from "@/lib/auth/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const programId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireProgramRole(user?.id ?? null, programId, "viewer");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const rows = await db
    .select({
      id: programCollaborators.id,
      invitedEmail: programCollaborators.invitedEmail,
      role: programCollaborators.role,
      status: programCollaborators.status,
      userName: users.name,
    })
    .from(programCollaborators)
    .leftJoin(users, eq(programCollaborators.userId, users.id))
    .where(eq(programCollaborators.programId, programId));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const programId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  // Only the owner manages who has access — an editor cannot grant others access.
  const access = await requireProgramRole(user?.id ?? null, programId, "owner");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const role = body.role === "editor" ? "editor" : "viewer";
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });

  const [existing] = await db
    .select({ id: programCollaborators.id })
    .from(programCollaborators)
    .where(and(eq(programCollaborators.programId, programId), eq(programCollaborators.invitedEmail, email)));
  if (existing) return NextResponse.json({ error: "That email is already invited to this program." }, { status: 409 });

  const [matchedUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

  const [row] = await db
    .insert(programCollaborators)
    .values({
      programId,
      invitedEmail: email,
      role,
      userId: matchedUser?.id ?? null,
      status: matchedUser ? "accepted" : "pending",
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
