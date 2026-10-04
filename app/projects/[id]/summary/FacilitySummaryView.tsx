"use client";

import Link from "next/link";
import { useProjectEditor } from "../useProjectEditor";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { fmtUsd, fmtNum } from "@/components/ui/Metrics";
import { BuildingCostBreakdownPanel } from "../components/BuildingCostBreakdownPanel";
import { SummaryPanel } from "../components/SummaryPanel";
import { SchedulePanel } from "../components/SchedulePanel";
import { OPEX_CATEGORY_LABEL, REVENUE_CATEGORY_LABEL } from "../components/types";

// The viewable + printable "operational summary" for a facility — the
// broader, on-screen counterpart to the existing print-only "structural"
// handout (FacilityPrintSummary.tsx, kept as-is for a construction/BOQ-
// focused printout). This page reuses the same already-built, read-only
// panels the editor's right-hand sidebar shows (BuildingCostBreakdownPanel,
// SummaryPanel, SchedulePanel — none of them take event handlers, so they
// drop in unchanged) plus an itemized operating-cost breakdown, all sourced
// from the same useProjectEditor() hook the editor uses — no duplicated
// computation, figures always match.
export default function FacilitySummaryView({ projectId, currentUserEmail }: { projectId: number; currentUserEmail: string }) {
  const s = useProjectEditor(projectId);

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

  if (s.loading || !s.ref || !s.project || !s.program || !s.country || !s.cost || !s.schedule) {
    return (
      <AppShell email={currentUserEmail}>
        <div className="p-10 text-sm text-muted">Loading summary…</div>
      </AppShell>
    );
  }

  const currencySymbol = s.ref.currencies.find((c) => c.code === s.country?.currencyCode)?.symbol;
  const includedOpexItems = s.opexItems.filter((it) => it.isIncluded);
  const includedRevenueItems = s.revenueItems.filter((it) => it.isIncluded);

  return (
    <AppShell email={currentUserEmail}>
      <div className="mx-auto max-w-[900px] px-5 py-6 text-[13px] text-ink">
        <header className="mb-5 flex items-start justify-between gap-4 print:hidden">
          <div className="min-w-0 flex-1">
            <Link href={`/projects/${s.project.id}`} className="text-[11px] text-blueprint underline">
              ← Back to editor
            </Link>
            <h1 className="mt-0.5 text-xl font-bold text-ink">{s.project.name}</h1>
            <p className="mt-1 text-xs text-muted">
              Operational summary · {s.project.facilityType} · {s.program.name} · {s.country.name}
              {s.regionName ? ` — ${s.regionName}` : ""} · cost index {fmtNum(s.costIndex)}
            </p>
          </div>
          <Button variant="ghost" onClick={() => window.print()}>
            Print
          </Button>
        </header>

        <div className="hidden print:block print:mb-4">
          <h1 className="text-xl font-bold">{s.project.name}</h1>
          <p className="text-xs text-black/70">
            Operational summary · {s.project.facilityType} · {s.program.name} · {s.country.name}
            {s.regionName ? ` — ${s.regionName}` : ""} · cost index {fmtNum(s.costIndex)}
          </p>
        </div>

        <div className="space-y-5">
          <SummaryPanel
            cost={s.cost}
            opex={s.opex}
            totalMonths={s.schedule.totalMonths}
            currencyCode={s.country.currencyCode}
            currencySymbol={currencySymbol}
            fx={s.fx}
            buildingGfaM2={s.buildingGfaM2}
          />

          <BuildingCostBreakdownPanel
            items={s.items}
            cost={s.cost}
            costIndex={s.costIndex}
            designFeePct={s.project.designFeePct}
            pmFeePct={s.project.pmFeePct}
            permitFeePct={s.project.permitFeePct}
          />

          <SchedulePanel schedule={s.schedule} />

          <Panel title="RECURRING OPERATING COST" eyebrow={`${fmtUsd(s.opex)}/yr`}>
            {includedOpexItems.length > 0 ? (
              <table className="w-full text-[12px]">
                <tbody>
                  {includedOpexItems.map((it) => (
                    <tr key={it.id} className="border-b border-paper-line">
                      <td className="py-1.5 pr-2">{it.label}</td>
                      <td className="py-1.5 pr-2 text-muted">{OPEX_CATEGORY_LABEL[it.category]}</td>
                      <td className="py-1.5 text-right font-mono">{fmtUsd(it.annualAmountUsd)}/yr</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[11.5px] text-muted">
                No itemized operating-cost rows for this facility — its {fmtUsd(s.opex)}/yr figure is a flat{" "}
                {fmtNum(s.program.opexPctOfCapexPerYear)}% of its own capital cost, not a staffing/utilities/maintenance
                calculation.
              </p>
            )}
          </Panel>

          <Panel title="REVENUE PROJECTION" eyebrow={`${fmtUsd(s.revenue)}/yr`}>
            {includedRevenueItems.length > 0 ? (
              <table className="w-full text-[12px]">
                <tbody>
                  {includedRevenueItems.map((it) => (
                    <tr key={it.id} className="border-b border-paper-line">
                      <td className="py-1.5 pr-2">{it.label}</td>
                      <td className="py-1.5 pr-2 text-muted">{REVENUE_CATEGORY_LABEL[it.category]}</td>
                      <td className="py-1.5 text-right font-mono">{fmtUsd(it.annualAmountUsd)}/yr</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[11.5px] text-muted">
                No revenue sources entered for this facility — assumed to generate $0/yr of its own (typical for a
                vehicle, hub, or other non-revenue-generating facility).
              </p>
            )}
          </Panel>

          <p className="pb-4 text-center text-[10px] text-muted print:text-black/60">
            Generated by Classified Infrastructure Estimator — facility #{s.project.id}, {s.program.name}.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
