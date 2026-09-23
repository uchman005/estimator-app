"use client";

import Link from "next/link";
import { useProgramEditor } from "./useProgramEditor";
import { AppShell } from "@/components/AppShell";
import { CountryRegionPanel } from "./components/CountryRegionPanel";
import { FacilitiesPanel } from "./components/FacilitiesPanel";
import { FundingPanel } from "./components/FundingPanel";
import { CollaboratorsPanel } from "./components/CollaboratorsPanel";
import { ProgramSummaryPanel } from "./components/ProgramSummaryPanel";
import { FeasibilityPanel } from "./components/FeasibilityPanel";

export default function ProgramEditor({ programId, currentUserEmail }: { programId: number; currentUserEmail: string }) {
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

  if (s.loading || !s.ref || !s.program || !s.feasibility || !s.country) {
    return (
      <AppShell email={currentUserEmail}>
        <div className="p-10 text-sm text-muted">Loading program…</div>
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
              value={s.program.name}
              disabled={!canEdit}
              onChange={(e) => s.patchProgram({ name: e.target.value })}
            />
            <p className="mt-1 max-w-xl text-xs text-muted">
              Program #{s.program.id} · {s.facilities.length} {s.facilities.length === 1 ? "facility" : "facilities"}
              {s.role && s.role !== "owner" && (
                <span className="ml-2 rounded-md border border-border px-1.5 py-0.5 text-[10px] uppercase">{s.role}</span>
              )}
            </p>
          </div>
          <Link href="/" className="whitespace-nowrap text-xs text-blueprint underline">
            ← All programs
          </Link>
        </header>

        {s.role === "viewer" && (
          <div className="mb-5 rounded-xl border border-amber bg-surface-alt px-3 py-2 text-[12px] text-ink">
            You have view-only access to this program — changes are disabled.
          </div>
        )}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
          <fieldset disabled={!canEdit} className="space-y-5 disabled:opacity-70">
            <CountryRegionPanel
              program={s.program}
              countries={s.ref.countries}
              costIndex={s.costIndex}
              fx={s.country.fx}
              fxFetchedAt={s.country.fxFetchedAt}
              fxSource={s.country.fxSource}
              fxStatus={s.fxStatus}
              fxBusy={s.fxBusy}
              onChangeCountry={(countryId) => s.patchProgram({ countryId, regionId: null })}
              onChangeRegion={(regionId) => s.patchProgram({ regionId })}
              onRefreshFx={s.refreshFx}
            />

            <FacilitiesPanel
              facilities={s.facilities}
              canDelete={isOwner}
              onAdd={s.addFacility}
              onChangePhase={s.changeFacilityPhase}
              onToggleIncluded={s.toggleFacilityIncluded}
              onDelete={s.deleteFacility}
            />

            <FundingPanel program={s.program} onChange={s.patchProgram} />

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
            <ProgramSummaryPanel
              facilities={s.facilities}
              landCostUsd={s.program.landCostUsd}
              capex={s.capex}
              bandLow={s.bandLow}
              bandHigh={s.bandHigh}
              totalMonths={s.totalMonths}
              currencyCode={s.country.currencyCode}
              currencySymbol={currencySymbol}
              fx={s.country.fx}
              fundingCoverage={s.feasibility.coverage}
              fundingGap={s.feasibility.gap}
              opex={s.autoOpex}
              annualRevenueUsd={s.program.annualRevenueUsd}
              operatingBalance={s.feasibility.operatingBalance}
            />
            <FeasibilityPanel feasibility={s.feasibility} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
