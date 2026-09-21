import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assemblyVariants } from "@/db/schema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const [row] = await db
    .insert(assemblyVariants)
    .values({
      assemblyId: Number(id),
      label: body.label || "New option",
      unitRateUsd: Number(body.unitRateUsd) || 0,
      laborPct: Number(body.laborPct) || 0,
      materialPct: Number(body.materialPct) || 0,
      sourceNote: body.sourceNote ?? null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
