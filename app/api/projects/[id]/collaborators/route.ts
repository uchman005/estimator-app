import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectCollaborators, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireProjectRole } from "@/lib/auth/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireProjectRole(user?.id ?? null, projectId, "viewer");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const rows = await db
    .select({
      id: projectCollaborators.id,
      invitedEmail: projectCollaborators.invitedEmail,
      role: projectCollaborators.role,
      status: projectCollaborators.status,
      userName: users.name,
    })
    .from(projectCollaborators)
    .leftJoin(users, eq(projectCollaborators.userId, users.id))
    .where(eq(projectCollaborators.projectId, projectId));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  // Only the owner manages who has access — an editor cannot grant others access.
  const access = await requireProjectRole(user?.id ?? null, projectId, "owner");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const role = body.role === "editor" ? "editor" : "viewer";
  if (!email || !email.includes("@")) return NextResponse.json({ error: "A valid email is required." }, { status: 400 });

  const [existing] = await db
    .select({ id: projectCollaborators.id })
    .from(projectCollaborators)
    .where(and(eq(projectCollaborators.projectId, projectId), eq(projectCollaborators.invitedEmail, email)));
  if (existing) return NextResponse.json({ error: "That email is already invited to this project." }, { status: 409 });

  const [matchedUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));

  const [row] = await db
    .insert(projectCollaborators)
    .values({
      projectId,
      invitedEmail: email,
      role,
      userId: matchedUser?.id ?? null,
      status: matchedUser ? "accepted" : "pending",
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
