import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { macroItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if ("name" in body) patch.name = body.name;
  if ("sortOrder" in body) patch.sortOrder = body.sortOrder;
  if (body.labour) {
    patch.labourBasic = Number(body.labour.basic) || 0;
    patch.labourStandard = Number(body.labour.standard) || 0;
    patch.labourPremium = Number(body.labour.premium) || 0;
  }
  await db.update(macroItems).set(patch).where(eq(macroItems.id, Number(id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(macroItems).where(eq(macroItems.id, Number(id)));
  return NextResponse.json({ ok: true });
}
