"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/ui/Panel";
import { FacilityTypeField } from "@/components/ui/FacilityTypeField";
import { AddFacilityForm, type AddFacilityInput, type BuildingTemplateChoice } from "@/components/ui/AddFacilityForm";
import { FLAT_FACILITY_TYPE_PRESETS } from "@/lib/facilityTypes";

type Role = "owner" | "editor" | "viewer";

interface FacilitySummary {
  id: number;
  programId: number;
  name: string;
  facilityType: string;
  isIncluded: boolean;
}

interface ProgramWithFacilities {
  id: number;
  name: string;
  role: Role;
  ownerEmail?: string;
  facilities: FacilitySummary[];
}

function groupOrder(facilities: FacilitySummary[], buildingTemplates: BuildingTemplateChoice[]): string[] {
  const inUse = new Set(facilities.map((f) => f.facilityType));
  const buildingNames = buildingTemplates.map((t) => t.name).filter((n) => inUse.has(n));
  const flat = FLAT_FACILITY_TYPE_PRESETS.filter((t) => inUse.has(t));
  const known = new Set([...buildingNames, ...flat]);
  const custom = [...inUse].filter((t) => !known.has(t)).sort();
  return [...buildingNames, ...flat, ...custom];
}

export function FacilitiesClient({ currentUserEmail }: { currentUserEmail: string }) {
  const [programs, setPrograms] = useState<ProgramWithFacilities[] | null>(null);
  const [buildingTemplates, setBuildingTemplates] = useState<BuildingTemplateChoice[]>([]);

  const load = async () => {
    const res = await fetch("/api/programs");
    if (!res.ok) return;
    const data = await res.json();
    setPrograms([...data.owned, ...data.shared]);
  };

  useEffect(() => {
    load();
    fetch("/api/reference")
      .then((r) => r.json())
      .then((d) => setBuildingTemplates(d.buildingTemplates ?? []));
  }, []);

  return (
    <AppShell email={currentUserEmail}>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-ink">Facilities</h1>
          <p className="mt-0.5 text-sm text-muted">
            Every facility across every program you own or collaborate on, grouped by program — open one to view its full
            estimate, or manage it right here.
          </p>
        </div>

        {programs === null && <p className="text-sm text-muted">Loading…</p>}
        {programs?.length === 0 && (
          <p className="text-sm text-muted">
            No programs yet —{" "}
            <Link href="/" className="text-blueprint underline">
              create one from the dashboard
            </Link>{" "}
            first.
          </p>
        )}

        <div className="space-y-4">
          {programs?.map((p) => (
            <ProgramGroup key={p.id} program={p} buildingTemplates={buildingTemplates} onChanged={load} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function ProgramGroup({
  program,
  buildingTemplates,
  onChanged,
}: {
  program: ProgramWithFacilities;
  buildingTemplates: BuildingTemplateChoice[];
  onChanged: () => void;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const canEdit = program.role === "owner" || program.role === "editor";
  const canDelete = program.role === "owner";
  const typePresets = [...buildingTemplates.map((t) => t.name), ...FLAT_FACILITY_TYPE_PRESETS];

  async function addFacility(input: AddFacilityInput) {
    const res = await fetch(`/api/programs/${program.id}/facilities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        facilityType: input.facilityType,
        templateSlug: input.building?.templateSlug,
        grossAreaM2: input.building?.grossAreaM2,
        markupPct: input.building?.markupPct,
      }),
    });
    const row = await res.json();
    router.push(`/projects/${row.id}`);
  }

  async function changeType(projectId: number, newType: string) {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facilityType: newType }),
    });
    onChanged();
  }

  async function toggleIncluded(projectId: number, isIncluded: boolean) {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isIncluded }),
    });
    onChanged();
  }

  async function remove(projectId: number, projectName: string) {
    if (!window.confirm(`Delete "${projectName}"? This removes its whole BOQ and can't be undone.`)) return;
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <Panel
      title={program.name.toUpperCase()}
      eyebrow={`${program.facilities.length} ${program.facilities.length === 1 ? "facility" : "facilities"} · ${
        program.role
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => setExpanded((e) => !e)} className="text-[11px] text-blueprint underline">
          {expanded ? "Collapse" : "Expand"}
        </button>
        <Link href={`/programs/${program.id}`} className="text-[11px] text-blueprint underline">
          Open program →
        </Link>
      </div>

      {expanded && (
        <>
          {canEdit && (
            <div className="mb-3 border-b border-paper-line pb-3">
              <AddFacilityForm buildingTemplates={buildingTemplates} onAdd={addFacility} namePlaceholder="e.g. Mortuary" />
            </div>
          )}

          {program.facilities.length === 0 ? (
            <p className="text-[11.5px] text-muted">No facilities yet.</p>
          ) : (
            groupOrder(program.facilities, buildingTemplates).map((type) => {
              const inGroup = program.facilities.filter((f) => f.facilityType === type);
              if (inGroup.length === 0) return null;
              return (
                <div key={type} className="mb-3">
                  <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-blueprint">{type}</div>
                  <div className="space-y-1.5">
                    {inGroup.map((f) => (
                      <div
                        key={f.id}
                        className={`flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] transition-colors hover:border-blueprint ${
                          f.isIncluded ? "" : "opacity-50"
                        }`}
                      >
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          {canEdit && (
                            <input
                              type="checkbox"
                              checked={f.isIncluded}
                              onChange={(e) => toggleIncluded(f.id, e.target.checked)}
                              title="Count toward the program's feasibility"
                            />
                          )}
                          <Link href={`/projects/${f.id}`} className="min-w-0 flex-1 truncate font-medium text-ink">
                            {f.name}
                          </Link>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          {canEdit ? (
                            <FacilityTypeField value={f.facilityType} onChange={(v) => changeType(f.id, v)} presets={typePresets} compact />
                          ) : (
                            <span className="text-[10.5px] text-muted">{f.facilityType}</span>
                          )}
                          {canDelete && (
                            <button onClick={() => remove(f.id, f.name)} className="text-[11px] text-clay underline">
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
        </>
      )}
    </Panel>
  );
}
