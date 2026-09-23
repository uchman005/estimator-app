"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/ui/Panel";
import { Field, Input, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { PHASE_LABEL, PHASE_ORDER, type Phase } from "@/lib/phases";

type Role = "owner" | "editor" | "viewer";

interface FacilitySummary {
  id: number;
  programId: number;
  name: string;
  phase: Phase;
  isIncluded: boolean;
}

interface ProgramWithFacilities {
  id: number;
  name: string;
  role: Role;
  ownerEmail?: string;
  facilities: FacilitySummary[];
}

export function FacilitiesClient({ currentUserEmail }: { currentUserEmail: string }) {
  const [programs, setPrograms] = useState<ProgramWithFacilities[] | null>(null);

  const load = async () => {
    const res = await fetch("/api/programs");
    if (!res.ok) return;
    const data = await res.json();
    setPrograms([...data.owned, ...data.shared]);
  };

  useEffect(() => {
    load();
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
            <ProgramGroup key={p.id} program={p} onChanged={load} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function ProgramGroup({ program, onChanged }: { program: ProgramWithFacilities; onChanged: () => void }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<Phase>("phase_1");
  const [busy, setBusy] = useState(false);
  const canEdit = program.role === "owner" || program.role === "editor";
  const canDelete = program.role === "owner";

  async function addFacility() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/programs/${program.id}/facilities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phase }),
      });
      const row = await res.json();
      router.push(`/projects/${row.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function changePhase(projectId: number, newPhase: Phase) {
    await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: newPhase }),
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
            <div className="mb-3 flex flex-wrap items-end gap-2 border-b border-paper-line pb-3">
              <Field label="Facility name" className="min-w-[200px] flex-1">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mortuary" />
              </Field>
              <Field label="Phase">
                <Select value={phase} onChange={(e) => setPhase(e.target.value as Phase)}>
                  {PHASE_ORDER.map((ph) => (
                    <option key={ph} value={ph}>
                      {PHASE_LABEL[ph]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button onClick={addFacility} disabled={busy || !name.trim()}>
                {busy ? "Adding…" : "+ Add facility"}
              </Button>
            </div>
          )}

          {program.facilities.length === 0 ? (
            <p className="text-[11.5px] text-muted">No facilities yet.</p>
          ) : (
            <div className="space-y-1.5">
              {program.facilities.map((f) => (
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
                      <Select
                        value={f.phase}
                        onChange={(e) => changePhase(f.id, e.target.value as Phase)}
                        className="!w-auto py-1 text-[11px]"
                      >
                        {PHASE_ORDER.map((ph) => (
                          <option key={ph} value={ph}>
                            {PHASE_LABEL[ph].split(" — ")[0]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <span className="text-[10.5px] text-muted">{PHASE_LABEL[f.phase].split(" — ")[0]}</span>
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
          )}
        </>
      )}
    </Panel>
  );
}
