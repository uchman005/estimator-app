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

export interface ProjectRow {
  id: number;
  name: string;
  author: string | null;
  countryId: string;
  regionId: number | null;
  aaceClass: number;
  deliveryStrategy: "phased" | "parallel";
  designFeePct: number;
  pmFeePct: number;
  permitFeePct: number;
  landCostUsd: number;
  escalationPct: number;
  contingencyPctOverride: number | null;
  fastTrackPremiumPct: number;
  landMonths: number;
  designMonths: number;
  designPermitOverlapPct: number;
  commissionMonths: number;
  startDate: string | null;
  fundedUsd: number;
  opexOverrideUsd: number;
  opexPctOfCapexPerYear: number;
  annualRevenueUsd: number;
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

export interface CollaboratorRow {
  id: number;
  invitedEmail: string;
  role: "viewer" | "editor";
  status: "pending" | "accepted";
  userName: string | null;
}
