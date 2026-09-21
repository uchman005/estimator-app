import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { macroItemSubItems } from "@/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  if (!body.subItemId) return NextResponse.json({ error: "subItemId is required." }, { status: 400 });
  const [row] = await db
    .insert(macroItemSubItems)
    .values({ macroItemId: Number(id), subItemId: Number(body.subItemId), quantity: body.quantity != null ? Number(body.quantity) : 1 })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
