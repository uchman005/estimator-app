import { useCallback, useEffect, useMemo, useState } from "react";
import { computeCost, computeSchedule, computeFacilityOpex, type ProjectItemLite, type ProjectSettings } from "@/lib/calc/engine";
import { useSaveStatus } from "@/lib/useSaveStatus";
import type { ItemRow, ProjectRow, ReferenceData, BuildingGenInfo, OpexItemRow } from "./components/types";

interface ProgramSummary {
  id: number;
  name: string;
  escalationPct: number;
  opexPctOfCapexPerYear: number;
}

interface CountrySummary {
  id: string;
  name: string;
  currencyCode: string;
}

export function useProjectEditor(projectId: number) {
  const { status: saveStatus, track } = useSaveStatus();
  const [ref, setRef] = useState<ReferenceData | null>(null);
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [program, setProgram] = useState<ProgramSummary | null>(null);
  const [country, setCountry] = useState<CountrySummary | null>(null);
  const [fx, setFx] = useState(1);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [opexItems, setOpexItems] = useState<OpexItemRow[]>([]);
  const [role, setRole] = useState<"owner" | "editor" | "viewer" | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [genInfo, setGenInfo] = useState<BuildingGenInfo | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [costIndex, setCostIndex] = useState(1);

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
    setProgram(projData.program);
    setCountry(projData.country);
    setFx(projData.fx);
    setRole(projData.role);
    setCostIndex(projData.costIndex);
    setItems(
      (projData.items as ItemRow[]).map((it) => ({
        id: it.id,
        customLabel: it.customLabel,
        customUnit: it.customUnit,
        customUnifCode: it.customUnifCode,
        quantity: it.quantity,
        rateUsd: it.rateUsd,
        isAddon: it.isAddon,
        isIncluded: it.isIncluded,
      }))
    );
    setOpexItems(projData.opexItems as OpexItemRow[]);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const aace = useMemo(() => ref?.aaceClasses.find((a) => a.classNumber === project?.aaceClass) ?? null, [ref, project]);

  // Every row the building generator writes shares the same quantity (the
  // GFA it was generated at — see generateBuildingFromTemplate() in
  // lib/calc/engine.ts), so the first generated division row's quantity IS
  // the facility's GFA. Flat/vehicle facilities have no such row → null.
  const buildingGfaM2 = useMemo(
    () => items.find((it) => it.customUnifCode && /^[A-G]$/.test(it.customUnifCode))?.quantity ?? null,
    [items]
  );

  const itemsLite: ProjectItemLite[] = useMemo(
    () =>
      items.map((it) => ({
        id: it.id,
        customLabel: it.customLabel,
        customUnit: it.customUnit,
        customUnifCode: it.customUnifCode,
        quantity: it.quantity,
        rateUsd: it.rateUsd,
        // phase/duration params aren't surfaced in the UI (set by the
        // generator, or defaulted server-side for a manual row) — cost
        // computation doesn't need them, only computeSchedule() does, and
        // that's computed server-side in the facility GET response's
        // `schedule` field, not recomputed client-side from this lite list.
        phase: "vertical",
        baseDurationMonths: 1,
        baseSize: 1,
        durationExponent: 0.2,
        isAddon: it.isAddon,
        isIncluded: it.isIncluded,
      })),
    [items]
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
  // What the program would estimate THIS facility's opex at if it had no
  // itemized rows at all — shown as a live reference figure even once real
  // rows exist, so you can see what you're overriding.
  const autoOpexEstimate = useMemo(
    () => (cost && program ? cost.grandTotal * (program.opexPctOfCapexPerYear / 100) : 0),
    [cost, program]
  );
  const opex = useMemo(
    () => (cost && program ? computeFacilityOpex(opexItems, program.opexPctOfCapexPerYear, cost.grandTotal) : 0),
    [opexItems, cost, program]
  );

  function patchProject(patch: Partial<ProjectRow>) {
    setProject((p) => (p ? { ...p, ...patch } : p));
    track(fetch(`/api/projects/${projectId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }));
  }
  function patchItem(id: number, patch: Partial<ItemRow>) {
    setItems((arr) => arr.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    track(fetch(`/api/projects/${projectId}/items/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }));
  }
  async function addItem() {
    const res = await fetch(`/api/projects/${projectId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customLabel: "New item", quantity: 1, rateUsd: 0, isAddon: true, customUnifCode: "Z" }),
    });
    const row = await res.json();
    setItems((arr) => [
      ...arr,
      {
        id: row.id, customLabel: row.customLabel, customUnit: row.customUnit,
        customUnifCode: row.customUnifCode, quantity: row.quantity, rateUsd: row.rateUsd,
        isAddon: row.isAddon, isIncluded: row.isIncluded,
      },
    ]);
  }
  async function deleteItem(id: number) {
    setItems((arr) => arr.filter((it) => it.id !== id));
    await fetch(`/api/projects/${projectId}/items/${id}`, { method: "DELETE" });
  }
  async function addOpexItem() {
    const res = await fetch(`/api/projects/${projectId}/opex-items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: "New recurring cost", category: "other", annualAmountUsd: 0 }),
    });
    const row = await res.json();
    setOpexItems((arr) => [...arr, row]);
  }
  function patchOpexItem(id: number, patch: Partial<OpexItemRow>) {
    setOpexItems((arr) => arr.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    track(fetch(`/api/projects/${projectId}/opex-items/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }));
  }
  async function deleteOpexItem(id: number) {
    setOpexItems((arr) => arr.filter((it) => it.id !== id));
    await fetch(`/api/projects/${projectId}/opex-items/${id}`, { method: "DELETE" });
  }

  async function generateBuilding(input: { templateSlug: string; grossAreaM2: number; markupPct: number }) {
    setGenBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/generate-building`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (res.ok) {
        setGenInfo({
          templateName: data.template.name,
          defaultFloors: data.template.defaultFloors,
          grossAreaM2: data.grossAreaM2,
          markupPct: data.markupPct,
          divisionCount: data.divisionCount,
        });
      }
      await load();
    } finally {
      setGenBusy(false);
    }
  }

  return {
    ref, project, program, country, fx, items, opexItems, loading, accessError, role, genInfo, genBusy, costIndex,
    aace, buildingGfaM2, saveStatus,
    settings, cost, schedule, opex, autoOpexEstimate,
    patchProject, patchItem, addItem, deleteItem, generateBuilding,
    addOpexItem, patchOpexItem, deleteOpexItem,
  };
}
