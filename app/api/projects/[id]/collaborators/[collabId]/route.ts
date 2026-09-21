import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectCollaborators } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireProjectRole } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; collabId: string }> }) {
  const { id, collabId } = await params;
  const projectId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireProjectRole(user?.id ?? null, projectId, "owner");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const role = body.role === "editor" ? "editor" : "viewer";
  await db.update(projectCollaborators).set({ role }).where(eq(projectCollaborators.id, Number(collabId)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; collabId: string }> }) {
  const { id, collabId } = await params;
  const projectId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireProjectRole(user?.id ?? null, projectId, "owner");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await db.delete(projectCollaborators).where(eq(projectCollaborators.id, Number(collabId)));
  return NextResponse.json({ ok: true });
}
