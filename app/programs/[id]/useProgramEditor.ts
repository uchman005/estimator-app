import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeProgramCapex, computeFeasibility } from "@/lib/calc/engine";
import type { ProgramRow, FacilityRow, ReferenceData, CollaboratorRow, Phase } from "./components/types";

export function useProgramEditor(programId: number) {
  const router = useRouter();
  const [ref, setRef] = useState<ReferenceData | null>(null);
  const [program, setProgram] = useState<ProgramRow | null>(null);
  const [facilities, setFacilities] = useState<FacilityRow[]>([]);
  const [totalMonths, setTotalMonths] = useState(0);
  const [role, setRole] = useState<"owner" | "editor" | "viewer" | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fxStatus, setFxStatus] = useState("");
  const [fxBusy, setFxBusy] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);

  const load = useCallback(async () => {
    const [refRes, progRes] = await Promise.all([
      fetch(`/api/reference?programId=${programId}`),
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
    setTotalMonths(progData.totalMonths);
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
  // (lib/calc/engine.ts is pure and safe on the client). Note: a change to
  // escalationPct only takes effect in each facility's own subtotal after
  // the next full reload — that recompute needs each facility's raw items,
  // which this page doesn't hold — landCostUsd/funding fields update instantly.
  const capex = useMemo(
    () => (program ? computeProgramCapex(includedFacilities.map((f) => ({ grandTotal: f.cost.grandTotal })), program.landCostUsd) : 0),
    [includedFacilities, program]
  );
  // Each facility's own opex (itemized-or-%-fallback) is already resolved
  // server-side per facility — summing it here, rather than recomputing from
  // scratch, is what makes toggling a facility recalc instantly without
  // needing that facility's raw opex line items loaded on this page.
  const autoOpex = useMemo(() => includedFacilities.reduce((sum, f) => sum + f.opex, 0), [includedFacilities]);
  const bandLow = useMemo(
    () => (program ? includedFacilities.reduce((s, f) => s + f.cost.bandLow, 0) + program.landCostUsd : 0),
    [includedFacilities, program]
  );
  const bandHigh = useMemo(
    () => (program ? includedFacilities.reduce((s, f) => s + f.cost.bandHigh, 0) + program.landCostUsd : 0),
    [includedFacilities, program]
  );
  const feasibility = useMemo(() => (program ? computeFeasibility(capex, autoOpex, program) : null), [capex, autoOpex, program]);

  function patchProgram(patch: Partial<ProgramRow>) {
    setProgram((p) => (p ? { ...p, ...patch } : p));
    fetch(`/api/programs/${programId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  }

  async function addFacility(name: string, phase: Phase) {
    const res = await fetch(`/api/programs/${programId}/facilities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phase }),
    });
    const row = await res.json();
    router.push(`/projects/${row.id}`);
  }

  function changeFacilityPhase(projectId: number, phase: Phase) {
    setFacilities((arr) => arr.map((f) => (f.project.id === projectId ? { ...f, project: { ...f.project, phase } } : f)));
    fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phase }) });
  }

  function toggleFacilityIncluded(projectId: number, isIncluded: boolean) {
    setFacilities((arr) => arr.map((f) => (f.project.id === projectId ? { ...f, project: { ...f.project, isIncluded } } : f)));
    fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isIncluded }) });
  }

  async function deleteFacility(projectId: number) {
    setFacilities((arr) => arr.filter((f) => f.project.id !== projectId));
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
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
    await fetch(`/api/programs/${programId}/collaborators/${collabId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: collabRole }),
    });
  }
  async function removeCollaborator(collabId: number) {
    setCollaborators((arr) => arr.filter((c) => c.id !== collabId));
    await fetch(`/api/programs/${programId}/collaborators/${collabId}`, { method: "DELETE" });
  }

  return {
    ref, program, facilities, capex, autoOpex, bandLow, bandHigh, totalMonths, feasibility,
    loading, accessError, role, fxStatus, fxBusy, collaborators,
    country, region, costIndex,
    patchProgram, addFacility, changeFacilityPhase, toggleFacilityIncluded, deleteFacility, refreshFx,
    inviteCollaborator, changeCollaboratorRole, removeCollaborator,
  };
}
