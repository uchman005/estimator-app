import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeCost,
  computeSchedule,
  type AssemblyLite,
  type ProjectItemLite,
  type ProjectSettings,
  type Tier,
} from "@/lib/calc/engine";
import type { ItemRow, ProjectRow, ReferenceData, HospitalGenInfo } from "./components/types";

interface ApiItem extends ItemRow {
  assembly: AssemblyLite | null;
}

interface ProgramSummary {
  id: number;
  name: string;
  escalationPct: number;
}

interface CountrySummary {
  id: string;
  name: string;
  currencyCode: string;
}

export function useProjectEditor(projectId: number) {
  const [ref, setRef] = useState<ReferenceData | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [program, setProgram] = useState<ProgramSummary | null>(null);
  const [country, setCountry] = useState<CountrySummary | null>(null);
  const [fx, setFx] = useState(1);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [role, setRole] = useState<"owner" | "editor" | "viewer" | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [genInfo, setGenInfo] = useState<HospitalGenInfo | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [costIndex, setCostIndex] = useState(1);

  const load = useCallback(async () => {
    // Sequential, not parallel: the reference data (specifically its
    // assemblies) is scoped to this facility's program's own catalog, and we
    // don't know which program that is until the project itself loads.
    const projRes = await fetch(`/api/projects/${projectId}`);
    if (!projRes.ok) {
      const data = await projRes.json().catch(() => ({}));
      setAccessError(data.error || `Could not load this project (HTTP ${projRes.status}).`);
      setLoading(false);
      return;
    }
    const projData = await projRes.json();
    const refRes = await fetch(`/api/reference?programId=${projData.program.id}`);
    const refData: ReferenceData = await refRes.json();
    setRef(refData);
    setProject(projData.project);
    setProgram(projData.program);
    setCountry(projData.country);
    setFx(projData.fx);
    setRole(projData.role);
    setCostIndex(projData.costIndex);
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

  useEffect(() => {
    load();
  }, [load]);

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

  // Escalation is a shared program assumption, not a local input — see program.escalationPct.
  const settings: ProjectSettings | null = useMemo(() => {
    if (!project || !program) return null;
    return {
      aaceClass: project.aaceClass,
      deliveryStrategy: project.deliveryStrategy,
      designFeePct: project.designFeePct,
      pmFeePct: project.pmFeePct,
      permitFeePct: project.permitFeePct,
      escalationPct: program.escalationPct,
      contingencyPctOverride: project.contingencyPctOverride,
      fastTrackPremiumPct: project.fastTrackPremiumPct,
      landMonths: project.landMonths,
      designMonths: project.designMonths,
      designPermitOverlapPct: project.designPermitOverlapPct,
      commissionMonths: project.commissionMonths,
      costIndex,
    };
  }, [project, program, costIndex]);

  const cost = useMemo(() => (settings && aace ? computeCost(itemsLite, settings, aace) : null), [itemsLite, settings, aace]);
  const schedule = useMemo(() => (settings ? computeSchedule(itemsLite, settings) : null), [itemsLite, settings]);

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

  return {
    ref, project, program, country, fx, items, loading, accessError, role, genInfo, genBusy, costIndex,
    assemblyById, groupedAssemblies, aace,
    settings, cost, schedule,
    patchProject, patchItem, addItem, deleteItem, runGenerator,
  };
}
