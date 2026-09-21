import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { regions } from "@/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const [row] = await db
    .insert(regions)
    .values({ countryId: body.countryId, name: body.name || "New region", offsetPct: body.offsetPct ?? 0 })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
