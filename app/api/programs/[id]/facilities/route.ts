import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireProgramRole } from "@/lib/auth/permissions";
import { DEFAULT_FACILITY_TYPE } from "@/lib/facilityTypes";
import { getBuildingTemplates, insertBuildingFromTemplate } from "@/lib/data";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const programId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireProgramRole(user?.id ?? null, programId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const facilityType = typeof body.facilityType === "string" && body.facilityType.trim() ? body.facilityType.trim() : DEFAULT_FACILITY_TYPE;

  const templates = typeof body.templateSlug === "string" && body.templateSlug ? await getBuildingTemplates() : [];
  const template = templates.find((t) => t.slug === body.templateSlug);

  const [row] = await db
    .insert(projects)
    .values({
      programId,
      facilityType,
      name: body.name || "Untitled facility",
      aaceClass: body.aaceClass ?? 3,
      // A building gets the general-contractor cost buildup's 20% default
      // (see GeneralContractorPanel.tsx) instead of staying null (which
      // would fall back to whatever the "flat facility" AACE class — also
      // 3, 15% — implies, the wrong default for a building).
      contingencyPctOverride: template ? 20 : null,
    })
    .returning();

  // If the facility is a building (the caller picked a building template,
  // not a flat/free-text type), generate its BOQ right away instead of
  // leaving a facility nobody can price until they visit its own page.
  if (template) {
    const grossAreaM2 = Math.max(1, Number(body.grossAreaM2) || 0);
    const markupPct = body.markupPct != null ? Math.max(0, Number(body.markupPct) || 0) : 10;
    await insertBuildingFromTemplate(row.id, template, grossAreaM2, markupPct);
  }

  return NextResponse.json(row, { status: 201 });
}
