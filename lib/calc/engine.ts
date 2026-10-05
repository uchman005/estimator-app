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
  // Manual override for the computed construction duration, in months —
  // 0 = auto (use the BOQ-derived critical path below). See
  // projects.constructionMonthsOverride in db/schema.ts.
  constructionMonthsOverride: number;
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
  // Whether constructionMonths came from the manual override rather than the
  // BOQ-derived critical path below — see ProjectSettings.constructionMonthsOverride.
  constructionIsOverridden: boolean;
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

  const constructionIsOverridden = settings.constructionMonthsOverride > 0;
  if (constructionIsOverridden) constructionMonths = settings.constructionMonthsOverride;

  const prePhaseMonths = settings.landMonths + settings.designMonths * (1 - settings.designPermitOverlapPct / 100);
  const totalMonths = prePhaseMonths + constructionMonths + settings.commissionMonths;

  return { prePhaseMonths, constructionMonths, commissionMonths: settings.commissionMonths, totalMonths, constructionIsOverridden };
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

/** One facility's own annual recurring/operating cost: the sum of its own
 * included opex line items (salaries, maintenance, ...) if it has any,
 * otherwise an auto-estimate — fallbackPctOfCapex% of THIS facility's own
 * capex subtotal, not the whole program's. A facility only needs itemizing
 * once you want a real number instead of that estimate. `facilityCapex` is
 * rounded to the whole dollar BEFORE the percentage is applied — the same
 * rounded figure a facility's cost is ever displayed as — so "this row is
 * 8% of that capex row" holds exactly when someone checks it by hand,
 * instead of drifting because the fallback was computed off an unrounded
 * internal value nobody can see. */
export function computeFacilityOpex(items: OpexItemLite[], fallbackPctOfCapex: number, facilityCapex: number): number {
  if (items.length === 0) return Math.round(facilityCapex) * (fallbackPctOfCapex / 100);
  return items.reduce((sum, it) => (it.isIncluded ? sum + it.annualAmountUsd : sum), 0);
}

/** A facility's own revenue-source line item — patient fees, pharmacy sales,
 * rental income, grants, etc. See project_revenue_items in db/schema.ts. */
export interface RevenueItemLite {
  annualAmountUsd: number;
  isIncluded: boolean;
}

/** Unlike computeFacilityOpex, there's no %-of-capex fallback here — a
 * facility with no revenue rows just has $0 projected revenue, which is
 * usually the honest answer (an ambulance or ICT hub doesn't generate its
 * own revenue; a clinic's revenue has no principled relationship to its
 * construction cost the way a maintenance-budget estimate does). */
export function computeFacilityRevenue(items: RevenueItemLite[]): number {
  return items.reduce((sum, it) => (it.isIncluded ? sum + it.annualAmountUsd : sum), 0);
}

export type FeasibilityVerdict = "not_feasible" | "conditional_funding" | "conditional_ops" | "feasible";

export interface ProgramFacilityInput {
  grandTotal: number;
  bandLow: number;
  bandHigh: number;
  opex: number; // computeFacilityOpex()'s result for this facility — already itemized-or-fallback
  isItemizedOpex: boolean; // opexItems.length > 0 — whether opex scales with the capex band below, or is a fixed real figure
  revenue: number; // computeFacilityRevenue()'s result for this facility — this facility's own itemized revenue sources
  totalMonths: number;
}

export interface ProgramReport {
  // Capital — every aggregate here is a sum of each facility's OWN rounded
  // figure (plus rounded land), not an independently-rounded sum of exact
  // internal values. That's what makes "the four rows add up to the total"
  // literally true by construction, not a coincidence of the numbers — see
  // the note on computeProgramCapex's replacement below.
  capex: number;
  bandLow: number;
  bandHigh: number;

  // Operating cost — same reconciliation, plus a band: a %-fallback
  // facility's opex is tied to ITS OWN capex band (8% of a cheaper/costlier
  // building is a cheaper/costlier building to run); an itemized facility's
  // real figure doesn't move with the capex band at all, since it was never
  // derived from capex in the first place.
  opex: number;
  opexBandLow: number;
  opexBandHigh: number;

  // Revenue — the sum of each facility's own itemized revenue sources
  // (computeFacilityRevenue(), rounded per facility before summing, same
  // reconciliation principle as capex/opex above), unless the program sets
  // a flat override via FundingSettings.annualRevenueUsd ("0 = auto" — the
  // same convention opexOverrideUsd already uses).
  revenue: number;
  revenueIsOverridden: boolean;

  // Funding coverage — NOT capped at 100%: a program that's over-funded at
  // the point estimate shows `surplus` instead of a hidden `gap` of 0, and
  // `coverageAtBandHigh`/`gapAtBandHigh` show the same picture at the
  // estimate's own worst case, not just the single point figure.
  coverage: number;
  coverageAtBandHigh: number;
  gap: number;
  gapAtBandHigh: number;
  surplus: number;

