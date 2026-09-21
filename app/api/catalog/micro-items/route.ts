import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { microItems, microItemRates } from "@/db/schema";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const [row] = await db
    .insert(microItems)
    .values({ name: body.name || "New micro-item", unit: body.unit || "unit", sourceNote: body.sourceNote ?? null })
    .returning();

  const rates = body.rates || {};
  await db.insert(microItemRates).values([
    { microItemId: row.id, tier: "basic", unitRateUsd: Number(rates.basic) || 0 },
    { microItemId: row.id, tier: "standard", unitRateUsd: Number(rates.standard) || 0 },
    { microItemId: row.id, tier: "premium", unitRateUsd: Number(rates.premium) || 0 },
  ]);

  return NextResponse.json(row, { status: 201 });
}
