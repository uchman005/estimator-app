import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { macroItems } from "@/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [row] = await db
    .insert(macroItems)
    .values({ assemblyId: Number(id), name: body.name || "New macro-item", sortOrder: body.sortOrder ?? 0 })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
