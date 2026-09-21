// Pure functions only — no DB, no fetch, safe to import from both server
// (API routes) and client (for instant recompute on every keystroke before
// the debounced save round-trips). Keeping this isolated is what let the
// department-rate double-counting bug get caught and fixed in one place
// during prototyping — the same fix now applies everywhere this is used.

export type Tier = "basic" | "standard" | "premium";
export type Phase = "site" | "vertical" | "procurement";
export type Strategy = "phased" | "parallel";
export type PricingMode = "tier" | "variant" | "composite";

export interface MicroItemLite {
  id: number;
  name: string;
  unit: string;
  rates: Partial<Record<Tier, number>>;
}
/** A join row: this micro-item, assembled into a sub-item at this quantity. */
export interface SubItemComponentLite {
  joinId: number; // id of the sub_item_micro_items row — needed to edit/delete just this assembly link
  quantity: number;
  microItem: MicroItemLite;
}
/** A library entry — reusable across any number of macro-items. */
export interface SubItemLite {
  id: number;
  name: string;
  components: SubItemComponentLite[];
  labour: Record<Tier, number>; // assembly/fitting labour, additive on top of components
}
/** A join row: this sub-item, assembled into a macro-item at this quantity. */
export interface MacroItemComponentLite {
  joinId: number; // id of the macro_item_sub_items row
  quantity: number;
  subItem: SubItemLite;
}
export interface MacroItemLite {
  id: number;
  name: string;
  components: MacroItemComponentLite[];
  labour: Record<Tier, number>; // coordination/commissioning labour, additive on top of components
}

export interface AssemblyLite {
  id: number;
  name: string;
  unit: string;
  pricingMode: PricingMode;
  hasVariants: boolean;
  baseDurationMonths: number;
  baseSize: number;
  durationExponent: number;
  phase: Phase;
  classCode: string;
  className: string;
  tierRates?: Partial<Record<Tier, number>>;
  variants?: { id: number; label: string; unitRateUsd: number; laborPct: number; materialPct: number }[];
  macroItems?: MacroItemLite[];
}

export interface ProjectItemLite {
  id: number;
  assembly: AssemblyLite | null;
  customLabel?: string | null;
  customUnit?: string | null;
  customUnifCode?: string | null;
  quantity: number;
  tier?: Tier | null;
  variantId?: number | null;
  rateOverrideUsd?: number | null;
  isAddon: boolean;
  isIncluded: boolean;
}

export interface AaceClass {
  classNumber: number;
  contingencyPct: number;
  bandLowPct: number;
  bandHighPct: number;
  description: string;
}

export interface ProjectSettings {
  aaceClass: number;
  deliveryStrategy: Strategy;
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
  fundedUsd: number;
  opexOverrideUsd: number;
  opexPctOfCapexPerYear: number;
  annualRevenueUsd: number;
  costIndex: number; // resolved: country.baseCostIndex * (1 + region.offsetPct/100)
}

export function rowUnitRate(item: ProjectItemLite): number {
  if (item.rateOverrideUsd != null) return item.rateOverrideUsd; // explicit override always wins, even over a composite sum
  if (!item.assembly) return 0;
  if (item.assembly.pricingMode === "composite") return compositeAssemblyRate(item.assembly, item.tier ?? "standard");
  if (item.assembly.hasVariants) {
    const variant = item.assembly.variants?.find((v) => v.id === item.variantId) ?? item.assembly.variants?.[0];
    return variant?.unitRateUsd ?? 0;
  }
  const tier = item.tier ?? "standard";
  return item.assembly.tierRates?.[tier] ?? 0;
}

/** A sub-item's own rate: the sum of quantity × rate across every
 * micro-item it's assembled from, PLUS its own assembly labour (fitting the
 * components together into a working sub-item — additive, not baked into
 * any one micro-item's rate). Exposed on its own since the Sub-Items
 * Library needs "what does this sub-item cost, standalone" independent of
 * any macro-item that happens to use it. */
export function subItemRate(subItem: SubItemLite, tier: Tier): number {
  const componentsTotal = subItem.components.reduce((s, c) => s + c.quantity * (c.microItem.rates[tier] ?? 0), 0);
  return componentsTotal + (subItem.labour[tier] ?? 0);
}

