import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { macroItemSubItems, macroItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireAssemblyRole } from "@/lib/auth/permissions";

async function requireRoleForJoin(userId: number | null, joinId: number, minRole: "editor") {
  const [row] = await db
    .select({ assemblyId: macroItems.assemblyId })
    .from(macroItemSubItems)
    .innerJoin(macroItems, eq(macroItemSubItems.macroItemId, macroItems.id))
    .where(eq(macroItemSubItems.id, joinId));
  if (!row) return { ok: false as const, status: 404 as const, error: "Not found." };
  return requireAssemblyRole(userId, row.assemblyId, minRole);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const joinId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireRoleForJoin(user?.id ?? null, joinId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  if (!("quantity" in body)) return NextResponse.json({ error: "quantity is required." }, { status: 400 });
  await db.update(macroItemSubItems).set({ quantity: Number(body.quantity) || 0 }).where(eq(macroItemSubItems.id, joinId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const joinId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireRoleForJoin(user?.id ?? null, joinId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await db.delete(macroItemSubItems).where(eq(macroItemSubItems.id, joinId));
  return NextResponse.json({ ok: true });
}
