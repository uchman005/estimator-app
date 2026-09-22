"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import type { AssemblyLite, MicroItemLite, SubItemLite } from "@/lib/calc/engine";

export interface ProgramCatalog {
  id: number;
  name: string;
  role: "owner" | "editor" | "viewer";
  assemblies: AssemblyLite[];
  subItems: SubItemLite[];
  microItems: MicroItemLite[];
}

type CatalogContextValue = {
  programs: ProgramCatalog[];
  /** Fire a mutation, then reload every program's catalog so all three pages stay in sync. */
  call: (url: string, method: string, body?: unknown) => Promise<void>;
  /** Reload every program's catalog with no mutation first — for actions (like an import) that already happened elsewhere. */
  reload: () => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return ctx;
}

/**
 * Wraps every /catalog/* page: renders the app shell once (so the sidebar
 * persists across the main / sub / micro pages) and loads every program's
 * catalog once, shared between them — each program in the Rate Book is its
 * own catalog now, matching /facilities' "open a program to manage what's
 * inside it" pattern.
 */
export function CatalogProvider({ currentUserEmail, children }: { currentUserEmail: string; children: React.ReactNode }) {
  const [programs, setPrograms] = useState<ProgramCatalog[] | null>(null);

  const load = useCallback(async () => {
    const progRes = await fetch("/api/programs");
    const progData = await progRes.json();
    const summaries: { id: number; name: string; role: "owner" | "editor" | "viewer" }[] = [
      ...progData.owned,
      ...progData.shared,
    ];

    const withCatalogs = await Promise.all(
      summaries.map(async (p): Promise<ProgramCatalog> => {
        const [refRes, libRes] = await Promise.all([
          fetch(`/api/reference?programId=${p.id}`),
          fetch(`/api/catalog/library?programId=${p.id}`),
        ]);
        const refData = await refRes.json();
        const libData = await libRes.json();
        return { id: p.id, name: p.name, role: p.role, assemblies: refData.assemblies ?? [], subItems: libData.subItems ?? [], microItems: libData.microItems ?? [] };
      })
    );
    setPrograms(withCatalogs);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const call = useCallback(
    async (url: string, method: string, body?: unknown) => {
      await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      await load();
    },
    [load]
  );

  return (
    <AppShell email={currentUserEmail}>
      {!programs ? (
        <div className="p-10 text-sm text-muted">Loading rate book…</div>
      ) : (
        <CatalogContext.Provider value={{ programs, call, reload: load }}>{children}</CatalogContext.Provider>
      )}
    </AppShell>
  );
}
