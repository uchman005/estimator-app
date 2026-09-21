import { Panel } from "@/components/ui/Panel";
import { Kpi, BreakdownRow, fmtUsd, fmtLocal, fmtMonths } from "@/components/ui/Metrics";
import type { CostBreakdown } from "@/lib/calc/engine";

export function SummaryPanel({
  cost,
  totalMonths,
  currencyCode,
  currencySymbol,
  fx,
  fundingCoverage,
  fundingGap,
}: {
  cost: CostBreakdown;
  totalMonths: number;
  currencyCode: string;
  currencySymbol?: string;
  fx: number;
  fundingCoverage: number;
  fundingGap: number;
}) {
  return (
    <Panel title="ESTIMATE SUMMARY">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Kpi label="TOTAL CAPITAL COST (USD)" value={fmtUsd(cost.grandTotal)} sub={`${fmtUsd(cost.bandLow)} – ${fmtUsd(cost.bandHigh)}`} />
        <Kpi label={`TOTAL (${currencyCode})`} value={fmtLocal(cost.grandTotal * fx, currencySymbol)} />
        <Kpi label="PROGRAMME DURATION" value={fmtMonths(totalMonths)} />
        <Kpi
          label="FUNDING COVERAGE"
          value={`${Math.round(fundingCoverage)}%`}
          sub={fundingGap > 0 ? `gap ${fmtUsd(fundingGap)}` : "fully funded"}
        />
      </div>
      <BreakdownRow label="Core scope construction" value={fmtUsd(cost.coreConstruction)} />
      <BreakdownRow label="Addon construction (included)" value={fmtUsd(cost.addonConstruction)} />
      <BreakdownRow label="Soft costs" value={fmtUsd(cost.softCosts)} />
      <BreakdownRow label="Escalation / FX buffer" value={fmtUsd(cost.escalation)} />
      <BreakdownRow label="Fast-track premium" value={fmtUsd(cost.fastTrackPremium)} />
      <BreakdownRow label="Land" value={fmtUsd(cost.land)} />
      <BreakdownRow label="Contingency" value={fmtUsd(cost.contingency)} />
      <BreakdownRow label="Grand total" value={fmtUsd(cost.grandTotal)} strong />
    </Panel>
  );
}
