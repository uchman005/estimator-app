import { fmtUsd, fmtLocal, fmtMonths, fmtPct, fmtNum, fmtUsdMagnitude, fmtRelativeTime } from "@/components/ui/Metrics";
import { PrintPage, PrintHeader, PrintSection, PrintRow, PrintTable, PrintFooter } from "@/components/ui/PrintSummary";
import { isLiveFxRate } from "@/lib/fx";
import type { ProgramReport } from "@/lib/calc/engine";
import { VERDICT_COPY } from "./FeasibilityPanel";
import type { FacilityRow, ProgramRow } from "./types";

// The curated, print-only view of a program — every facility's headline
// numbers plus the program-level capital/funding/feasibility picture, not
// the editable panels (no country/region pickers, no collaborator
// management, no per-facility add/toggle controls). Hidden on screen,
// shown only in @media print — see .print-summary in app/globals.css.
export function ProgramPrintSummary({
  program,
  countryName,
  regionName,
  facilities,
  report,
  currencyCode,
  currencySymbol,
  fx,
  fxFetchedAt,
  fxSource,
  opexProjection,
  opexProjectionYears,
}: {
  program: ProgramRow;
  countryName: string;
  regionName: string | null;
  facilities: FacilityRow[];
  report: ProgramReport;
  currencyCode: string;
  currencySymbol?: string;
  fx: number;
  fxFetchedAt: string | null;
  fxSource: string | null;
  opexProjection: number;
  opexProjectionYears: number;
}) {
  const included = facilities.filter((f) => f.project.isIncluded);
  const facilitiesSubtotal = report.capex - Math.round(program.landCostUsd);
  const verdict = VERDICT_COPY[report.verdict](report);
  const isDeficit = report.operatingBalance < 0;
  const fxIsLive = isLiveFxRate(fxSource);
  const printedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <PrintPage>
      <PrintHeader
        title={program.name}
        subtitle="Program Summary"
        meta={[
          `${countryName}${regionName ? ` — ${regionName}` : ""}`,
          `${facilities.length} ${facilities.length === 1 ? "facility" : "facilities"}`,
          `printed ${printedAt}`,
        ]}
      />

      <PrintSection title="Facilities">
        <PrintTable
          columns={[
            { label: "Facility" },
            { label: "Type" },
            { label: "Cost (USD)", align: "right" },
            { label: "Opex/yr", align: "right" },
            { label: "Duration", align: "right" },
            { label: "Included", align: "right" },
          ]}
          rows={facilities.map((f) => [
            f.project.name,
            f.project.facilityType,
            fmtUsd(f.cost.grandTotal),
            `${fmtUsd(f.opex)}/yr${f.isItemizedOpex ? "" : " (est.)"}`,
            fmtMonths(f.schedule.totalMonths),
            f.project.isIncluded ? "✓" : "—",
          ])}
        />
        <p className="mt-1 text-[9px] text-black/60">
          &quot;(est.)&quot; = this facility has no itemized operating-cost rows, so its figure is a flat{" "}
          {fmtNum(program.opexPctOfCapexPerYear)}% of its own capital cost, not a staffing/utilities/maintenance calculation.
        </p>
      </PrintSection>

      <PrintSection title="Capital cost">
        {included.map((f) => (
          <PrintRow key={f.project.id} label={f.project.name} value={fmtUsd(f.cost.grandTotal)} />
        ))}
        <PrintRow label="Facilities subtotal" value={fmtUsd(facilitiesSubtotal)} />
        <PrintRow label="Land" value={fmtUsd(program.landCostUsd)} />
        <PrintRow label="Grand total (USD)" value={fmtUsd(report.capex)} strong />
        <PrintRow label="Confidence band (−50% / +100%, AACE-class-weighted)" value={`${fmtUsd(report.bandLow)} – ${fmtUsd(report.bandHigh)}`} />
        <PrintRow
          label={`Total (${currencyCode}), at ${fmtNum(fx)}/USD`}
          value={fmtLocal(report.capex * fx, currencySymbol)}
        />
        <PrintRow
          label={`${currencyCode} confidence band`}
          value={`${fmtLocal(report.bandLow * fx, currencySymbol)} – ${fmtLocal(report.bandHigh * fx, currencySymbol)}`}
        />
        <p className="text-[9px] text-black/60">
          FX rate {fxIsLive ? `fetched ${fmtRelativeTime(fxFetchedAt)}` : "is a placeholder — never fetched live"}.
        </p>
        <PrintRow label="Site programme duration (parallel build)" value={fmtMonths(report.totalMonthsParallel)} />
        <PrintRow label="Site programme duration (sequential build)" value={fmtMonths(report.totalMonthsSequential)} />
      </PrintSection>

      <PrintSection title="Funding & feasibility">
        <PrintRow label="Proposed / committed funding" value={fmtUsd(program.fundedUsd)} />
        <PrintRow label="Funding coverage (at point estimate)" value={fmtPct(report.coverage)} />
        <PrintRow label="Funding coverage (at upper band)" value={fmtPct(report.coverageAtBandHigh)} />
        {report.surplus > 0 ? (
          <PrintRow label="Capital surplus" value={fmtUsd(report.surplus)} />
        ) : (
          <>
            <PrintRow label="Funding gap (at point estimate)" value={fmtUsd(report.gap)} />
            <PrintRow label="Funding gap (at upper band)" value={fmtUsd(report.gapAtBandHigh)} />
          </>
        )}
        <PrintRow label="Annual revenue" value={`${fmtUsd(program.annualRevenueUsd)}/yr`} />
        <PrintRow label="Annual operating cost" value={`${fmtUsd(report.opex)}/yr`} />
        <PrintRow label="Operating cost confidence band" value={`${fmtUsd(report.opexBandLow)} – ${fmtUsd(report.opexBandHigh)}/yr`} />
        <PrintRow label={isDeficit ? "Annual deficit" : "Annual surplus"} value={`${fmtUsdMagnitude(report.operatingBalance)}/yr`} strong />
        <PrintRow
          label="Operating balance range"
          value={`${fmtUsdMagnitude(report.operatingBalanceAtBandLow)} – ${fmtUsdMagnitude(report.operatingBalanceAtBandHigh)}/yr`}
        />
        <PrintRow label="Revenue/opex ratio" value={fmtPct(report.sustainabilityRatio)} />
        {report.fundingRunwayYears >= 1 && (
          <PrintRow label="Funding runway from capital surplus" value={`≈ ${fmtNum(report.fundingRunwayYears)} years`} strong />
        )}
        <div className="mt-2 border border-black/40 p-2">
          <div className="text-[11px] font-bold">{verdict.title}</div>
          <div className="mt-0.5 text-[10px]">{verdict.desc}</div>
        </div>
      </PrintSection>

      <PrintSection title={`${opexProjectionYears}-year operating outlook`}>
        <PrintRow label={`Nominal ${opexProjectionYears}-yr opex (inflating ${fmtNum(program.escalationPct)}%/yr)`} value={fmtUsd(opexProjection)} />
        <p className="text-[9px] text-black/60">
          Nominal total only — not discounted to present value (no discount-rate assumption exists in this model).
        </p>
      </PrintSection>

      <PrintFooter text={`Generated by Classified Infrastructure Estimator — program #${program.id}.`} />
    </PrintPage>
  );
}
