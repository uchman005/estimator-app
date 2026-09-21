import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subItemMicroItems } from "@/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (!body.microItemId) return NextResponse.json({ error: "microItemId is required." }, { status: 400 });
  const [row] = await db
    .insert(subItemMicroItems)
    .values({ subItemId: Number(id), microItemId: Number(body.microItemId), quantity: body.quantity != null ? Number(body.quantity) : 1 })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
