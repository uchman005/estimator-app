import { Panel } from "@/components/ui/Panel";
import { Kpi, BreakdownRow, fmtUsd, fmtLocal, fmtMonths, fmtNum } from "@/components/ui/Metrics";
import type { CostBreakdown } from "@/lib/calc/engine";

export function SummaryPanel({
  cost,
  opex,
  totalMonths,
  currencyCode,
  currencySymbol,
  fx,
  buildingGfaM2,
}: {
  cost: CostBreakdown;
  opex: number;
  totalMonths: number;
  currencyCode: string;
  currencySymbol?: string;
  fx: number;
  /** This facility's gross floor area, m² — only set when it has a generated
   * building (see useProjectEditor.ts); shows an all-in $/m² KPI when present. */
  buildingGfaM2?: number | null;
}) {
  return (
    <Panel title="ESTIMATE SUMMARY">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Kpi label="FACILITY SUBTOTAL (USD)" value={fmtUsd(cost.grandTotal)} sub={`${fmtUsd(cost.bandLow)} – ${fmtUsd(cost.bandHigh)}`} />
        <Kpi label={`TOTAL (${currencyCode})`} value={fmtLocal(cost.grandTotal * fx, currencySymbol)} />
        <Kpi label="PROGRAMME DURATION" value={fmtMonths(totalMonths)} />
        <Kpi label="RECURRING OPEX (USD/YR)" value={fmtUsd(opex)} />
        {!!buildingGfaM2 && (
          <Kpi label="COST PER M² (USD, ALL-IN)" value={`${fmtUsd(cost.grandTotal / buildingGfaM2)}/m²`} sub={`at ${fmtNum(buildingGfaM2)} m²`} />
        )}
      </div>
      <BreakdownRow label="Core scope construction" value={fmtUsd(cost.coreConstruction)} />
      <BreakdownRow label="Addon construction (included)" value={fmtUsd(cost.addonConstruction)} />
      <BreakdownRow label="Soft costs" value={fmtUsd(cost.softCosts)} />
      <BreakdownRow label="Escalation / FX buffer" value={fmtUsd(cost.escalation)} />
      <BreakdownRow label="Fast-track premium" value={fmtUsd(cost.fastTrackPremium)} />
      <BreakdownRow label="Contingency" value={fmtUsd(cost.contingency)} />
      <BreakdownRow label="Facility subtotal" value={fmtUsd(cost.grandTotal)} strong />
      <p className="mt-2 text-[10.5px] text-muted">
        <b className="text-ink">Escalation / FX buffer</b> and <b className="text-ink">contingency</b> are different
        reserves, not duplicates: escalation covers the same scope costing more by the time it&apos;s actually built
        (today&apos;s rates, inflated over the schedule below) — contingency covers how early-stage this
        estimate still is, for design and scope that aren&apos;t finalized yet. Both are a % on top of the same
        construction + soft-cost base, which is why each can be large on a long, early-stage estimate.
      </p>
      <p className="mt-2 text-[10.5px] text-muted">
        Land cost, funding and the feasibility verdict are set once for the whole program — see the program page.
      </p>
    </Panel>
  );
}
