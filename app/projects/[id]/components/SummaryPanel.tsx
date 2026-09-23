import { Panel } from "@/components/ui/Panel";
import { Kpi, BreakdownRow, fmtUsd, fmtLocal, fmtMonths } from "@/components/ui/Metrics";
import type { CostBreakdown } from "@/lib/calc/engine";

export function SummaryPanel({
  cost,
  opex,
  totalMonths,
  currencyCode,
  currencySymbol,
  fx,
}: {
  cost: CostBreakdown;
  opex: number;
  totalMonths: number;
  currencyCode: string;
  currencySymbol?: string;
  fx: number;
}) {
  return (
    <Panel title="ESTIMATE SUMMARY">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Kpi label="FACILITY SUBTOTAL (USD)" value={fmtUsd(cost.grandTotal)} sub={`${fmtUsd(cost.bandLow)} – ${fmtUsd(cost.bandHigh)}`} />
        <Kpi label={`TOTAL (${currencyCode})`} value={fmtLocal(cost.grandTotal * fx, currencySymbol)} />
        <Kpi label="PROGRAMME DURATION" value={fmtMonths(totalMonths)} />
        <Kpi label="RECURRING OPEX (USD/YR)" value={fmtUsd(opex)} />
      </div>
      <BreakdownRow label="Core scope construction" value={fmtUsd(cost.coreConstruction)} />
      <BreakdownRow label="Addon construction (included)" value={fmtUsd(cost.addonConstruction)} />
      <BreakdownRow label="Soft costs" value={fmtUsd(cost.softCosts)} />
      <BreakdownRow label="Escalation / FX buffer" value={fmtUsd(cost.escalation)} />
      <BreakdownRow label="Fast-track premium" value={fmtUsd(cost.fastTrackPremium)} />
      <BreakdownRow label="Contingency" value={fmtUsd(cost.contingency)} />
      <BreakdownRow label="Facility subtotal" value={fmtUsd(cost.grandTotal)} strong />
      <p className="mt-2 text-[10.5px] text-muted">
        Land cost, funding and the feasibility verdict are set once for the whole program — see the program page.
      </p>
    </Panel>
  );
}
