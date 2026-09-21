import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireProjectRole } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const user = await getCurrentUserFromRequest(req);
  const access = await requireProjectRole(user?.id ?? null, Number(id), "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const allowed = [
    "assemblyId", "classNodeId", "customLabel", "customUnit", "customUnifCode",
    "quantity", "tier", "variantId", "rateOverrideUsd", "isAddon", "isIncluded", "notes",
  ];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  await db.update(projectItems).set(patch).where(eq(projectItems.id, Number(itemId)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  const user = await getCurrentUserFromRequest(req);
  const access = await requireProjectRole(user?.id ?? null, Number(id), "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await db.delete(projectItems).where(eq(projectItems.id, Number(itemId)));
  return NextResponse.json({ ok: true });
}
