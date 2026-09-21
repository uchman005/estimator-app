import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subItemMicroItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (!("quantity" in body)) return NextResponse.json({ error: "quantity is required." }, { status: 400 });
  await db.update(subItemMicroItems).set({ quantity: Number(body.quantity) || 0 }).where(eq(subItemMicroItems.id, Number(id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(subItemMicroItems).where(eq(subItemMicroItems.id, Number(id)));
  return NextResponse.json({ ok: true });
}
