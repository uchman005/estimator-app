// Pure functions only — no DB, no fetch, safe to import from both server
// (API routes) and client (for instant recompute on every keystroke before
// the debounced save round-trips). Keeping this isolated is what let the
// department-rate double-counting bug get caught and fixed in one place
// during prototyping — the same fix now applies everywhere this is used.

export type Phase = "site" | "vertical" | "procurement";
export type Strategy = "phased" | "parallel";

// A facility's BOQ line item — a flat quantity × rate. There's no catalog
// to defer to: rateUsd is the only rate a row has, set either by the
// building-template generator (see generateBuildingFromTemplate() below) or
// typed directly for a flat-priced item ("Ambulance", $85,000). phase/
// baseDurationMonths/baseSize/durationExponent feed rowDurationMonths()
// below — every row carries its own, since there's no shared assembly to
// read them from.
export interface ProjectItemLite {
  id: number;
  customLabel?: string | null;
  customUnit?: string | null;
  customUnifCode?: string | null; // UniFormat division code, e.g. 'B' for a generated Shell row
  quantity: number;
  rateUsd: number;
  phase: Phase;
  baseDurationMonths: number;
  baseSize: number;
  durationExponent: number;
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

// A facility's own cost/schedule settings. Note landCostUsd/funding/opex/
// revenue are NOT here — those live one level up, on the Program (see
// FundingSettings below and computeProgramCapex) — a facility doesn't know
// about land or money, only its own construction, soft costs and schedule.
// escalationPct is still here because escalation is computed against each
// facility's own schedule length, but its *value* is read from the parent
// Program at call time (one shared assumption for every facility on the site).
export interface ProjectSettings {
  aaceClass: number;
  deliveryStrategy: Strategy;
  designFeePct: number; // "Architect fee" in the UI — see SoftCostsPanel.tsx
  pmFeePct: number; // "Contractor fee (overhead & profit)" in the UI
  permitFeePct: number;
  escalationPct: number;
  contingencyPctOverride: number | null;
  fastTrackPremiumPct: number;
  landMonths: number;
  designMonths: number;
  designPermitOverlapPct: number;
  commissionMonths: number;
  costIndex: number; // resolved: country.baseCostIndex * (1 + region.offsetPct/100)
}

// The subset of Program fields computeFeasibility needs — kept separate from
// ProjectSettings so the same function works whether the caller is passing a
// facility's own settings (it never does anymore) or a Program's.
// opexPctOfCapexPerYear is NOT here — it's the per-facility auto-estimate
// fallback rate used by computeFacilityOpex()/computeProgramOpex(), not a
// program-total override, so it's passed to those directly instead.
export interface FundingSettings {
  fundedUsd: number;
  opexOverrideUsd: number;
  annualRevenueUsd: number;
}

/** A recurring/operating cost line item — salaries, maintenance, utilities —
 * on one facility. See project_opex_items in db/schema.ts. */
export interface OpexItemLite {
  annualAmountUsd: number;
  isIncluded: boolean;
}

export function rowUnitRate(item: ProjectItemLite): number {
  return item.rateUsd;
}

export function rowDurationMonths(item: ProjectItemLite): number {
  const size = Math.max(item.quantity, 0.001);
  return Math.max(1, item.baseDurationMonths * Math.pow(size / item.baseSize, item.durationExponent));
}

export interface CostBreakdown {
  coreConstruction: number;
  addonConstruction: number;
  totalConstruction: number;
  softCosts: number;
  escalation: number;
  fastTrackPremium: number;
  contingency: number;
  grandTotal: number; // this facility's own subtotal — no land, see computeProgramCapex
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
    if (item.phase === "site") site.push(dur);
    else if (item.phase === "procurement") procurement.push(dur);
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
  // designFeePct/pmFeePct/permitFeePct together are the RSMeans-style
  // "Contractor Fees + Architect Fee" layer on top of the sub-total — see
  // SoftCostsPanel.tsx for the labels.
  const softCosts = totalConstruction * ((settings.designFeePct + settings.pmFeePct + settings.permitFeePct) / 100);

  const schedule = computeSchedule(items, settings);
  const years = schedule.totalMonths / 12;
  const escalationBase = totalConstruction + softCosts;
  const escalation = escalationBase * (Math.pow(1 + settings.escalationPct / 100, years) - 1);
  const fastTrackPremium = settings.deliveryStrategy === "parallel" ? totalConstruction * (settings.fastTrackPremiumPct / 100) : 0;

  const contingencyPct = (settings.contingencyPctOverride ?? aace.contingencyPct) / 100;
  const contingency = (totalConstruction + softCosts + escalation + fastTrackPremium) * contingencyPct;

  const grandTotal = totalConstruction + softCosts + escalation + fastTrackPremium + contingency;
  const bandLow = grandTotal * (1 + aace.bandLowPct / 100);
  const bandHigh = grandTotal * (1 + aace.bandHighPct / 100);