/** The whole point of the composite model: an assembly (the "Main Item")
 * never has its own rate set directly — it's the sum, three levels down, of
 * every macro-item's assembled sub-items (each at its own join quantity),
 * each sub-item's assembled micro-items (each at ITS own join quantity),
 * times that micro-item's rate, at the given tier — PLUS each macro-item's
 * own coordination labour and each sub-item's own assembly labour, both
 * additive. A join quantity left at the default of 1 (and labour left at 0)
 * makes an assembled item behave as a plain $/unit rate, so both patterns —
 * "$/m² of GFA" and "a literal takeoff of doors and walls, plus the labour
 * to put them together" — can coexist under the same assembly. Because
 * sub-items and micro-items are a shared library, editing one rate, one
 * labour figure, or one join quantity changes every assembly that
 * assembles it in, automatically. */
export function compositeAssemblyRate(assembly: AssemblyLite, tier: Tier): number {
  let sum = 0;
  for (const macro of assembly.macroItems ?? []) {
    const subItemsTotal = macro.components.reduce((s, comp) => s + comp.quantity * subItemRate(comp.subItem, tier), 0);
    sum += subItemsTotal + (macro.labour[tier] ?? 0);
  }
  return sum;
}

/** For UI breakdown display: macro-item subtotals (summed across all their
 * assembled sub-items and micro-items, plus the macro-item's own labour) at
 * a given tier. */
export function compositeBreakdown(assembly: AssemblyLite, tier: Tier): { macroItemId: number; name: string; subtotal: number }[] {
  return (assembly.macroItems ?? []).map((macro) => {
    const subItemsTotal = macro.components.reduce((s, c) => s + c.quantity * subItemRate(c.subItem, tier), 0);
    return { macroItemId: macro.id, name: macro.name, subtotal: subItemsTotal + (macro.labour[tier] ?? 0) };
  });
}

export function rowDurationMonths(item: ProjectItemLite): number {
  if (!item.assembly) return 1;
  const size = Math.max(item.quantity, 0.001);
  return Math.max(1, item.assembly.baseDurationMonths * Math.pow(size / item.assembly.baseSize, item.assembly.durationExponent));
}

export interface CostBreakdown {
  coreConstruction: number;
  addonConstruction: number;
  totalConstruction: number;
  softCosts: number;
  escalation: number;
  fastTrackPremium: number;
  land: number;
  contingency: number;
  grandTotal: number;
  bandLow: number;
  bandHigh: number;
}

export interface ScheduleBreakdown {
  prePhaseMonths: number;
  constructionMonths: number;
  commissionMonths: number;
  totalMonths: number;
}

export function computeSchedule(items: ProjectItemLite[], settings: ProjectSettings): ScheduleBreakdown {
  const included = items.filter((i) => i.isIncluded);
  const site: number[] = [];
  const vertical: number[] = [];
  const procurement: number[] = [];
  for (const item of included) {
    const dur = rowDurationMonths(item);
    const phase = item.assembly?.phase ?? "vertical";
    if (phase === "site") site.push(dur);
    else if (phase === "procurement") procurement.push(dur);
    else vertical.push(dur);
  }
  const siteDur = site.length ? Math.max(...site) : 2;
  const vertSorted = [...vertical].sort((a, b) => b - a);
  let vertCritical: number;
  if (settings.deliveryStrategy === "parallel") {
    vertCritical = (vertSorted[0] ?? 3) * 1.15;
  } else {
    vertCritical = 0;
    vertSorted.forEach((d, i) => {
      if (i === 0) vertCritical += d;
      else if (i === 1) vertCritical += d * 0.4;
      else vertCritical += d * 0.2;
    });
    if (!vertSorted.length) vertCritical = 3;
  }
  const procMax = procurement.length ? Math.max(...procurement) : 0;
  let constructionMonths = Math.max(siteDur, vertCritical) + 0.3 * Math.min(siteDur, vertCritical);
  constructionMonths = Math.max(constructionMonths, procMax);

  const prePhaseMonths = settings.landMonths + settings.designMonths * (1 - settings.designPermitOverlapPct / 100);
  const totalMonths = prePhaseMonths + constructionMonths + settings.commissionMonths;

  return { prePhaseMonths, constructionMonths, commissionMonths: settings.commissionMonths, totalMonths };
}

