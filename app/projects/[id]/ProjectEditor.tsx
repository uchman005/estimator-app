"use client";

import Link from "next/link";
import { useProjectEditor } from "./useProjectEditor";
import { AppShell } from "@/components/AppShell";
import { fmtNum } from "@/components/ui/Metrics";
import { SaveStatusBadge } from "@/components/ui/SaveStatusBadge";
import { Button } from "@/components/ui/Button";
import { FacilityPrintSummary } from "./components/FacilityPrintSummary";
import { AaceClassPanel } from "./components/AaceClassPanel";
import { BuildingTemplatePanel } from "./components/BuildingTemplatePanel";
import { BuildingCostBreakdownPanel } from "./components/BuildingCostBreakdownPanel";
import { BoqPanel } from "./components/BoqPanel";
import { SoftCostsPanel } from "./components/SoftCostsPanel";
import { ScheduleAssumptionsPanel } from "./components/ScheduleAssumptionsPanel";
import { OperatingCostsPanel } from "./components/OperatingCostsPanel";
import { RevenueProjectionPanel } from "./components/RevenueProjectionPanel";
import { SummaryPanel } from "./components/SummaryPanel";
import { SchedulePanel } from "./components/SchedulePanel";

export default function ProjectEditor({ projectId, currentUserEmail }: { projectId: number; currentUserEmail: string }) {
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

  if (s.loading || !s.ref || !s.project || !s.program || !s.country || !s.settings || !s.cost || !s.schedule || !s.aace) {
    return (
      <AppShell email={currentUserEmail}>
        <div className="p-10 text-sm text-muted">Loading facility…</div>
      </AppShell>
    );
  }

  const currencySymbol = s.ref.currencies.find((c) => c.code === s.country?.currencyCode)?.symbol;
  const canEdit = s.role === "owner" || s.role === "editor";

  return (
    <AppShell email={currentUserEmail}>
      <div className="mx-auto max-w-[1400px] px-5 py-6 text-[13px] text-ink">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <Link href={`/programs/${s.program.id}`} className="text-[11px] text-blueprint underline">
              ← {s.program.name}
            </Link>
            <input
              className="mt-0.5 w-full border-none bg-transparent text-xl font-bold text-ink outline-none disabled:cursor-not-allowed"
              value={s.project.name}
              disabled={!canEdit}
              onChange={(e) => s.patchProject({ name: e.target.value })}
            />
            <p className="mt-1 max-w-xl text-xs text-muted">
              UniFormat II classified · facility #{s.project.id} · {s.country.name}, cost index {fmtNum(s.costIndex)} (set on
              the program)
              {s.role && s.role !== "owner" && (
                <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 text-[10px] uppercase">{s.role}</span>
              )}
              <SaveStatusBadge status={s.saveStatus} className="ml-2" />
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 print:hidden">
            <Link
              href={`/projects/${s.project.id}/summary`}
              className="whitespace-nowrap rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-muted shadow-sm transition-colors hover:border-blueprint hover:text-blueprint"
            >
              Operational summary
            </Link>
            <Button variant="ghost" onClick={() => window.print()}>
              Print structural summary
            </Button>
          </div>
        </header>

        {s.role === "viewer" && (
          <div className="mb-5 rounded-xl border border-amber bg-surface-alt px-3 py-2 text-[12px] text-ink print:hidden">
            You have view-only access to this facility — changes are disabled.
          </div>
        )}
        {!s.project.isIncluded && (
          <div className="mb-5 rounded-xl border border-clay bg-surface-alt px-3 py-2 text-[12px] text-ink print:hidden">
            This facility is toggled <b>out</b> of the program&apos;s totals — its cost and opex aren&apos;t counted toward
            the program&apos;s feasibility right now. Toggle it back on from the program&apos;s Facilities panel.
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 print:hidden lg:grid-cols-[1.55fr_1fr]">
          <fieldset disabled={!canEdit} className="space-y-5 disabled:opacity-70">
            <AaceClassPanel
              classes={s.ref.aaceClasses}
              selected={s.project.aaceClass}
              onSelect={(aaceClass, contingencyPct) => s.patchProject({ aaceClass, contingencyPctOverride: contingencyPct })}
            />

            <BuildingTemplatePanel templates={s.ref.buildingTemplates} onGenerate={s.generateBuilding} info={s.genInfo} busy={s.genBusy} />

            <BoqPanel
              items={s.items}
              costIndex={s.costIndex}
              coreSubtotal={s.cost.coreConstruction}
              addonSubtotal={s.cost.addonConstruction}
              onChangeItem={s.patchItem}
              onDeleteItem={s.deleteItem}
              onAddItem={s.addItem}
            />

            <SoftCostsPanel project={s.project} onChange={s.patchProject} />
            <ScheduleAssumptionsPanel project={s.project} onChange={s.patchProject} />

            <OperatingCostsPanel
              items={s.opexItems}
              opexPctOfCapexPerYear={s.program.opexPctOfCapexPerYear}
              autoEstimate={s.autoOpexEstimate}
              onAdd={s.addOpexItem}
              onChange={s.patchOpexItem}
              onDelete={s.deleteOpexItem}
            />

            <RevenueProjectionPanel
              items={s.revenueItems}
              onAdd={s.addRevenueItem}
              onChange={s.patchRevenueItem}
              onDelete={s.deleteRevenueItem}
            />
          </fieldset>

          <div className="space-y-5 lg:sticky lg:top-5">
            <BuildingCostBreakdownPanel
              items={s.items}
              cost={s.cost}
              costIndex={s.costIndex}
              designFeePct={s.project.designFeePct}
              pmFeePct={s.project.pmFeePct}
              permitFeePct={s.project.permitFeePct}
            />
            <SummaryPanel
              cost={s.cost}
              opex={s.opex}
              totalMonths={s.schedule.totalMonths}
              currencyCode={s.country.currencyCode}
              currencySymbol={currencySymbol}
              fx={s.fx}
              buildingGfaM2={s.buildingGfaM2}
            />
            <SchedulePanel schedule={s.schedule} />
          </div>
        </div>

        {canEdit && (
          <div className="mt-5 flex items-center justify-center gap-3 border-t border-paper-line pt-5 print:hidden">
            <Button variant="primary" onClick={s.saveProgress}>
              Save progress
            </Button>
            <SaveStatusBadge status={s.saveStatus} />
          </div>
        )}

        <FacilityPrintSummary
          project={s.project}
          programName={s.program.name}
          countryName={s.country.name}
          regionName={s.regionName}
          costIndex={s.costIndex}
          aace={s.aace}
          cost={s.cost}
          schedule={s.schedule}
          opex={s.opex}
          buildingGfaM2={s.buildingGfaM2}
          items={s.items}
          currencyCode={s.country.currencyCode}
          currencySymbol={currencySymbol}
          fx={s.fx}
        />
      </div>
    </AppShell>
  );
}
