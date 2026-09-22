import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assemblyTierRates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireAssemblyRole } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assemblyId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireAssemblyRole(user?.id ?? null, assemblyId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  await db.delete(assemblyTierRates).where(eq(assemblyTierRates.assemblyId, assemblyId));
  await db.insert(assemblyTierRates).values([
    { assemblyId, tier: "basic", unitRateUsd: Number(body.basic) || 0 },
    { assemblyId, tier: "standard", unitRateUsd: Number(body.standard) || 0 },
    { assemblyId, tier: "premium", unitRateUsd: Number(body.premium) || 0 },
  ]);
  return NextResponse.json({ ok: true });
}
