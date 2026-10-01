import type { AaceClass } from "@/lib/calc/engine";

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

export interface BuildingTemplateDivisionRow {
  divisionCode: string;
  divisionName: string;
  baseRateUsdPerM2: number;
}

export interface BuildingTemplateRow {
  slug: string;
  name: string;
  defaultFloors: number;
  referenceGfaM2: number;
  divisions: BuildingTemplateDivisionRow[];
}

export interface ReferenceData {
  countries: CountryRow[];
  currencies: { code: string; symbol: string }[];
  aaceClasses: AaceClass[];
  buildingTemplates: BuildingTemplateRow[];
}

// A facility — one building inside a Program. Location, funding and
// feasibility live on the parent Program (see app/programs/[id]/components/types.ts).
export interface ProjectRow {
  id: number;
  programId: number;
  facilityType: string;
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

// UniFormat II level-1 divisions — a generated building row is tagged with
// one of A-G; a flat-priced item (vehicle, equipment) typically uses 'Z'.
export const UNIFORMAT_DIVISIONS: { code: string; name: string }[] = [
  { code: "A", name: "Substructure" },
  { code: "B", name: "Shell" },
  { code: "C", name: "Interiors" },
  { code: "D", name: "Services" },
  { code: "E", name: "Equipment & Furnishings" },
  { code: "F", name: "Special Construction" },
  { code: "G", name: "Building Sitework" },
  { code: "Z", name: "Other / Equipment / Vehicles" },
];

export interface ItemRow {
  id: number;
  customLabel: string | null;
  customUnit: string | null;
  customUnifCode: string | null;
  quantity: number;
  rateUsd: number;
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

export interface BuildingGenInfo {
  templateName: string;
  defaultFloors: number;
  grossAreaM2: number;
  markupPct: number;
  divisionCount: number;
}
