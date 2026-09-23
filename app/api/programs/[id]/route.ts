import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { programs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProgramFull } from "@/lib/data";
import {
  computeCost,
  computeSchedule,
  computeProgramCapex,
  computeFacilityOpex,
  computeProgramOpex,
  computeFeasibility,
  type ProjectSettings,
} from "@/lib/calc/engine";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireProgramRole } from "@/lib/auth/permissions";

function toFacilitySettings(
  program: NonNullable<Awaited<ReturnType<typeof getProgramFull>>>["program"],
  project: NonNullable<Awaited<ReturnType<typeof getProgramFull>>>["facilities"][number]["project"],
  costIndex: number
): ProjectSettings {
  return {
    aaceClass: project.aaceClass,
    deliveryStrategy: project.deliveryStrategy as "phased" | "parallel",
    designFeePct: project.designFeePct,
    pmFeePct: project.pmFeePct,
    permitFeePct: project.permitFeePct,
    escalationPct: program.escalationPct, // shared assumption across every facility on the site
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
  const programId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireProgramRole(user?.id ?? null, programId, "viewer");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const full = await getProgramFull(programId);
  if (!full) return NextResponse.json({ error: "not found" }, { status: 404 });

  const costIndex = (full.country?.baseCostIndex ?? 1) * (1 + (full.region?.offsetPct ?? 0) / 100);

  // Every facility is returned (so the UI can list and toggle all of them),
  // each with its own opex figure already resolved (itemized or the %
  // fallback) — but the program-level aggregates below only sum the ones
  // still toggled on, same "present but off" idea as a BOQ addon.
  const facilities = full.facilities.map((f) => {
    if (!f.aace) return null; // AACE class not seeded — shouldn't happen, skip defensively rather than 500 the whole program
    const settings = toFacilitySettings(full.program, f.project, costIndex);
    const cost = computeCost(f.items, settings, f.aace);
    const schedule = computeSchedule(f.items, settings);
    const opex = computeFacilityOpex(f.opexItems, full.program.opexPctOfCapexPerYear, cost.grandTotal);
    return { project: f.project, items: f.items, opexItems: f.opexItems, cost, schedule, opex };
  }).filter((f): f is NonNullable<typeof f> => f !== null);

  const included = facilities.filter((f) => f.project.isIncluded);

  const capex = computeProgramCapex(included.map((f) => ({ grandTotal: f.cost.grandTotal })), full.program.landCostUsd);
  const autoOpex = computeProgramOpex(
    included.map((f) => ({ grandTotal: f.cost.grandTotal, opexItems: f.opexItems })),
    full.program.opexPctOfCapexPerYear
  );
  const feasibility = computeFeasibility(capex, autoOpex, full.program);
  // Confidence band: each INCLUDED facility's own band (from its own AACE class) summed with the others, plus the fixed land cost.
  const bandLow = included.reduce((s, f) => s + f.cost.bandLow, 0) + full.program.landCostUsd;
  const bandHigh = included.reduce((s, f) => s + f.cost.bandHigh, 0) + full.program.landCostUsd;
  // Site programme duration: facilities can be built in parallel across the
  // site, so the critical path is whichever INCLUDED facility takes longest.
  const totalMonths = included.reduce((max, f) => Math.max(max, f.schedule.totalMonths), 0);

  return NextResponse.json({
    program: full.program,
    country: full.country,
    region: full.region,
    currency: full.currency,
    fx: full.fx,
    fxFetchedAt: full.fxFetchedAt,
    fxSource: full.fxSource,
    costIndex,
    facilities,
    capex,
    bandLow,
    bandHigh,
    totalMonths,
    opex: autoOpex,
    feasibility,
    role: access.role,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const programId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireProgramRole(user?.id ?? null, programId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const allowed = [
    "name", "author", "countryId", "regionId", "landCostUsd", "escalationPct",
    "fundedUsd", "opexOverrideUsd", "opexPctOfCapexPerYear", "annualRevenueUsd",
  ];
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];
  patch.updatedAt = new Date().toISOString();

  await db.update(programs).set(patch).where(eq(programs.id, programId));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const programId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireProgramRole(user?.id ?? null, programId, "owner");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await db.delete(programs).where(eq(programs.id, programId));
  return NextResponse.json({ ok: true });
}