  // Operations — operatingBalance at the point estimate, plus its own
  // range (driven by the opex band above): AtBandLow pairs with the
  // costlier/worse opex case, AtBandHigh with the cheaper/better one.
  operatingBalance: number;
  operatingBalanceAtBandLow: number;
  operatingBalanceAtBandHigh: number;
  sustainabilityRatio: number;
  // Years a capital surplus (if any) could fund the operating shortfall
  // on its own, before new funding would be needed — 0 when there's no
  // surplus or no opex to measure it against.
  fundingRunwayYears: number;

  // Schedule — "parallel" is the longest single facility (the existing
  // assumption: every facility breaks ground at once); "sequential" is the
  // sum of all of them (one crew, one facility after another) — the two
  // honest ends of a range this model has no real way to pick between on
  // its own, rather than presenting the parallel figure as THE duration.
  totalMonthsParallel: number;
  totalMonthsSequential: number;

  verdict: FeasibilityVerdict;
}

/** The one place a Program's whole capital/funding/operating picture is
 * computed — replaces the old computeProgramCapex()/computeProgramOpex()/
 * computeFeasibility() trio, which independently rounded their own
 * aggregates and could drift from each other and from the per-facility rows
 * a report shows alongside them. Call with every INCLUDED facility only —
 * same filtering contract the old functions had. */
export function computeProgramReport(
  facilities: ProgramFacilityInput[],
  landCostUsd: number,
  funding: FundingSettings,
  fallbackPctOfCapex: number
): ProgramReport {
  const roundedLand = Math.round(landCostUsd);
  const capex = facilities.reduce((s, f) => s + Math.round(f.grandTotal), 0) + roundedLand;
  const bandLow = facilities.reduce((s, f) => s + Math.round(f.bandLow), 0) + roundedLand;
  const bandHigh = facilities.reduce((s, f) => s + Math.round(f.bandHigh), 0) + roundedLand;

  const opex = facilities.reduce((s, f) => s + Math.round(f.opex), 0);
  const opexBandLow = facilities.reduce(
    (s, f) => s + Math.round(f.isItemizedOpex ? f.opex : f.bandLow * (fallbackPctOfCapex / 100)),
    0
  );
  const opexBandHigh = facilities.reduce(
    (s, f) => s + Math.round(f.isItemizedOpex ? f.opex : f.bandHigh * (fallbackPctOfCapex / 100)),
    0
  );

  const facilityRevenueSum = facilities.reduce((s, f) => s + Math.round(f.revenue), 0);
  const revenueIsOverridden = funding.annualRevenueUsd > 0;
  const revenue = revenueIsOverridden ? funding.annualRevenueUsd : facilityRevenueSum;

  const effectiveOpex = funding.opexOverrideUsd > 0 ? funding.opexOverrideUsd : opex;
  const effectiveOpexAtBandLow = funding.opexOverrideUsd > 0 ? funding.opexOverrideUsd : opexBandHigh; // costlier opex = worse case
  const effectiveOpexAtBandHigh = funding.opexOverrideUsd > 0 ? funding.opexOverrideUsd : opexBandLow; // cheaper opex = better case

  const operatingBalance = revenue - effectiveOpex;
  const operatingBalanceAtBandLow = revenue - effectiveOpexAtBandLow;
  const operatingBalanceAtBandHigh = revenue - effectiveOpexAtBandHigh;
  const sustainabilityRatio = effectiveOpex > 0 ? (revenue / effectiveOpex) * 100 : revenue > 0 ? 100 : 0;

  const coverage = capex > 0 ? (funding.fundedUsd / capex) * 100 : 0;
  const coverageAtBandHigh = bandHigh > 0 ? (funding.fundedUsd / bandHigh) * 100 : 0;
  const gap = Math.max(0, capex - funding.fundedUsd);
  const gapAtBandHigh = Math.max(0, bandHigh - funding.fundedUsd);
  const surplus = Math.max(0, funding.fundedUsd - capex);
  const fundingRunwayYears = surplus > 0 && effectiveOpex > 0 ? surplus / effectiveOpex : 0;

  const totalMonthsParallel = facilities.reduce((max, f) => Math.max(max, f.totalMonths), 0);
  const totalMonthsSequential = facilities.reduce((s, f) => s + f.totalMonths, 0);

  let verdict: FeasibilityVerdict = "feasible";
  if (coverage < 50) verdict = "not_feasible";
  else if (coverage < 90) verdict = "conditional_funding";
  else if (sustainabilityRatio < 70) verdict = "conditional_ops";

  return {
    capex, bandLow, bandHigh,
    opex, opexBandLow, opexBandHigh,
    revenue, revenueIsOverridden,
    coverage, coverageAtBandHigh, gap, gapAtBandHigh, surplus,
    operatingBalance, operatingBalanceAtBandLow, operatingBalanceAtBandHigh, sustainabilityRatio, fundingRunwayYears,
    totalMonthsParallel, totalMonthsSequential,
    verdict,
  };
}

/** A simple nominal (NOT discounted to present value — no discount-rate
 * assumption exists anywhere in this model, so this doesn't invent one)
 * multi-year operating-cost projection: `annualOpex` compounding at
 * `inflationPct` per year for `years` years. Reuses the program's own
 * escalationPct as the inflation assumption, the same rate already used to
 * escalate construction cost over the build schedule — there's no separate
 * "opex inflation" input anywhere else in the app to divide this from. */