export function computeCost(items: ProjectItemLite[], settings: ProjectSettings, aace: AaceClass): CostBreakdown {
  let coreConstruction = 0;
  let addonConstruction = 0;
  for (const item of items) {
    if (!item.isIncluded) continue;
    const cost = item.quantity * rowUnitRate(item) * settings.costIndex;
    if (item.isAddon) addonConstruction += cost;
    else coreConstruction += cost;
  }
  const totalConstruction = coreConstruction + addonConstruction;
  const softCosts = totalConstruction * ((settings.designFeePct + settings.pmFeePct + settings.permitFeePct) / 100);

  const schedule = computeSchedule(items, settings);
  const years = schedule.totalMonths / 12;
  const escalationBase = totalConstruction + softCosts;
  const escalation = escalationBase * (Math.pow(1 + settings.escalationPct / 100, years) - 1);
  const fastTrackPremium = settings.deliveryStrategy === "parallel" ? totalConstruction * (settings.fastTrackPremiumPct / 100) : 0;

  const contingencyPct = (settings.contingencyPctOverride ?? aace.contingencyPct) / 100;
  const contingency = (totalConstruction + softCosts + escalation + fastTrackPremium) * contingencyPct + settings.landCostUsd * contingencyPct * 0.5;

  const grandTotal = totalConstruction + softCosts + escalation + fastTrackPremium + settings.landCostUsd + contingency;
  const bandLow = grandTotal * (1 + aace.bandLowPct / 100);
  const bandHigh = grandTotal * (1 + aace.bandHighPct / 100);

  return { coreConstruction, addonConstruction, totalConstruction, softCosts, escalation, fastTrackPremium, land: settings.landCostUsd, contingency, grandTotal, bandLow, bandHigh };
}

export interface FeasibilityResult {
  coverage: number;
  gap: number;
  opex: number;
  operatingBalance: number;
  sustainabilityRatio: number;
  verdict: "not_feasible" | "conditional_funding" | "conditional_ops" | "feasible";
}

export function computeFeasibility(grandTotal: number, settings: ProjectSettings): FeasibilityResult {
  const opexAuto = grandTotal * (settings.opexPctOfCapexPerYear / 100);
  const opex = settings.opexOverrideUsd > 0 ? settings.opexOverrideUsd : opexAuto;
  const operatingBalance = settings.annualRevenueUsd - opex;
  const sustainabilityRatio = opex > 0 ? (settings.annualRevenueUsd / opex) * 100 : settings.annualRevenueUsd > 0 ? 100 : 0;
  const coverage = grandTotal > 0 ? Math.min(100, (settings.fundedUsd / grandTotal) * 100) : 0;
  const gap = Math.max(0, grandTotal - settings.fundedUsd);

  let verdict: FeasibilityResult["verdict"] = "feasible";
  if (coverage < 50) verdict = "not_feasible";
  else if (coverage < 90) verdict = "conditional_funding";
  else if (sustainabilityRatio < 70) verdict = "conditional_ops";

  return { coverage, gap, opex, operatingBalance, sustainabilityRatio, verdict };
}

/* ---------------------------------------------------------------------- */
/*  Hospital bed-program generator                                        */
/* ---------------------------------------------------------------------- */

export interface HospitalGeneratorInput {
  beds: number;
  tier: Tier;
  floors: number;
  floorToFloorM: number;
  windowToWallRatio: number; // 0..1
}

export interface GeneratedLineSpec {
  assemblyCode: string; // matches seed's assemblyIdByCode keys — resolved to an id by the caller
  quantity: number;
  tier?: Tier;
  variantIndex?: number; // index into the assembly's variants, resolved by caller
}

export interface HospitalGeneratorResult {
  lines: GeneratedLineSpec[];
  info: {
    totalGFA: number;
    footprint: number;
    lengthM: number;
    widthM: number;
    wallAreaM2: number;
    windowAreaM2: number;
    doorCount: number;
    orCount: number;
    orMinAreaM2: number;
    elevators: number;
    stairs: number;
    deptSplitM2: { label: string; areaM2: number }[];
  };
}