  return { coreConstruction, addonConstruction, totalConstruction, softCosts, escalation, fastTrackPremium, contingency, grandTotal, bandLow, bandHigh };
}

/** A Program's total capital cost: every INCLUDED facility's own subtotal
 * (each already inclusive of its own soft costs/escalation/contingency),
 * plus the site's land cost — a known, fixed figure, not run through any
 * facility's construction contingency. Facilities toggled off
 * (isIncluded: false) contribute nothing — filter them out before calling
 * this, same as the caller filters `facilities` for computeProgramOpex()
 * below. This is the ONE place a Program's capex is summed — API routes and
 * any future UI should call this rather than re-deriving the sum. */
export function computeProgramCapex(facilities: { grandTotal: number }[], landCostUsd: number): number {
  return facilities.reduce((sum, f) => sum + f.grandTotal, 0) + landCostUsd;
}

/** One facility's own annual recurring/operating cost: the sum of its own
 * included opex line items (salaries, maintenance, ...) if it has any,
 * otherwise an auto-estimate — fallbackPctOfCapex% of THIS facility's own
 * capex subtotal, not the whole program's. A facility only needs itemizing
 * once you want a real number instead of that estimate. */
export function computeFacilityOpex(items: OpexItemLite[], fallbackPctOfCapex: number, facilityCapex: number): number {
  if (items.length === 0) return facilityCapex * (fallbackPctOfCapex / 100);
  return items.reduce((sum, it) => (it.isIncluded ? sum + it.annualAmountUsd : sum), 0);
}

/** A Program's total annual recurring/operating cost: computeFacilityOpex()
 * summed across every INCLUDED facility — the per-facility counterpart to
 * computeProgramCapex(). Filter `facilities` to isIncluded ones before
 * calling, same as for computeProgramCapex(). */
export function computeProgramOpex(facilities: { grandTotal: number; opexItems: OpexItemLite[] }[], fallbackPctOfCapex: number): number {
  return facilities.reduce((sum, f) => sum + computeFacilityOpex(f.opexItems, fallbackPctOfCapex, f.grandTotal), 0);
}

export interface FeasibilityResult {
  coverage: number;
  gap: number;
  opex: number;
  operatingBalance: number;
  sustainabilityRatio: number;
  verdict: "not_feasible" | "conditional_funding" | "conditional_ops" | "feasible";
}

/** autoOpex is the program's total recurring cost as computed by
 * computeProgramOpex() (itemized-per-facility, falling back to a %-of-capex
 * estimate) — funding.opexOverrideUsd, when set, is a program-wide manual
 * override that wins over that computed total outright. */
export function computeFeasibility(grandTotal: number, autoOpex: number, funding: FundingSettings): FeasibilityResult {
  const opex = funding.opexOverrideUsd > 0 ? funding.opexOverrideUsd : autoOpex;
  const operatingBalance = funding.annualRevenueUsd - opex;
  const sustainabilityRatio = opex > 0 ? (funding.annualRevenueUsd / opex) * 100 : funding.annualRevenueUsd > 0 ? 100 : 0;
  const coverage = grandTotal > 0 ? Math.min(100, (funding.fundedUsd / grandTotal) * 100) : 0;
  const gap = Math.max(0, grandTotal - funding.fundedUsd);

  let verdict: FeasibilityResult["verdict"] = "feasible";
  if (coverage < 50) verdict = "not_feasible";
  else if (coverage < 90) verdict = "conditional_funding";
  else if (sustainabilityRatio < 70) verdict = "conditional_ops";

  return { coverage, gap, opex, operatingBalance, sustainabilityRatio, verdict };
}

/* ---------------------------------------------------------------------- */
/*  Modeled square-meter cost estimating — building templates             */
/*                                                                          */
/*  Pick a template, type a gross floor area, and get back one BOQ line   */
/*  per UniFormat division (A-G) at that division's $/m² rate × GFA — the  */
/*  industry-standard "modeled square foot" method (RSMeans etc.):        */
/*  division rows with $/m² and % of subtotal, summing to a subtotal that */
/*  computeCost() above then layers soft costs/escalation/contingency on  */
/*  top of exactly as it already does for any other row. There is no      */
/*  assembly/catalog underneath a division rate — see db/schema.ts's      */
/*  buildingTemplates/buildingTemplateDivisions.                          */
/* ---------------------------------------------------------------------- */

export interface BuildingTemplateDivisionLite {
  divisionCode: string; // 'A'..'G'
  divisionName: string;
  baseRateUsdPerM2: number;
}

export interface BuildingTemplateLite {
  slug: string;
  name: string;
  defaultFloors: number;
  referenceGfaM2: number;
  divisions: BuildingTemplateDivisionLite[];
}

export interface GeneratedBuildingLine {
  divisionCode: string;
  divisionName: string;
  quantity: number; // = grossAreaM2, same for every division row
  rateUsd: number; // = division.baseRateUsdPerM2, scaled by costIndex later like any other row
  phase: Phase;
  baseDurationMonths: number;
  baseSize: number;
  durationExponent: number;
}

/** One row per division, each quantity = the whole GFA (so quantity × rate
 * is that division's own $/m² contribution) — matches the reference
 * breakdown exactly: sum the rows, and you have the building's sub-total
 * before soft costs. All divisions of one generated building share the
 * same schedule profile, sized off the template (more floors → longer
 * critical path; baseSize keyed to the template's own reference GFA so a
 * building close to that reference takes about baseDurationMonths).
 *
 * `markupPct` (default 10) is baked directly into each row's `rateUsd` —
 * a flat buffer over the template's placeholder rates, for the real-world
 * surprises a rough per-m² figure can't see coming. It's just a higher
 * number on every row, not a separate contingency line — set it to 0 for
 * the template's rate exactly as seeded. */
export function generateBuildingFromTemplate(template: BuildingTemplateLite, grossAreaM2: number, markupPct = 10): GeneratedBuildingLine[] {
  const baseDurationMonths = 4 + template.defaultFloors * 2;
  const baseSize = Math.max(template.referenceGfaM2, 1);
  const markupFactor = 1 + markupPct / 100;
  return template.divisions.map((d) => ({
    divisionCode: d.divisionCode,
    divisionName: d.divisionName,
    quantity: grossAreaM2,
    rateUsd: d.baseRateUsdPerM2 * markupFactor,
    phase: "vertical" as Phase,
    baseDurationMonths,
    baseSize,
    durationExponent: 0.4,
  }));
}
