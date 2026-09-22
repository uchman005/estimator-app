import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectItems } from "@/db/schema";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireFacilityRole } from "@/lib/auth/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireFacilityRole(user?.id ?? null, projectId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const [row] = await db
    .insert(projectItems)
    .values({
      projectId,
      assemblyId: body.assemblyId ?? null,
      classNodeId: body.classNodeId ?? null,
      customLabel: body.customLabel ?? null,
      customUnit: body.customUnit ?? null,
      customUnifCode: body.customUnifCode ?? "Z",
      quantity: body.quantity ?? 1,
      tier: body.tier ?? "standard",
      variantId: body.variantId ?? null,
      isAddon: body.isAddon ?? false,
      isIncluded: body.isIncluded ?? true,
      genTag: body.genTag ?? null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