const DEFAULT_WALL_VARIANT_BY_TIER: Record<Tier, number> = { basic: 0, standard: 1, premium: 3 };
const DEFAULT_WINDOW_VARIANT_BY_TIER: Record<Tier, number> = { basic: 0, standard: 1, premium: 2 };
const DEFAULT_DOOR_VARIANT_BY_TIER: Record<Tier, number> = { basic: 0, standard: 1, premium: 2 };

// Departmental split of total GFA — shown for space-programming context
// (how many m² of nursing vs. surgical vs. admin space this implies) but
// NOT separately priced: the five composite categories below (Structural,
// Mechanical, Electrical, Specialized Medical Areas, Finishing) already
// price the whole GFA inclusive of that mix, per the sourced per-m²
// breakdown. Pricing this split AND the composite categories would double
// count the same construction cost from two different angles.
const HOSPITAL_DEPT_SPLIT = {
  "Inpatient Nursing Units": 0.42,
  "Surgical / Operating Theatre Suite": 0.09,
  "Diagnostic & Treatment": 0.13,
  "Emergency Department": 0.06,
  Administration: 0.08,
  "Support Services": 0.12,
  "Circulation, Risers & Plant": 0.10,
};

export const HOSPITAL_GFA_PER_BED: Record<Tier, number> = { basic: 65, standard: 95, premium: 160 };

export function generateHospitalProgram(input: HospitalGeneratorInput): HospitalGeneratorResult {
  const { beds, tier, floors, floorToFloorM, windowToWallRatio } = input;
  const totalGFA = beds * HOSPITAL_GFA_PER_BED[tier];
  const footprint = totalGFA / floors;
  const widthM = Math.sqrt(footprint / 1.6);
  const lengthM = footprint / widthM;
  const perimeter = 2 * (lengthM + widthM);
  const grossWallArea = perimeter * floorToFloorM * floors;
  const windowAreaM2 = grossWallArea * windowToWallRatio;
  const wallAreaM2 = grossWallArea - windowAreaM2;
  const doorCount = 2 + floors;

  const orCount = Math.ceil(beds / 28);
  const orMinAreaM2 = orCount * 55.7; // FGI Guidelines minimum clear OR floor area (600 sq ft)

  let elevators: number;
  if (floors <= 1) elevators = 1;
  else if (beds <= 60) elevators = 1;
  else if (beds <= 200) elevators = 2;
  else if (beds <= 350) elevators = 3;
  else elevators = 3 + Math.ceil((beds - 350) / 150);

  const stairs = Math.max(2, 2 + Math.floor(Math.max(0, totalGFA - 2500) / 2500));

  const lines: GeneratedLineSpec[] = [
    // The whole hospital's core construction is ONE "Main Item" row now —
    // Structural Work, Mechanical Systems, Electrical Systems, Specialized
    // Medical Areas and Finishing live as macro-items underneath it (each
    // itself broken into sub-items → micro-items). Its rate is resolved by
    // rowUnitRate()/compositeAssemblyRate() in the calc engine, not set here.
    { assemblyCode: "hospital_core", quantity: round(totalGFA), tier },
    // Envelope stays variant-priced (a real material choice, not a cost split).
    { assemblyCode: "ext_wall", quantity: round(wallAreaM2), variantIndex: DEFAULT_WALL_VARIANT_BY_TIER[tier] },
    { assemblyCode: "ext_window", quantity: round(windowAreaM2), variantIndex: DEFAULT_WINDOW_VARIANT_BY_TIER[tier] },
    { assemblyCode: "ext_door", quantity: doorCount, variantIndex: DEFAULT_DOOR_VARIANT_BY_TIER[tier] },
    // Vertical transport stays count-based per the US code convention.
    { assemblyCode: "stairs_core", quantity: stairs, tier },
    { assemblyCode: "elevator_car", quantity: elevators, tier },
  ];

  return {
    lines,
    info: {
      totalGFA, footprint, lengthM, widthM, wallAreaM2, windowAreaM2, doorCount,
      orCount, orMinAreaM2, elevators, stairs,
      deptSplitM2: Object.entries(HOSPITAL_DEPT_SPLIT).map(([label, pct]) => ({ label, areaM2: totalGFA * pct })),
    },
  };
}

function round(n: number): number {
  return Math.round(n);
}
