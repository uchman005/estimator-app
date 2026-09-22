import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assemblyVariants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireAssemblyRole } from "@/lib/auth/permissions";

async function requireRoleForVariant(userId: number | null, variantId: number, minRole: "editor") {
  const [row] = await db.select({ assemblyId: assemblyVariants.assemblyId }).from(assemblyVariants).where(eq(assemblyVariants.id, variantId));
  if (!row) return { ok: false as const, status: 404 as const, error: "Not found." };
  return requireAssemblyRole(userId, row.assemblyId, minRole);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const variantId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireRoleForVariant(user?.id ?? null, variantId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const allowed = ["label", "unitRateUsd", "laborPct", "materialPct"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];
  await db.update(assemblyVariants).set(patch).where(eq(assemblyVariants.id, variantId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const variantId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireRoleForVariant(user?.id ?? null, variantId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await db.delete(assemblyVariants).where(eq(assemblyVariants.id, variantId));
  return NextResponse.json({ ok: true });
}
