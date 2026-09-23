import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectOpexItems } from "@/db/schema";
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
    .insert(projectOpexItems)
    .values({
      projectId,
      label: body.label || "New recurring cost",
      category: body.category || "other",
      annualAmountUsd: Number(body.annualAmountUsd) || 0,
      isIncluded: body.isIncluded ?? true,
      notes: body.notes ?? null,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
