import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { microItems, microItemRates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireMicroItemRole } from "@/lib/auth/permissions";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const microItemId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireMicroItemRole(user?.id ?? null, microItemId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();

  const fieldPatch: Record<string, unknown> = {};
  if ("name" in body) fieldPatch.name = body.name;
  if ("unit" in body) fieldPatch.unit = body.unit;
  if (Object.keys(fieldPatch).length) {
    await db.update(microItems).set(fieldPatch).where(eq(microItems.id, microItemId));
  }

  if (body.rates) {
    // This is THE mutation the whole composite model exists for — changing
    // one of these three numbers is the only way an assembly's rate moves.
    await db.delete(microItemRates).where(eq(microItemRates.microItemId, microItemId));
    await db.insert(microItemRates).values([
      { microItemId, tier: "basic", unitRateUsd: Number(body.rates.basic) || 0 },
      { microItemId, tier: "standard", unitRateUsd: Number(body.rates.standard) || 0 },
      { microItemId, tier: "premium", unitRateUsd: Number(body.rates.premium) || 0 },
    ]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const microItemId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireMicroItemRole(user?.id ?? null, microItemId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await db.delete(microItems).where(eq(microItems.id, microItemId));
  return NextResponse.json({ ok: true });
}
