"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import type { AssemblyLite, MicroItemLite, SubItemLite } from "@/lib/calc/engine";

type CatalogContextValue = {
  assemblies: AssemblyLite[];
  subItems: SubItemLite[];
  microItems: MicroItemLite[];
  /** Fire a mutation, then reload the whole rate book so every page stays in sync. */
  call: (url: string, method: string, body?: unknown) => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside <CatalogProvider>");
  return ctx;
}

/**
 * Wraps every /catalog/* page: renders the app shell once (so the sidebar persists across the
 * main / sub / micro pages) and loads the rate book once, shared between them.
 */
export function CatalogProvider({ currentUserEmail, children }: { currentUserEmail: string; children: React.ReactNode }) {
  const [assemblies, setAssemblies] = useState<AssemblyLite[] | null>(null);
  const [subItems, setSubItems] = useState<SubItemLite[] | null>(null);
  const [microItems, setMicroItems] = useState<MicroItemLite[] | null>(null);

  const load = useCallback(async () => {
    const [refRes, libRes] = await Promise.all([fetch("/api/reference"), fetch("/api/catalog/library")]);
    const refData = await refRes.json();
    const libData = await libRes.json();
    setAssemblies(refData.assemblies);
    setSubItems(libData.subItems);
    setMicroItems(libData.microItems);
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
      {!assemblies || !subItems || !microItems ? (
        <div className="p-10 text-sm text-muted">Loading rate book…</div>
      ) : (
        <CatalogContext.Provider value={{ assemblies, subItems, microItems, call }}>{children}</CatalogContext.Provider>
      )}
    </AppShell>
  );
}
