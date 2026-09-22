import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireSubItemRole } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subItemId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireSubItemRole(user?.id ?? null, subItemId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const allowed = ["name", "sourceNote"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];
  if (body.labour) {
    patch.labourBasic = Number(body.labour.basic) || 0;
    patch.labourStandard = Number(body.labour.standard) || 0;
    patch.labourPremium = Number(body.labour.premium) || 0;
  }
  await db.update(subItems).set(patch).where(eq(subItems.id, subItemId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subItemId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireSubItemRole(user?.id ?? null, subItemId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await db.delete(subItems).where(eq(subItems.id, subItemId));
  return NextResponse.json({ ok: true });
}
