"use client";

import Link from "next/link";
import { useProgramEditor } from "../useProgramEditor";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import {
  Kpi,
  BreakdownRow,
  fmtUsd,
  fmtLocal,
  fmtMonths,
  fmtPct,
  fmtNum,
  fmtUsdMagnitude,
  fmtRelativeTime,
} from "@/components/ui/Metrics";
import { isLiveFxRate } from "@/lib/fx";
import { VERDICT_COPY } from "../components/FeasibilityPanel";
import { CashFlowChart } from "../components/CashFlowChart";
import { CashRunwayChart } from "../components/CashRunwayChart";

// The viewable + printable program summary — everything a stakeholder needs
// in one read-only page: facility-by-facility cost/opex/duration, the
// program's capital and operating totals with confidence bands, and the
// funding/feasibility verdict. Pulls from the same useProgramEditor() hook
// as the editor page, so every figure matches it exactly with no duplicated
// computation. Replaces the old hidden-on-screen ProgramPrintSummary — this
// page itself is what you view AND print (window.print() below; AppShell's
// sidebar already carries print:hidden, so printing this page shows only
// its content).
export default function ProgramSummaryView({ programId, currentUserEmail }: { programId: number; currentUserEmail: string }) {
  const s = useProgramEditor(programId);

  if (s.accessError) {
    return (
      <AppShell email={currentUserEmail}>
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="max-w-sm rounded-xl border border-clay bg-surface p-5 text-center shadow-sm">
            <p className="mb-3 text-sm text-ink">{s.accessError}</p>
            <Link href="/" className="text-xs text-blueprint underline">
              ← Back to your programs
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  if (s.loading || !s.ref || !s.program || !s.report || !s.country) {
    return (
      <AppShell email={currentUserEmail}>
        <div className="p-10 text-sm text-muted">Loading summary…</div>
      </AppShell>
    );
  }

  const currencySymbol = s.ref.currencies.find((c) => c.code === s.country?.currencyCode)?.symbol;
  const included = s.facilities.filter((f) => f.project.isIncluded);
  const facilitiesSubtotal = s.report.capex - Math.round(s.program.landCostUsd);
  const verdict = VERDICT_COPY[s.report.verdict](s.report);
  const isDeficit = s.report.operatingBalance < 0;
  const fxIsLive = isLiveFxRate(s.country.fxSource);

  return (
    <AppShell email={currentUserEmail}>
      <div className="mx-auto max-w-[900px] px-5 py-6 text-[13px] text-ink">
        <header className="mb-5 flex items-start justify-between gap-4 print:hidden">
          <div className="min-w-0 flex-1">
            <Link href={`/programs/${s.program.id}`} className="text-[11px] text-blueprint underline">
              ← Back to editor
            </Link>
            <h1 className="mt-0.5 text-xl font-bold text-ink">{s.program.name}</h1>
            <p className="mt-1 text-xs text-muted">
              Program summary · {s.country.name}
              {s.region?.name ? ` — ${s.region.name}` : ""} · {s.facilities.length}{" "}
              {s.facilities.length === 1 ? "facility" : "facilities"}
            </p>
          </div>
          <Button variant="ghost" onClick={() => window.print()}>
            Print
          </Button>
        </header>

        <div className="hidden print:block print:mb-4">
          <h1 className="text-xl font-bold">{s.program.name}</h1>
          <p className="text-xs text-black/70">
            Program summary · {s.country.name}
            {s.region?.name ? ` — ${s.region.name}` : ""} · {s.facilities.length}{" "}
            {s.facilities.length === 1 ? "facility" : "facilities"}
          </p>
        </div>

        <div className="space-y-5">
          <Panel title="HEADLINE NUMBERS">
            <div className="grid grid-cols-2 gap-2">
              <Kpi label="TOTAL CAPITAL COST (USD)" value={fmtUsd(s.report.capex)} sub={`band: ${fmtUsd(s.report.bandLow)} – ${fmtUsd(s.report.bandHigh)}`} />
              <Kpi
                label={`TOTAL (${s.country.currencyCode})`}
                value={fmtLocal(s.report.capex * s.country.fx, currencySymbol)}
                sub={`at ${fmtNum(s.country.fx)}/USD, ${fxIsLive ? fmtRelativeTime(s.country.fxFetchedAt) : "placeholder rate"}`}
              />
              <Kpi
                label="SITE PROGRAMME DURATION"
                value={fmtMonths(s.report.totalMonthsParallel)}
                sub={`up to ${fmtMonths(s.report.totalMonthsSequential)} if built one at a time`}
              />
              <Kpi
                label="FUNDING COVERAGE"
                value={fmtPct(s.report.coverage)}
                sub={s.report.surplus > 0 ? `surplus ${fmtUsd(s.report.surplus)}` : `gap ${fmtUsd(s.report.gap)}`}
              />
              <Kpi label="ANNUAL OPERATING COST" value={`${fmtUsd(s.report.opex)}/yr`} sub={`band: ${fmtUsd(s.report.opexBandLow)} – ${fmtUsd(s.report.opexBandHigh)}`} />
              <Kpi
                label={isDeficit ? "ANNUAL DEFICIT" : "ANNUAL SURPLUS"}
                value={`${fmtUsdMagnitude(s.report.operatingBalance)}/yr`}
                sub={`revenue/opex ratio ${fmtPct(s.report.sustainabilityRatio)}`}
              />
            </div>
          </Panel>

          <Panel title="FACILITIES">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-paper-line text-left text-[10px] uppercase text-muted">
                  <th className="py-1 pr-2 font-semibold">Facility</th>
                  <th className="py-1 pr-2 font-semibold">Type</th>
                  <th className="py-1 pr-2 text-right font-semibold">Cost (USD)</th>
                  <th className="py-1 pr-2 text-right font-semibold">Opex/yr</th>
                  <th className="py-1 pr-2 text-right font-semibold">Revenue/yr</th>
                  <th className="py-1 pr-2 text-right font-semibold">Duration</th>
                  <th className="py-1 text-right font-semibold">Included</th>
                </tr>
              </thead>
              <tbody>
                {s.facilities.map((f) => (
                  <tr key={f.project.id} className="border-b border-paper-line/60">
                    <td className="py-1 pr-2">
                      <Link href={`/projects/${f.project.id}`} className="text-blueprint underline">
                        {f.project.name}
                      </Link>
                    </td>
                    <td className="py-1 pr-2">{f.project.facilityType}</td>
                    <td className="py-1 pr-2 text-right font-mono">{fmtUsd(f.cost.grandTotal)}</td>
                    <td className="py-1 pr-2 text-right font-mono">
                      {fmtUsd(f.opex)}/yr{!f.isItemizedOpex && " (est.)"}
                    </td>
                    <td className="py-1 pr-2 text-right font-mono">{fmtUsd(f.revenue)}/yr</td>
                    <td className="py-1 pr-2 text-right font-mono">{fmtMonths(f.schedule.totalMonths)}</td>
                    <td className="py-1 text-right">{f.project.isIncluded ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-[10.5px] text-muted">
              &quot;(est.)&quot; = this facility has no itemized operating-cost rows, so its figure is a flat{" "}
              {fmtNum(s.program.opexPctOfCapexPerYear)}% of its own capital cost, not a staffing/utilities/maintenance
              calculation.
            </p>
          </Panel>

          <Panel title="CAPITAL COST">
            {included.map((f) => (
              <BreakdownRow key={f.project.id} label={f.project.name} value={fmtUsd(f.cost.grandTotal)} />
            ))}
            <BreakdownRow label="Facilities subtotal" value={fmtUsd(facilitiesSubtotal)} />
            <BreakdownRow label="Land" value={fmtUsd(s.program.landCostUsd)} />
            <BreakdownRow label="Grand total" value={fmtUsd(s.report.capex)} strong />
            <BreakdownRow label="Confidence band (−50% / +100%, AACE-class-weighted)" value={`${fmtUsd(s.report.bandLow)} – ${fmtUsd(s.report.bandHigh)}`} />
            <p className="mt-2 text-[10.5px] text-muted">
              FX rate {fxIsLive ? `fetched ${fmtRelativeTime(s.country.fxFetchedAt)}` : "is a placeholder — never fetched live"}.
            </p>
          </Panel>

          <Panel title="ANNUAL REVENUE">
            {s.report.revenueIsOverridden ? (
              <BreakdownRow label="Program-wide override" value={`${fmtUsd(s.report.revenue)}/yr`} />
            ) : (
              included.map((f) => <BreakdownRow key={f.project.id} label={f.project.name} value={`${fmtUsd(f.revenue)}/yr`} />)
            )}
            <BreakdownRow label="Total revenue" value={`${fmtUsd(s.report.revenue)}/yr`} strong />
            {s.report.revenueIsOverridden && (
              <p className="mt-2 text-[10.5px] text-muted">
                Set as a flat program-wide override — see the Funding panel on the editor page. Remove it (set to 0) to
                use the sum of each facility&apos;s own itemized revenue sources instead.
              </p>
            )}
          </Panel>

          <Panel title="FUNDING & FEASIBILITY">
            <BreakdownRow label="Proposed / committed funding" value={fmtUsd(s.program.fundedUsd)} />
            <BreakdownRow label="Funding coverage (at point estimate)" value={fmtPct(s.report.coverage)} />
            <BreakdownRow label="Funding coverage (at upper band)" value={fmtPct(s.report.coverageAtBandHigh)} />
            {s.report.surplus > 0 ? (
              <BreakdownRow label="Capital surplus" value={fmtUsd(s.report.surplus)} />
            ) : (
              <>
                <BreakdownRow label="Funding gap (at point estimate)" value={fmtUsd(s.report.gap)} />
                <BreakdownRow label="Funding gap (at upper band)" value={fmtUsd(s.report.gapAtBandHigh)} />
              </>
            )}
            <BreakdownRow label="Annual revenue" value={`${fmtUsd(s.report.revenue)}/yr`} />
            {s.report.revenueIsOverridden && (
              <p className="text-[10px] text-muted">Set as a flat program-wide override, not the sum of facility revenue.</p>
            )}
            <BreakdownRow label="Annual operating cost" value={`${fmtUsd(s.report.opex)}/yr`} />
            <BreakdownRow label={isDeficit ? "Annual deficit" : "Annual surplus"} value={`${fmtUsdMagnitude(s.report.operatingBalance)}/yr`} strong />
            {s.report.fundingRunwayYears >= 1 && (
              <BreakdownRow label="Funding runway from capital surplus" value={`≈ ${fmtNum(s.report.fundingRunwayYears)} years`} strong />
            )}
            <div className="mt-3 border-l-4 bg-paper-warm p-2.5" style={{ borderColor: verdict.color }}>
              <div className="text-[13px] font-bold">{verdict.title}</div>
              <div className="mt-0.5 text-[11.5px] text-muted">{verdict.desc}</div>
            </div>
          </Panel>

          <CashFlowChart years={s.cashFlow} />
          <CashRunwayChart years={s.cashFlow} />

          <Panel title={`${s.opexProjectionYears}-YEAR OPERATING OUTLOOK`}>
            <BreakdownRow
              label={`Nominal ${s.opexProjectionYears}-yr opex (inflating ${fmtNum(s.program.escalationPct)}%/yr)`}
              value={fmtUsd(s.opexProjection)}
            />
            <p className="mt-1 text-[10px] text-muted">
              Nominal total only — not discounted to present value (no discount-rate assumption exists in this model).
            </p>
          </Panel>

          <p className="pb-4 text-center text-[10px] text-muted print:text-black/60">
            Generated by Classified Infrastructure Estimator — program #{s.program.id}.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
