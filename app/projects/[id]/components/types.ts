import type { AssemblyLite, AaceClass, Tier } from "@/lib/calc/engine";

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

// A facility — one building inside a Program. Location, funding and
// feasibility live on the parent Program (see app/programs/[id]/components/types.ts).
export interface ProjectRow {
  id: number;
  programId: number;
  phase: "phase_1" | "phase_2" | "phase_3";
  name: string;
  author: string | null;
  isIncluded: boolean;
  aaceClass: number;
  deliveryStrategy: "phased" | "parallel";
  designFeePct: number;
  pmFeePct: number;
  permitFeePct: number;
  contingencyPctOverride: number | null;
  fastTrackPremiumPct: number;
  landMonths: number;
  designMonths: number;
  designPermitOverlapPct: number;
  commissionMonths: number;
  startDate: string | null;
}

export interface ItemRow {
  id: number;
  assemblyId: number | null;
  customLabel: string | null;
  customUnit: string | null;
  customUnifCode: string | null;
  quantity: number;
  tier: Tier | null;
  variantId: number | null;
  rateOverrideUsd: number | null;
  isAddon: boolean;
  isIncluded: boolean;
}

export const OPEX_CATEGORIES = ["salaries", "maintenance", "utilities", "supplies", "other"] as const;
export type OpexCategory = (typeof OPEX_CATEGORIES)[number];
export const OPEX_CATEGORY_LABEL: Record<OpexCategory, string> = {
  salaries: "Salaries & staffing",
  maintenance: "Maintenance",
  utilities: "Utilities",
  supplies: "Consumables & supplies",
  other: "Other",
};

export interface OpexItemRow {
  id: number;
  label: string;
  category: OpexCategory;
  annualAmountUsd: number;
  isIncluded: boolean;
  notes: string | null;
}

export interface HospitalGenInfo {
  totalGFA: number;
  footprint: number;
  wallAreaM2: number;
  windowAreaM2: number;
  doorCount: number;
  orCount: number;
  orMinAreaM2: number;
  elevators: number;
  stairs: number;
  deptSplitM2: { label: string; areaM2: number }[];
}
