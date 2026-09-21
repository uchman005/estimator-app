import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subItems } from "@/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const [row] = await db
    .insert(subItems)
    .values({ name: body.name || "New sub-item", sourceNote: body.sourceNote ?? null })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
