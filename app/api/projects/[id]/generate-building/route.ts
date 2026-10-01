import { NextRequest, NextResponse } from "next/server";
import { getBuildingTemplates, insertBuildingFromTemplate } from "@/lib/data";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireFacilityRole } from "@/lib/auth/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireFacilityRole(user?.id ?? null, projectId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const templateSlug = String(body.templateSlug || "");
  const grossAreaM2 = Math.max(1, Number(body.grossAreaM2) || 0);
  const markupPct = body.markupPct != null ? Math.max(0, Number(body.markupPct) || 0) : 10;

  const templates = await getBuildingTemplates();
  const template = templates.find((t) => t.slug === templateSlug);
  if (!template) return NextResponse.json({ error: `Unknown building template "${templateSlug}".` }, { status: 400 });

  const divisionCount = await insertBuildingFromTemplate(projectId, template, grossAreaM2, markupPct);

  return NextResponse.json({ ok: true, template: { name: template.name, defaultFloors: template.defaultFloors }, grossAreaM2, markupPct, divisionCount });
}
