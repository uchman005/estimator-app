import type { AaceClass, CostBreakdown, ScheduleBreakdown } from "@/lib/calc/engine";

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

// A building template, just the fields the "add facility" form needs (not
// its division rates — that breakdown is only needed on a facility's own
// page, see app/projects/[id]/components/types.ts's richer BuildingTemplateRow).
export interface BuildingTemplateSummary {
  slug: string;
  name: string;
  defaultFloors: number;
  referenceGfaM2: number;
}

export interface ReferenceData {
  countries: CountryRow[];
  currencies: { code: string; symbol: string }[];
  aaceClasses: AaceClass[];
  buildingTemplates: BuildingTemplateSummary[];
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
    facilityType: string;
    name: string;
    author: string | null;
    isIncluded: boolean;
    aaceClass: number;
  };
  // Only what's needed to derive this facility's GFA (a generated building
  // row's quantity — see FacilitiesPanel.tsx's costPerM2) — the real rows
  // carry more fields, structural typing just ignores the rest.
  items: { customUnifCode: string | null; quantity: number }[];
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
