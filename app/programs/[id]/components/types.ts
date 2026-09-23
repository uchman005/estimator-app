import type { AaceClass, AssemblyLite, CostBreakdown, ScheduleBreakdown, Tier } from "@/lib/calc/engine";
import { PHASE_LABEL, PHASE_ORDER, type Phase } from "@/lib/phases";

export interface RegionRow {
  id: number;
  countryId: string;
  name: string;
  offsetPct: number;
}

export interface CountryRow {
  id: string;
  name: string;
  currencyCode: string;
  baseCostIndex: number;
  regions: RegionRow[];
  fx: number;
  fxFetchedAt: string | null;
  fxSource: string | null;
}

export interface ReferenceData {
  countries: CountryRow[];
  currencies: { code: string; symbol: string }[];
  aaceClasses: AaceClass[];
  assemblies: AssemblyLite[];
}

// A Program — the elevated level: a site/campus/portfolio that owns
// location, funding, feasibility and sharing for every facility inside it.
export interface ProgramRow {
  id: number;
  name: string;
  author: string | null;
  countryId: string;
  regionId: number | null;
  landCostUsd: number;
  escalationPct: number;
  fundedUsd: number;
  opexOverrideUsd: number;
  opexPctOfCapexPerYear: number;
  annualRevenueUsd: number;
}

// One facility inside the program, with its own computed subtotal/schedule/
// opex — what GET /api/programs/:id returns per facility. Every facility is
// included in this list regardless of isIncluded — toggling it off excludes
// it from the program's aggregate totals without hiding it from view.
export interface FacilityRow {
  project: {
    id: number;
    programId: number;
    phase: Phase;
    name: string;
    author: string | null;
    isIncluded: boolean;
    aaceClass: number;
  };
  cost: CostBreakdown;
  schedule: ScheduleBreakdown;
  opex: number; // itemized-or-%-fallback annual recurring cost, this facility's own
}

export interface CollaboratorRow {
  id: number;
  invitedEmail: string;
  role: "viewer" | "editor";
  status: "pending" | "accepted";
  userName: string | null;
}

export type { Tier, Phase };
export { PHASE_LABEL, PHASE_ORDER };
