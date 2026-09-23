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
  opex,
  annualRevenueUsd,
  operatingBalance,
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
  opex: number;
  annualRevenueUsd: number;
  operatingBalance: number;
}) {
  const included = facilities.filter((f) => f.project.isIncluded);
  const excludedCount = facilities.length - included.length;
  const facilitiesSubtotal = capex - landCostUsd;
  const isDeficit = operatingBalance < 0;

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

      {excludedCount > 0 && (
        <p className="mb-2 text-[10.5px] text-amber">
          {excludedCount} facilit{excludedCount === 1 ? "y" : "ies"} toggled off — excluded from every total below.
        </p>
      )}

      <h3 className="mb-1 mt-1 text-[10.5px] font-semibold tracking-wide text-blueprint">CAPITAL COST</h3>
      {included.map((f) => (
        <BreakdownRow key={f.project.id} label={f.project.name} value={fmtUsd(f.cost.grandTotal)} />
      ))}
      <BreakdownRow label="Facilities subtotal" value={fmtUsd(facilitiesSubtotal)} />
      <BreakdownRow label="Land" value={fmtUsd(landCostUsd)} />
      <BreakdownRow label="Grand total" value={fmtUsd(capex)} strong />

      <h3 className="mb-1 mt-3 text-[10.5px] font-semibold tracking-wide text-blueprint">ANNUAL OPERATING COST</h3>
      {included.map((f) => (
        <BreakdownRow key={f.project.id} label={f.project.name} value={`${fmtUsd(f.opex)}/yr`} />
      ))}
      <BreakdownRow label="Total recurring cost" value={`${fmtUsd(opex)}/yr`} />
      <BreakdownRow label="Annual revenue" value={`${fmtUsd(annualRevenueUsd)}/yr`} />
      <BreakdownRow
        label={isDeficit ? "Annual deficit" : "Annual surplus"}
        value={`${isDeficit ? "−" : "+"}${fmtUsd(Math.abs(operatingBalance))}/yr`}
        strong
      />
    </Panel>
  );
}
