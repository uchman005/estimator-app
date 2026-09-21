"use client";

import { useProjectEditor } from "./useProjectEditor";
import { AppShell } from "@/components/AppShell";
import { CountryRegionPanel } from "./components/CountryRegionPanel";
import { AaceClassPanel } from "./components/AaceClassPanel";
import { HospitalGeneratorPanel } from "./components/HospitalGeneratorPanel";
import { BoqPanel } from "./components/BoqPanel";
import { SoftCostsPanel } from "./components/SoftCostsPanel";
import { ScheduleAssumptionsPanel } from "./components/ScheduleAssumptionsPanel";
import { FundingPanel } from "./components/FundingPanel";
import { CollaboratorsPanel } from "./components/CollaboratorsPanel";
import { SummaryPanel } from "./components/SummaryPanel";
import { SchedulePanel } from "./components/SchedulePanel";
import { FeasibilityPanel } from "./components/FeasibilityPanel";

export default function ProjectEditor({ projectId, currentUserEmail }: { projectId: number; currentUserEmail: string }) {
  const s = useProjectEditor(projectId);

  if (s.accessError) {
    return (
      <AppShell email={currentUserEmail}>
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="max-w-sm rounded-xl border border-clay bg-surface p-5 text-center shadow-sm">
            <p className="mb-3 text-sm text-ink">{s.accessError}</p>
            <a href="/" className="text-xs text-blueprint underline">
              ← Back to your projects
            </a>
          </div>
        </div>
      </AppShell>
    );
  }

  if (s.loading || !s.ref || !s.project || !s.settings || !s.cost || !s.schedule || !s.feasibility || !s.country) {
    return (
      <AppShell email={currentUserEmail}>
        <div className="p-10 text-sm text-muted">Loading project…</div>
      </AppShell>
    );
  }

  const currencySymbol = s.ref.currencies.find((c) => c.code === s.country?.currencyCode)?.symbol;
  const canEdit = s.role === "owner" || s.role === "editor";
  const isOwner = s.role === "owner";

  return (
    <AppShell email={currentUserEmail}>
      <div className="mx-auto max-w-[1400px] px-5 py-6 text-[13px] text-ink">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <input
              className="w-full border-none bg-transparent text-xl font-bold text-ink outline-none disabled:cursor-not-allowed"
              value={s.project.name}
              disabled={!canEdit}
              onChange={(e) => s.patchProject({ name: e.target.value })}
            />
            <p className="mt-1 max-w-xl text-xs text-muted">
              UniFormat II classified · project #{s.project.id}
              {s.role && s.role !== "owner" && (
                <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 text-[10px] uppercase">{s.role}</span>
              )}
            </p>
          </div>
          <a href="/" className="whitespace-nowrap text-xs text-blueprint underline">
            ← All projects
          </a>
        </header>

        {s.role === "viewer" && (
          <div className="mb-5 rounded-xl border border-amber bg-surface-alt px-3 py-2 text-[12px] text-ink">
            You have view-only access to this project — changes are disabled.
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
          <fieldset disabled={!canEdit} className="space-y-5 disabled:opacity-70">
            <CountryRegionPanel
              project={s.project}
              countries={s.ref.countries}
              costIndex={s.settings.costIndex}
              fx={s.country.fx}
              fxFetchedAt={s.country.fxFetchedAt}
              fxSource={s.country.fxSource}
              fxStatus={s.fxStatus}
              fxBusy={s.fxBusy}
              onChangeCountry={(countryId) => s.patchProject({ countryId, regionId: null })}
              onChangeRegion={(regionId) => s.patchProject({ regionId })}
              onRefreshFx={s.refreshFx}
            />

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
              costIndex={s.settings.costIndex}
              coreSubtotal={s.cost.coreConstruction}
              addonSubtotal={s.cost.addonConstruction}
              onChangeItem={s.patchItem}
              onDeleteItem={s.deleteItem}
              onAddItem={s.addItem}
            />

            <SoftCostsPanel project={s.project} onChange={s.patchProject} />
            <ScheduleAssumptionsPanel project={s.project} onChange={s.patchProject} />
            <FundingPanel project={s.project} onChange={s.patchProject} />

            {isOwner && (
              <CollaboratorsPanel
                collaborators={s.collaborators}
                onInvite={s.inviteCollaborator}
                onChangeRole={s.changeCollaboratorRole}
                onRemove={s.removeCollaborator}
              />
            )}
          </fieldset>

          <div className="space-y-5 lg:sticky lg:top-5">
            <SummaryPanel
              cost={s.cost}
              totalMonths={s.schedule.totalMonths}
              currencyCode={s.country.currencyCode}
              currencySymbol={currencySymbol}
              fx={s.country.fx}
              fundingCoverage={s.feasibility.coverage}
              fundingGap={s.feasibility.gap}
            />
            <SchedulePanel schedule={s.schedule} />
            <FeasibilityPanel feasibility={s.feasibility} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
