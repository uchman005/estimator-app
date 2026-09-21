import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["name", "sourceNote"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];
  if (body.labour) {
    patch.labourBasic = Number(body.labour.basic) || 0;
    patch.labourStandard = Number(body.labour.standard) || 0;
    patch.labourPremium = Number(body.labour.premium) || 0;
  }
  await db.update(subItems).set(patch).where(eq(subItems.id, Number(id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(subItems).where(eq(subItems.id, Number(id)));
  return NextResponse.json({ ok: true });
}
