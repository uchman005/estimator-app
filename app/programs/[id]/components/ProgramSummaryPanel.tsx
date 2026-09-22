import { Panel } from "@/components/ui/Panel";
import { Kpi, BreakdownRow, fmtUsd, fmtLocal, fmtMonths } from "@/components/ui/Metrics";
import type { FacilityRow } from "./types";

export function ProgramSummaryPanel({
  facilities,
  landCostUsd,
  capex,
  bandLow,
  bandHigh,
  totalMonths,
  currencyCode,
  currencySymbol,
  fx,
  fundingCoverage,
  fundingGap,
}: {
  facilities: FacilityRow[];
  landCostUsd: number;
  capex: number;
  bandLow: number;
  bandHigh: number;
  totalMonths: number;
  currencyCode: string;
  currencySymbol?: string;
  fx: number;
  fundingCoverage: number;
  fundingGap: number;
}) {
  const facilitiesSubtotal = capex - landCostUsd;

  return (
    <Panel title="PROGRAM ESTIMATE SUMMARY">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Kpi label="TOTAL CAPITAL COST (USD)" value={fmtUsd(capex)} sub={`${fmtUsd(bandLow)} – ${fmtUsd(bandHigh)}`} />
        <Kpi label={`TOTAL (${currencyCode})`} value={fmtLocal(capex * fx, currencySymbol)} />
        <Kpi label="SITE PROGRAMME DURATION" value={fmtMonths(totalMonths)} sub="longest facility on the critical path" />
        <Kpi
          label="FUNDING COVERAGE"
          value={`${Math.round(fundingCoverage)}%`}
          sub={fundingGap > 0 ? `gap ${fmtUsd(fundingGap)}` : "fully funded"}
        />
      </div>
      {facilities.map((f) => (
        <BreakdownRow key={f.project.id} label={f.project.name} value={fmtUsd(f.cost.grandTotal)} />
      ))}
      <BreakdownRow label="Facilities subtotal" value={fmtUsd(facilitiesSubtotal)} />
      <BreakdownRow label="Land" value={fmtUsd(landCostUsd)} />
      <BreakdownRow label="Grand total" value={fmtUsd(capex)} strong />
    </Panel>
  );
}
