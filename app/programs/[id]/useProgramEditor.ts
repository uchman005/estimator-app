import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeProgramReport, computeOpexProjection } from "@/lib/calc/engine";
import { useSaveStatus } from "@/lib/useSaveStatus";
import type { AddFacilityInput } from "@/components/ui/AddFacilityForm";
import type { ProgramRow, FacilityRow, ReferenceData, CollaboratorRow } from "./components/types";

// Nominal multi-year opex outlook horizon — see computeOpexProjection()'s
// own comment for why this is undiscounted. A plain constant, not a program
// field, since there's no per-program input for it yet (matches the server
// route's own OPEX_PROJECTION_YEARS).
const OPEX_PROJECTION_YEARS = 10;

export function useProgramEditor(programId: number) {
  const router = useRouter();
  const { status: saveStatus, track, trackDebounced, cancelDebounced } = useSaveStatus();
  const [ref, setRef] = useState<ReferenceData | null>(null);
  const [program, setProgram] = useState<ProgramRow | null>(null);
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const [role, setRole] = useState<"owner" | "editor" | "viewer" | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fxStatus, setFxStatus] = useState("");
  const [fxBusy, setFxBusy] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    const [refRes, progRes] = await Promise.all([
      fetch(`/api/reference`),
      fetch(`/api/programs/${programId}`),
    ]);
    if (!progRes.ok) {
      const data = await progRes.json().catch(() => ({}));
      setAccessError(data.error || `Could not load this program (HTTP ${progRes.status}).`);
      setLoading(false);
      return;
    }
    const refData: ReferenceData = await refRes.json();
    const progData = await progRes.json();
    setRef(refData);
    setProgram(progData.program);
    setRole(progData.role);
    setFacilities(progData.facilities);
    setLoading(false);
  }, [programId]);

  const loadCollaborators = useCallback(async () => {
    const res = await fetch(`/api/programs/${programId}/collaborators`);
    if (res.ok) setCollaborators(await res.json());
  }, [programId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (role === "owner") loadCollaborators();
  }, [role, loadCollaborators]);

  const country = useMemo(() => ref?.countries.find((c) => c.id === program?.countryId) ?? null, [ref, program]);
  const region = useMemo(
    () => country?.regions.find((r) => r.id === program?.regionId) ?? country?.regions[0] ?? null,
    [country, program]
  );
  const costIndex = useMemo(
    () => (country ? country.baseCostIndex * (1 + (region?.offsetPct ?? 0) / 100) : 1),
    [country, region]
  );

  // Only facilities still toggled on count toward the program's totals —
  // toggling one off is a live "what if we drop this" recompute, not a
  // server round trip.
  const includedFacilities = useMemo(() => facilities.filter((f) => f.project.isIncluded), [facilities]);

  // Recomputed on every keystroke, same pattern as the facility editor
  // (lib/calc/engine.ts is pure and safe on the client) — one function now
  // covers capex/band/opex/coverage/gap/runway/duration together (see
  // computeProgramReport()'s own comment for why that consolidation
  // matters), so toggling a facility or editing funding recomputes every
  // figure in the report at once, consistently. Note: a change to
  // escalationPct only takes effect in each facility's own subtotal after
  // the next full reload — that recompute needs each facility's raw items,
  // which this page doesn't hold — landCostUsd/funding fields update instantly.
  const report = useMemo(
    () =>
      program
        ? computeProgramReport(
            includedFacilities.map((f) => ({
              grandTotal: f.cost.grandTotal,
              bandLow: f.cost.bandLow,
              bandHigh: f.cost.bandHigh,
              opex: f.opex,
              isItemizedOpex: f.isItemizedOpex,
              revenue: f.revenue,
              totalMonths: f.schedule.totalMonths,
            })),
            program.landCostUsd,
            program,
            program.opexPctOfCapexPerYear
          )
        : null,
    [includedFacilities, program]
  );
  const opexProjection = useMemo(
    () => (program && report ? computeOpexProjection(report.opex, OPEX_PROJECTION_YEARS, program.escalationPct) : 0),
    [report, program]
  );

  function patchProgramRequest(patch: Record<string, unknown>) {
    return fetch(`/api/programs/${programId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  }
  // Debounced: a NumField/Input's onChange fires on every keystroke, so
  // without this, typing a 6-digit number fired 6 separate PATCH requests.
  // Local state still updates synchronously below — only the network write
  // waits out the pause — see useSaveStatus.ts's own comment for the merge/
  // flush-on-unmount details.
  function patchProgram(patch: Partial<ProgramRow>) {
    setProgram((p) => (p ? { ...p, ...patch } : p));
    trackDebounced("program", patch, patchProgramRequest);
  }
  // The explicit "Save progress" button. Every field on this page already
  // saves itself shortly after it changes (patchProgram above, and each
  // facility's own type/included toggle) — there's no separate local draft
  // sitting unsent. What this genuinely does: re-sends the program's whole
  // settings object as one PATCH *immediately*, bypassing the debounce — so
  // a user who isn't sure everything landed (or whose connection dropped
  // one save along the way) gets a real resync and a fresh "Saved ✓" right
  // away, not just a reassuring button that silently does nothing, and not
  // another few-hundred-ms wait on top.
  function saveProgress() {
    if (!program) return;
    cancelDebounced("program");
    track(patchProgramRequest({ ...program }));
  }

  async function addFacility(input: AddFacilityInput) {
    const res = await fetch(`/api/programs/${programId}/facilities`, {
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

  function changeFacilityType(projectId: number, facilityType: string) {
    setFacilities((arr) => arr.map((f) => (f.project.id === projectId ? { ...f, project: { ...f.project, facilityType } } : f)));
    track(fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ facilityType }) }));
  }

  function toggleFacilityIncluded(projectId: number, isIncluded: boolean) {
    setFacilities((arr) => arr.map((f) => (f.project.id === projectId ? { ...f, project: { ...f.project, isIncluded } } : f)));
    track(fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isIncluded }) }));
  }

  async function deleteFacility(projectId: number) {
    setFacilities((arr) => arr.filter((f) => f.project.id !== projectId));
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
  }

  // Deletes the whole program — every facility under it, each one's BOQ and
  // opex rows, and every collaborator invite, all cascade at the DB level
  // (see the onDelete: "cascade" chain in db/schema.ts) off this one
  // request. Irreversible, owner-only (the API enforces that too — this is
  // just the UI gate matching it), hence the confirm-by-typing-the-name
  // modal rather than a plain window.confirm().
  async function deleteProgram() {
    setDeleteBusy(true);
    try {
      const res = await fetch(`/api/programs/${programId}`, { method: "DELETE" });
      if (res.ok) router.push("/");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function refreshFx() {
    setFxBusy(true);
    setFxStatus("Fetching…");
    try {
      const res = await fetch("/api/fx/refresh", { method: "POST" });
      const data = await res.json();
      if (data.ok && !data.skipped) setFxStatus(`Updated ${data.updated?.length ?? 0} currencies at ${new Date(data.fetchedAt).toLocaleTimeString()}`);
      else if (data.skipped) setFxStatus(data.reason);
      else setFxStatus(data.error || "Fetch failed");
      await load();
    } finally {
      setFxBusy(false);
    }
  }

  async function inviteCollaborator(email: string, collabRole: "viewer" | "editor") {
    const res = await fetch(`/api/programs/${programId}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: collabRole }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not send invite.");
    await loadCollaborators();
  }
  async function changeCollaboratorRole(collabId: number, collabRole: "viewer" | "editor") {
    setCollaborators((arr) => arr.map((c) => (c.id === collabId ? { ...c, role: collabRole } : c)));
    await track(
      fetch(`/api/programs/${programId}/collaborators/${collabId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: collabRole }),
      })
    );
  }
  async function removeCollaborator(collabId: number) {
    setCollaborators((arr) => arr.filter((c) => c.id !== collabId));
    await fetch(`/api/programs/${programId}/collaborators/${collabId}`, { method: "DELETE" });
  }

  return {
    ref, program, facilities, report, opexProjection, opexProjectionYears: OPEX_PROJECTION_YEARS,
    loading, accessError, role, fxStatus, fxBusy, collaborators, saveStatus, deleteBusy,
    country, region, costIndex,
    patchProgram, saveProgress, addFacility, changeFacilityType, toggleFacilityIncluded, deleteFacility, deleteProgram, refreshFx,
    inviteCollaborator, changeCollaboratorRole, removeCollaborator,
  };
}
