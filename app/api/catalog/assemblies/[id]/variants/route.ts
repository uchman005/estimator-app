import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assemblyVariants } from "@/db/schema";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireAssemblyRole } from "@/lib/auth/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assemblyId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireAssemblyRole(user?.id ?? null, assemblyId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const [row] = await db
    .insert(assemblyVariants)
    .values({
      assemblyId,
      label: body.label || "New option",
      unitRateUsd: Number(body.unitRateUsd) || 0,
      laborPct: Number(body.laborPct) || 0,
      materialPct: Number(body.materialPct) || 0,
      sourceNote: body.sourceNote ?? null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
