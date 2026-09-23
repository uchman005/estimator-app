"use client";

import Link from "next/link";
import { useProjectEditor } from "./useProjectEditor";
import { AppShell } from "@/components/AppShell";
import { AaceClassPanel } from "./components/AaceClassPanel";
import { HospitalGeneratorPanel } from "./components/HospitalGeneratorPanel";
import { BoqPanel } from "./components/BoqPanel";
import { SoftCostsPanel } from "./components/SoftCostsPanel";
import { ScheduleAssumptionsPanel } from "./components/ScheduleAssumptionsPanel";
import { OperatingCostsPanel } from "./components/OperatingCostsPanel";
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

  if (s.loading || !s.ref || !s.project || !s.program || !s.country || !s.settings || !s.cost || !s.schedule) {
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
              UniFormat II classified · facility #{s.project.id} · {s.country.name}, cost index {s.costIndex.toFixed(3)} (set on
              the program)
              {s.role && s.role !== "owner" && (
                <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 text-[10px] uppercase">{s.role}</span>
              )}
            </p>
          </div>
        </header>

        {s.role === "viewer" && (
          <div className="mb-5 rounded-xl border border-amber bg-surface-alt px-3 py-2 text-[12px] text-ink">
            You have view-only access to this facility — changes are disabled.
          </div>
        )}
        {!s.project.isIncluded && (
          <div className="mb-5 rounded-xl border border-clay bg-surface-alt px-3 py-2 text-[12px] text-ink">
            This facility is toggled <b>out</b> of the program&apos;s totals — its cost and opex aren&apos;t counted toward
            the program&apos;s feasibility right now. Toggle it back on from the program&apos;s Facilities panel.
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
          <fieldset disabled={!canEdit} className="space-y-5 disabled:opacity-70">
            <AaceClassPanel
              classes={s.ref.aaceClasses}
              selected={s.project.aaceClass}
              onSelect={(aaceClass, contingencyPct) => s.patchProject({ aaceClass, contingencyPctOverride: contingencyPct })}
            />

            <HospitalGeneratorPanel onGenerate={s.runGenerator} info={s.genInfo} busy={s.genBusy} />

            <BoqPanel
              items={s.items}
              assemblyById={s.assemblyById}
              groupedAssemblies={s.groupedAssemblies}
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
          </fieldset>

          <div className="space-y-5 lg:sticky lg:top-5">
            <SummaryPanel
              cost={s.cost}
              opex={s.opex}
              totalMonths={s.schedule.totalMonths}
              currencyCode={s.country.currencyCode}
              currencySymbol={currencySymbol}
              fx={s.fx}
            />
            <SchedulePanel schedule={s.schedule} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
