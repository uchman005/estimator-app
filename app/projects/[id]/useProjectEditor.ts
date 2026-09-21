import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeCost,
  computeSchedule,
  computeFeasibility,
  type AssemblyLite,
  type ProjectItemLite,
  type ProjectSettings,
  type Tier,
} from "@/lib/calc/engine";
import type { ItemRow, ProjectRow, ReferenceData, HospitalGenInfo, CollaboratorRow } from "./components/types";

interface ApiItem extends ItemRow {
  assembly: AssemblyLite | null;
}

export function useProjectEditor(projectId: number) {
  const [ref, setRef] = useState<ReferenceData | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [role, setRole] = useState<"owner" | "editor" | "viewer" | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [genInfo, setGenInfo] = useState<HospitalGenInfo | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [fxStatus, setFxStatus] = useState("");
  const [fxBusy, setFxBusy] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorRow[]>([]);

  const load = useCallback(async () => {
    const [refRes, projRes] = await Promise.all([fetch("/api/reference"), fetch(`/api/projects/${projectId}`)]);
    if (!projRes.ok) {
      const data = await projRes.json().catch(() => ({}));
      setAccessError(data.error || `Could not load this project (HTTP ${projRes.status}).`);
      setLoading(false);
      return;
    }
    const refData: ReferenceData = await refRes.json();
    const projData = await projRes.json();
    setRef(refData);
    setProject(projData.project);
    setRole(projData.role);
    setItems(
      (projData.items as ApiItem[]).map((it) => ({
        id: it.id,
        assemblyId: it.assembly?.id ?? null,
        customLabel: it.customLabel,
        customUnit: it.customUnit,
        customUnifCode: it.customUnifCode,
        quantity: it.quantity,
        tier: it.tier,
        variantId: it.variantId,
        rateOverrideUsd: it.rateOverrideUsd,
        isAddon: it.isAddon,
        isIncluded: it.isIncluded,
      }))
    );
    setLoading(false);
  }, [projectId]);

  const loadCollaborators = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/collaborators`);
    if (res.ok) setCollaborators(await res.json());
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (role === "owner") loadCollaborators();
  }, [role, loadCollaborators]);

  const assemblyById = useMemo(() => {
    const m = new Map<number, AssemblyLite>();
    ref?.assemblies.forEach((a) => m.set(a.id, a));
    return m;
  }, [ref]);

  const groupedAssemblies = useMemo(() => {
    const out: Record<string, AssemblyLite[]> = {};
    ref?.assemblies.forEach((a) => {
      const letter = a.classCode[0] || "Z";
      (out[letter] ??= []).push(a);
    });
    return out;
  }, [ref]);

  const country = useMemo(() => ref?.countries.find((c) => c.id === project?.countryId) ?? null, [ref, project]);
  const region = useMemo(
    () => country?.regions.find((r) => r.id === project?.regionId) ?? country?.regions[0] ?? null,
    [country, project]
  );
  const aace = useMemo(() => ref?.aaceClasses.find((a) => a.classNumber === project?.aaceClass) ?? null, [ref, project]);

  const itemsLite: ProjectItemLite[] = useMemo(
    () =>
      items.map((it) => ({
        id: it.id,
        assembly: it.assemblyId != null ? assemblyById.get(it.assemblyId) ?? null : null,
        customLabel: it.customLabel,
        customUnit: it.customUnit,
        customUnifCode: it.customUnifCode,
        quantity: it.quantity,
        tier: it.tier,
        variantId: it.variantId,
        rateOverrideUsd: it.rateOverrideUsd,
        isAddon: it.isAddon,
        isIncluded: it.isIncluded,
      })),
    [items, assemblyById]
  );

  const settings: ProjectSettings | null = useMemo(() => {
    if (!project || !country) return null;
    return {
      aaceClass: project.aaceClass,
      deliveryStrategy: project.deliveryStrategy,
      designFeePct: project.designFeePct,
      pmFeePct: project.pmFeePct,
      permitFeePct: project.permitFeePct,
      landCostUsd: project.landCostUsd,
      escalationPct: project.escalationPct,
      contingencyPctOverride: project.contingencyPctOverride,
      fastTrackPremiumPct: project.fastTrackPremiumPct,
      landMonths: project.landMonths,
      designMonths: project.designMonths,
      designPermitOverlapPct: project.designPermitOverlapPct,
      commissionMonths: project.commissionMonths,
      fundedUsd: project.fundedUsd,
      opexOverrideUsd: project.opexOverrideUsd,
      opexPctOfCapexPerYear: project.opexPctOfCapexPerYear,
      annualRevenueUsd: project.annualRevenueUsd,
      costIndex: country.baseCostIndex * (1 + (region?.offsetPct ?? 0) / 100),
    };
  }, [project, country, region]);

  const cost = useMemo(() => (settings && aace ? computeCost(itemsLite, settings, aace) : null), [itemsLite, settings, aace]);
  const schedule = useMemo(() => (settings ? computeSchedule(itemsLite, settings) : null), [itemsLite, settings]);
  const feasibility = useMemo(() => (settings && cost ? computeFeasibility(cost.grandTotal, settings) : null), [settings, cost]);

  function patchProject(patch: Partial<ProjectRow>) {
    setProject((p) => (p ? { ...p, ...patch } : p));
    fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  }
  function patchItem(id: number, patch: Partial<ItemRow>) {
    setItems((arr) => arr.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    fetch(`/api/projects/${projectId}/items/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  }
  async function addItem() {
    const customAssembly = ref?.assemblies.find((a) => a.name === "Custom / Other");
    const res = await fetch(`/api/projects/${projectId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assemblyId: customAssembly?.id ?? null, quantity: 1, tier: "standard", isAddon: true, customUnifCode: "Z" }),
    });
    const row = await res.json();
    setItems((arr) => [
      ...arr,
      {
        id: row.id, assemblyId: row.assemblyId, customLabel: row.customLabel, customUnit: row.customUnit,
        customUnifCode: row.customUnifCode, quantity: row.quantity, tier: row.tier, variantId: row.variantId,
        rateOverrideUsd: row.rateOverrideUsd, isAddon: row.isAddon, isIncluded: row.isIncluded,
      },
    ]);
  }
  async function deleteItem(id: number) {
    setItems((arr) => arr.filter((it) => it.id !== id));
    await fetch(`/api/projects/${projectId}/items/${id}`, { method: "DELETE" });
  }
  async function runGenerator(input: { beds: number; tier: Tier; floors: number; floorToFloorM: number; windowToWallRatioPct: number }) {
    setGenBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-hospital`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      setGenInfo(data.info);
      await load();
    } finally {
      setGenBusy(false);
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
    const res = await fetch(`/api/projects/${projectId}/collaborators`, {
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
    await fetch(`/api/projects/${projectId}/collaborators/${collabId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: collabRole }),
    });
  }
  async function removeCollaborator(collabId: number) {
    setCollaborators((arr) => arr.filter((c) => c.id !== collabId));
    await fetch(`/api/projects/${projectId}/collaborators/${collabId}`, { method: "DELETE" });
  }

  return {
    ref, project, items, loading, accessError, role, genInfo, genBusy, fxStatus, fxBusy, collaborators,
    assemblyById, groupedAssemblies, country, region, aace,
    settings, cost, schedule, feasibility,
    patchProject, patchItem, addItem, deleteItem, runGenerator, refreshFx,
    inviteCollaborator, changeCollaboratorRole, removeCollaborator,
  };
}
