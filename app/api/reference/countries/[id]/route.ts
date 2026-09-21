import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { countries } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["name", "baseCostIndex", "notes"];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];
  await db.update(countries).set(patch).where(eq(countries.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(countries).where(eq(countries.id, id));
  return NextResponse.json({ ok: true });
}
