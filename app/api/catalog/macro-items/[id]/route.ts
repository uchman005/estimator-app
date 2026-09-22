import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { macroItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireAssemblyRole } from "@/lib/auth/permissions";

async function requireRoleForMacroItem(userId: number | null, macroItemId: number, minRole: "editor") {
  const [row] = await db.select({ assemblyId: macroItems.assemblyId }).from(macroItems).where(eq(macroItems.id, macroItemId));
  if (!row) return { ok: false as const, status: 404 as const, error: "Macro-item not found." };
  return requireAssemblyRole(userId, row.assemblyId, minRole);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const macroItemId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireRoleForMacroItem(user?.id ?? null, macroItemId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if ("name" in body) patch.name = body.name;
  if ("sortOrder" in body) patch.sortOrder = body.sortOrder;
  if (body.labour) {
    patch.labourBasic = Number(body.labour.basic) || 0;
    patch.labourStandard = Number(body.labour.standard) || 0;
    patch.labourPremium = Number(body.labour.premium) || 0;
  }
  await db.update(macroItems).set(patch).where(eq(macroItems.id, macroItemId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const macroItemId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireRoleForMacroItem(user?.id ?? null, macroItemId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await db.delete(macroItems).where(eq(macroItems.id, macroItemId));
  return NextResponse.json({ ok: true });
}
