import { Panel } from "@/components/ui/Panel";
import { Kpi, BreakdownRow, fmtUsd, fmtLocal, fmtMonths, fmtPct, fmtNum, fmtUsdMagnitude, fmtRelativeTime } from "@/components/ui/Metrics";
import { isLiveFxRate } from "@/lib/fx";
import type { ProgramReport } from "@/lib/calc/engine";
import type { FacilityRow } from "./types";

export function ProgramSummaryPanel({
  facilities,
  landCostUsd,
  report,
  currencyCode,
  currencySymbol,
  fx,
  fxFetchedAt,
  fxSource,
  annualRevenueUsd,
  opexProjection,
  opexProjectionYears,
  escalationPct,
}: {
  facilities: FacilityRow[];
  landCostUsd: number;
  report: ProgramReport;
  currencyCode: string;
  currencySymbol?: string;
  fx: number;
  fxFetchedAt: string | null;
  fxSource: string | null;
  annualRevenueUsd: number;
  opexProjection: number;
  opexProjectionYears: number;
  escalationPct: number;
}) {
  const included = facilities.filter((f) => f.project.isIncluded);
  const excludedCount = facilities.length - included.length;
  const facilitiesSubtotal = report.capex - Math.round(landCostUsd);
  const isDeficit = report.operatingBalance < 0;
  const fxIsLive = isLiveFxRate(fxSource);

  return (
    <Panel title="PROGRAM ESTIMATE SUMMARY">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Kpi label="TOTAL CAPITAL COST (USD)" value={fmtUsd(report.capex)} sub={`band: ${fmtUsd(report.bandLow)} – ${fmtUsd(report.bandHigh)}`} />
        <Kpi
          label={`TOTAL (${currencyCode})`}
          value={fmtLocal(report.capex * fx, currencySymbol)}
          sub={`at ${fmtNum(fx)}/USD, ${fxIsLive ? fmtRelativeTime(fxFetchedAt) : "placeholder rate, never fetched"}`}
        />
        <Kpi
          label="SITE PROGRAMME DURATION"
          value={fmtMonths(report.totalMonthsParallel)}
          sub={`up to ${fmtMonths(report.totalMonthsSequential)} if built one at a time`}
        />
        <Kpi
          label="FUNDING COVERAGE"
          value={fmtPct(report.coverage)}
          sub={
            report.surplus > 0
              ? `surplus ${fmtUsd(report.surplus)}`
              : `gap ${fmtUsd(report.gap)} (${fmtUsd(report.gapAtBandHigh)} at upper band)`
          }
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
      <BreakdownRow label="Grand total" value={fmtUsd(report.capex)} strong />
      <BreakdownRow label="Confidence band (−50% / +100%, AACE-class-weighted)" value={`${fmtUsd(report.bandLow)} – ${fmtUsd(report.bandHigh)}`} />

      <h3 className="mb-1 mt-3 text-[10.5px] font-semibold tracking-wide text-blueprint">ANNUAL OPERATING COST</h3>
      {included.map((f) => (
        <BreakdownRow
          key={f.project.id}
          label={f.isItemizedOpex ? f.project.name : `${f.project.name} (est., % of capex)`}
          value={`${fmtUsd(f.opex)}/yr`}
        />
      ))}
      <BreakdownRow label="Total recurring cost" value={`${fmtUsd(report.opex)}/yr`} strong />
      <BreakdownRow label="Confidence band" value={`${fmtUsd(report.opexBandLow)} – ${fmtUsd(report.opexBandHigh)}/yr`} />
      <BreakdownRow label="Annual revenue" value={`${fmtUsd(annualRevenueUsd)}/yr`} />
      <BreakdownRow label={isDeficit ? "Annual deficit" : "Annual surplus"} value={`${fmtUsdMagnitude(report.operatingBalance)}/yr`} strong />

      <h3 className="mb-1 mt-3 text-[10.5px] font-semibold tracking-wide text-blueprint">{opexProjectionYears}-YEAR OPERATING OUTLOOK</h3>
      <BreakdownRow label={`Nominal ${opexProjectionYears}-yr opex (inflating ${fmtNum(escalationPct)}%/yr)`} value={fmtUsd(opexProjection)} />
      <p className="mt-1 text-[10px] text-muted">
        Nominal total only — compounds the program&apos;s escalation rate year over year, not discounted to present value
        (no discount-rate assumption exists in this model).
      </p>
    </Panel>
  );
}
