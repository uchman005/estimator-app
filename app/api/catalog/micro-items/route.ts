import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { microItems, microItemRates } from "@/db/schema";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireProgramRole } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const programId = Number(body.programId);
  if (!programId) return NextResponse.json({ error: "programId is required." }, { status: 400 });

  const access = await requireProgramRole(user?.id ?? null, programId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [row] = await db
    .insert(microItems)
    .values({ programId, name: body.name || "New micro-item", unit: body.unit || "unit", sourceNote: body.sourceNote ?? null })
    .returning();

  const rates = body.rates || {};
  await db.insert(microItemRates).values([
    { microItemId: row.id, tier: "basic", unitRateUsd: Number(rates.basic) || 0 },
    { microItemId: row.id, tier: "standard", unitRateUsd: Number(rates.standard) || 0 },
    { microItemId: row.id, tier: "premium", unitRateUsd: Number(rates.premium) || 0 },
  ]);

  return NextResponse.json(row, { status: 201 });
}