export function computeOpexProjection(annualOpex: number, years: number, inflationPct: number): number {
  let total = 0;
  for (let y = 0; y < years; y++) total += annualOpex * Math.pow(1 + inflationPct / 100, y);
  return total;
}

/** A single facility's inputs to the cash-flow timeline below — just the
 * four numbers that determine when and how much money moves: its own
 * capital subtotal, its own schedule (when construction starts/ends, when
 * it goes operational), and its own steady-state annual opex/revenue. */
export interface CashFlowFacilityInput {
  grandTotal: number;
  schedule: ScheduleBreakdown;
  opex: number;
  revenue: number;
}

export interface CashFlowYear {
  year: number; // 1-indexed — "Year 1" is the program's first 12 months
  capexOutflow: number;
  opexOutflow: number;
  revenueInflow: number;
  net: number; // revenueInflow - capexOutflow - opexOutflow
  cumulativeBalance: number; // running total of net, from year 1
}

/** Turns the program's capex/opex/revenue totals into a year-by-year timeline
 * instead of three undated lump sums — the thing none of the other figures on
 * a program report can show: WHEN money moves, not just how much. Modeled at
 * monthly resolution internally (so a facility finishing construction
 * mid-year still splits that year's capex/opex correctly) and bucketed into
 * years for a readable chart.
 *
 * Deliberately simple, stated assumptions rather than invented precision:
 * - Land is spent in month 1 (acquisition typically happens upfront, and
 *   there's no finer timing input for it anywhere in the model).
 * - Each facility's ENTIRE capital subtotal (`grandTotal` — already including
 *   soft costs, escalation, contingency) is spread evenly across its own
 *   `constructionMonths`, starting right after its own `prePhaseMonths`
 *   (land/design/permitting lead time, which isn't separately costed here).
 * - Every facility is assumed to start on day one of the program (the same
 *   "parallel build" assumption `totalMonthsParallel` already uses elsewhere
 *   in this report) — this is a portfolio-level timeline, not a sequencing
 *   plan.
 * - Opex and revenue start accruing (at 1/12th the annual rate per month)
 *   the month a facility's own `totalMonths` (pre-phase + construction +
 *   commissioning) completes — i.e. once it's operational — and continue for
 *   the rest of the horizon. Opex compounds at `escalationPct`/yr, the same
 *   assumption `computeOpexProjection()` already uses; revenue is held flat,
 *   since no revenue-escalation input exists anywhere in this model. */
export function computeCashFlowTimeline(
  facilities: CashFlowFacilityInput[],
  landCostUsd: number,
  horizonYears: number,
  escalationPct: number
): CashFlowYear[] {
  const longestTotalMonths = facilities.reduce((max, f) => Math.max(max, f.schedule.totalMonths), 0);
  const totalMonths = Math.max(12, Math.ceil(longestTotalMonths) + horizonYears * 12);

  const monthlyCapex = new Array(totalMonths).fill(0);
  const monthlyOpex = new Array(totalMonths).fill(0);
  const monthlyRevenue = new Array(totalMonths).fill(0);

  if (totalMonths > 0) monthlyCapex[0] += Math.round(landCostUsd);

  for (const f of facilities) {
    const constructionStart = Math.max(0, Math.round(f.schedule.prePhaseMonths));
    const constructionMonths = Math.max(1, Math.round(f.schedule.constructionMonths));
    const perMonthCapex = f.grandTotal / constructionMonths;
    for (let m = constructionStart; m < constructionStart + constructionMonths && m < totalMonths; m++) {
      monthlyCapex[m] += perMonthCapex;
    }

    const operationalFrom = Math.max(0, Math.round(f.schedule.totalMonths));
    for (let m = operationalFrom; m < totalMonths; m++) {
      const yearsOperational = Math.floor((m - operationalFrom) / 12);
      monthlyOpex[m] += (f.opex / 12) * Math.pow(1 + escalationPct / 100, yearsOperational);
      monthlyRevenue[m] += f.revenue / 12;
    }
  }

  const numYears = Math.ceil(totalMonths / 12);
  const years: CashFlowYear[] = [];
  let cumulativeBalance = 0;
  for (let y = 0; y < numYears; y++) {
    let capexOutflow = 0;
    let opexOutflow = 0;
    let revenueInflow = 0;
    for (let m = y * 12; m < Math.min((y + 1) * 12, totalMonths); m++) {
      capexOutflow += monthlyCapex[m];
      opexOutflow += monthlyOpex[m];
      revenueInflow += monthlyRevenue[m];
    }
    capexOutflow = Math.round(capexOutflow);
    opexOutflow = Math.round(opexOutflow);
    revenueInflow = Math.round(revenueInflow);
    const net = revenueInflow - capexOutflow - opexOutflow;
    cumulativeBalance += net;
    years.push({ year: y + 1, capexOutflow, opexOutflow, revenueInflow, net, cumulativeBalance });
  }
  return years;
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
