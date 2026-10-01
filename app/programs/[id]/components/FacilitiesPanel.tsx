import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { FacilityTypeField } from "@/components/ui/FacilityTypeField";
import { AddFacilityForm, type AddFacilityInput } from "@/components/ui/AddFacilityForm";
import { fmtUsd, fmtMonths } from "@/components/ui/Metrics";
import { FLAT_FACILITY_TYPE_PRESETS } from "@/lib/facilityTypes";
import type { FacilityRow, BuildingTemplateSummary } from "./types";

// Building template names first (in reference order), then the flat
// presets — so a program with facilities of both kinds still gets a
// sensible, stable grouping, matching the order they're offered in
// AddFacilityForm.
function groupOrder(facilities: FacilityRow[], buildingTemplates: BuildingTemplateSummary[]): string[] {
  const inUse = new Set(facilities.map((f) => f.project.facilityType));
  const buildingNames = buildingTemplates.map((t) => t.name).filter((n) => inUse.has(n));
  const flat = FLAT_FACILITY_TYPE_PRESETS.filter((t) => inUse.has(t));
  const known = new Set([...buildingNames, ...flat]);
  const custom = [...inUse].filter((t) => !known.has(t)).sort();
  return [...buildingNames, ...flat, ...custom];
}

// Every row the building generator writes shares the same quantity (the GFA
// it was generated at) — so the first generated division row's quantity IS
// the facility's GFA. Flat/vehicle facilities have no such row → null.
function gfaM2(f: FacilityRow): number | null {
  return f.items.find((it) => it.customUnifCode && /^[A-G]$/.test(it.customUnifCode))?.quantity ?? null;
}

export function FacilitiesPanel({
  facilities,
  buildingTemplates,
  canDelete,
  onAdd,
  onChangeType,
  onToggleIncluded,
  onDelete,
}: {
  facilities: FacilityRow[];
  buildingTemplates: BuildingTemplateSummary[];
  canDelete: boolean;
  onAdd: (input: AddFacilityInput) => Promise<void>;
  onChangeType: (projectId: number, facilityType: string) => void;
  onToggleIncluded: (projectId: number, isIncluded: boolean) => void;
  onDelete: (projectId: number) => void;
}) {
  const includedCount = facilities.filter((f) => f.project.isIncluded).length;
  const typePresets = [...buildingTemplates.map((t) => t.name), ...FLAT_FACILITY_TYPE_PRESETS];

  function remove(projectId: number, projectName: string) {
    if (window.confirm(`Delete "${projectName}"? This removes its whole BOQ and can't be undone.`)) {
      onDelete(projectId);
    }
  }

  return (
    <Panel title="02 — FACILITIES" eyebrow={`${includedCount}/${facilities.length} counted toward feasibility`}>
      <p className="mb-2 text-[11.5px] text-muted">
        The hospital, clinics, housing, school of nursing, mortuary — every building on this site is its own facility with
        its own BOQ, generator, schedule and recurring costs, rolled up into the program totals below. Uncheck one to test
        the program&apos;s feasibility without it, without deleting anything. Pick a building type (Alpha Clinic, Remote
        Clinic, ...) and its BOQ is generated immediately; a flat type (Ambulance, ICT Hub, ...) starts empty for you to
        price by hand.
      </p>
      <div className="mb-3">
        <AddFacilityForm buildingTemplates={buildingTemplates} onAdd={onAdd} />
      </div>

      {facilities.length === 0 ? (
        <p className="text-[11.5px] text-muted">No facilities yet — add the first one above.</p>
      ) : (
        groupOrder(facilities, buildingTemplates).map((type) => {
          const inGroup = facilities.filter((f) => f.project.facilityType === type);
          if (inGroup.length === 0) return null;
          return (
            <div key={type} className="mb-3">
              <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-blueprint">{type}</div>
              <div className="space-y-1.5">
                {inGroup.map((f) => (
                  <div
                    key={f.project.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] transition-colors hover:border-blueprint ${
                      f.project.isIncluded ? "" : "opacity-50"
                    }`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={f.project.isIncluded}
                        onChange={(e) => onToggleIncluded(f.project.id, e.target.checked)}
                        title="Count toward the program's feasibility"
                      />
                      <Link href={`/projects/${f.project.id}`} className="min-w-0 flex-1 truncate font-medium text-ink">
                        {f.project.name}
                      </Link>
                    </span>
                    <span className="flex shrink-0 items-center gap-2 text-muted">
                      <span className="font-mono" title="Capital cost">
                        {fmtUsd(f.cost.grandTotal)}
                      </span>
                      {gfaM2(f) != null && (
                        <span className="font-mono" title="All-in cost per m² of GFA">
                          {fmtUsd(f.cost.grandTotal / gfaM2(f)!)}/m²
                        </span>
                      )}
                      <span className="font-mono" title="Recurring cost, per year">
                        {fmtUsd(f.opex)}/yr
                      </span>
                      <span className="font-mono">{fmtMonths(f.schedule.totalMonths)}</span>
                      <FacilityTypeField
                        value={f.project.facilityType}
                        onChange={(v) => onChangeType(f.project.id, v)}
                        presets={typePresets}
                        compact
                      />
                      {canDelete && (
                        <button
                          onClick={() => remove(f.project.id, f.project.name)}
                          className="text-[11px] text-clay underline"
                          title="Delete facility"
                        >
                          Delete
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </Panel>
  );
}
