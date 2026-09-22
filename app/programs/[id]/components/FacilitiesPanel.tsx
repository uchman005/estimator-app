import { useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Field, Input, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { fmtUsd, fmtMonths } from "@/components/ui/Metrics";
import { PHASE_LABEL, PHASE_ORDER, type FacilityRow, type Phase } from "./types";

export function FacilitiesPanel({
  facilities,
  canDelete,
  onAdd,
  onChangePhase,
  onDelete,
}: {
  facilities: FacilityRow[];
  canDelete: boolean;
  onAdd: (name: string, phase: Phase) => Promise<void>;
  onChangePhase: (projectId: number, phase: Phase) => void;
  onDelete: (projectId: number) => void;
}) {
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<Phase>("phase_1");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onAdd(name.trim(), phase);
      setName("");
    } finally {
      setBusy(false);
    }
  }

  function remove(projectId: number, projectName: string) {
    if (window.confirm(`Delete "${projectName}"? This removes its whole BOQ and can't be undone.`)) {
      onDelete(projectId);
    }
  }

  return (
    <Panel title="02 — FACILITIES" eyebrow={`${facilities.length} in this program`}>
      <p className="mb-2 text-[11.5px] text-muted">
        The hospital, clinics, housing, school of nursing, mortuary — every building on this site is its own facility with
        its own BOQ, generator and schedule, rolled up into the program totals below.
      </p>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <Field label="Facility name" className="min-w-[220px] flex-1">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 200-Bed Hospital, Level V" />
        </Field>
        <Field label="Phase">
          <Select value={phase} onChange={(e) => setPhase(e.target.value as Phase)}>
            {PHASE_ORDER.map((p) => (
              <option key={p} value={p}>
                {PHASE_LABEL[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Button onClick={add} disabled={busy || !name.trim()}>
          {busy ? "Adding…" : "+ Add facility"}
        </Button>
      </div>

      {facilities.length === 0 ? (
        <p className="text-[11.5px] text-muted">No facilities yet — add the first one above.</p>
      ) : (
        PHASE_ORDER.map((p) => {
          const inPhase = facilities.filter((f) => f.project.phase === p);
          if (inPhase.length === 0) return null;
          return (
            <div key={p} className="mb-3">
              <div className="mb-1.5 text-[11px] font-semibold tracking-wide text-blueprint">{PHASE_LABEL[p]}</div>
              <div className="space-y-1.5">
                {inPhase.map((f) => (
                  <div
                    key={f.project.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[12px] transition-colors hover:border-blueprint"
                  >
                    <Link href={`/projects/${f.project.id}`} className="min-w-0 flex-1 truncate font-medium text-ink">
                      {f.project.name}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2 text-muted">
                      <span className="font-mono">{fmtUsd(f.cost.grandTotal)}</span>
                      <span className="font-mono">{fmtMonths(f.schedule.totalMonths)}</span>
                      <Select
                        value={f.project.phase}
                        onChange={(e) => onChangePhase(f.project.id, e.target.value as Phase)}
                        className="!w-auto py-1 text-[11px]"
                      >
                        {PHASE_ORDER.map((ph) => (
                          <option key={ph} value={ph}>
                            {PHASE_LABEL[ph].split(" — ")[0]}
                          </option>
                        ))}
                      </Select>
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
