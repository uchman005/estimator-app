import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProjectFull } from "@/lib/data";
import { computeCost, computeSchedule, type ProjectSettings } from "@/lib/calc/engine";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireFacilityRole } from "@/lib/auth/permissions";

function toSettings(full: NonNullable<Awaited<ReturnType<typeof getProjectFull>>>): ProjectSettings {
  const { project, program, country, region } = full;
  const costIndex = (country?.baseCostIndex ?? 1) * (1 + (region?.offsetPct ?? 0) / 100);
  return {
    aaceClass: project.aaceClass,
    deliveryStrategy: project.deliveryStrategy as "phased" | "parallel",
    designFeePct: project.designFeePct,
    pmFeePct: project.pmFeePct,
    permitFeePct: project.permitFeePct,
    escalationPct: program.escalationPct, // shared assumption, set on the parent program
    contingencyPctOverride: project.contingencyPctOverride,
    fastTrackPremiumPct: project.fastTrackPremiumPct,
    landMonths: project.landMonths,
    designMonths: project.designMonths,
    designPermitOverlapPct: project.designPermitOverlapPct,
    commissionMonths: project.commissionMonths,
    costIndex,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireFacilityRole(user?.id ?? null, projectId, "viewer");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const full = await getProjectFull(projectId);
  if (!full) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!full.aace) return NextResponse.json({ error: "AACE class not seeded" }, { status: 500 });

  const settings = toSettings(full);
  const cost = computeCost(full.items, settings, full.aace);
  const schedule = computeSchedule(full.items, settings);

  return NextResponse.json({
    project: full.project,
    program: full.program,
    items: full.items,
    country: full.country,
    region: full.region,
    currency: full.currency,
    fx: full.fx,
    fxFetchedAt: full.fxFetchedAt,
    fxSource: full.fxSource,
    aace: full.aace,
    costIndex: settings.costIndex,
    cost,
    schedule,
    role: access.role,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireFacilityRole(user?.id ?? null, projectId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const allowed = [
    "name", "author", "phase", "aaceClass", "deliveryStrategy",
    "designFeePct", "pmFeePct", "permitFeePct",
    "contingencyPctOverride", "fastTrackPremiumPct", "landMonths", "designMonths",
    "designPermitOverlapPct", "commissionMonths", "startDate",
  ];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];
  patch.updatedAt = new Date().toISOString();

  await db.update(projects).set(patch).where(eq(projects.id, projectId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireFacilityRole(user?.id ?? null, projectId, "owner");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await db.delete(projects).where(eq(projects.id, projectId));
  return NextResponse.json({ ok: true });
}
