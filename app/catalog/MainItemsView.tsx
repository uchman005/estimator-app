"use client";

import { useState } from "react";
import Link from "next/link";
import { AssemblyCard } from "./components/AssemblyCard";
import { PageHeader } from "./components/PageHeader";
import { useCatalog } from "./CatalogProvider";
import type { AssemblyLite } from "@/lib/calc/engine";

export function MainItemsView() {
  const { assemblies, subItems, call } = useCatalog();
  const [filter, setFilter] = useState("");

  const visible = assemblies.filter(
    (a) => !filter.trim() || a.name.toLowerCase().includes(filter.toLowerCase()) || a.classCode.toLowerCase().includes(filter.toLowerCase())
  );
  const grouped: Record<string, AssemblyLite[]> = {};
  for (const a of visible) {
    const letter = a.classCode[0] || "Z";
    (grouped[letter] ??= []).push(a);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <PageHeader title="Main Items">
        The assemblies a project&apos;s BOQ is built from. A composite assembly&apos;s macro-items don&apos;t create their own
        private copies — they <em>assemble</em> existing{" "}
        <Link href="/catalog/sub-items" className="text-blueprint underline">sub-items</Link>, which in turn assemble
        existing <Link href="/catalog/micro-items" className="text-blueprint underline">micro-items</Link>, each at its own
        quantity. Edit a micro-item&apos;s rate once, and everything that assembles it in updates together.
      </PageHeader>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter assemblies by name or class code…"
        className="mb-5 w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-blueprint/40"
      />

      <h2 className="mb-2 text-[11px] font-semibold tracking-wide text-blueprint">ASSEMBLIES (MAIN ITEMS)</h2>
      <div className="mb-8 space-y-6">
        {Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([letter, list]) => (
            <div key={letter}>
              <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-muted">{letter}</h3>
              <div className="space-y-2">
                {list.map((assembly) => (
                  <AssemblyCard
                    key={assembly.id}
                    assembly={assembly}
                    subItemLibrary={subItems}
                    onPatchTierRates={(rates) => call(`/api/catalog/assemblies/${assembly.id}/tier-rates`, "PATCH", rates)}
                    onAddVariant={(label) => call(`/api/catalog/assemblies/${assembly.id}/variants`, "POST", { label, unitRateUsd: 0, laborPct: 40, materialPct: 60 })}
                    onChangeVariant={(variantId, patch) => call(`/api/catalog/variants/${variantId}`, "PATCH", patch)}
                    onDeleteVariant={(variantId) => call(`/api/catalog/variants/${variantId}`, "DELETE")}
                    onAddMacroItem={(name) => call(`/api/catalog/assemblies/${assembly.id}/macro-items`, "POST", { name })}
                    onRenameMacroItem={(macroItemId, name) => call(`/api/catalog/macro-items/${macroItemId}`, "PATCH", { name })}
                    onDeleteMacroItem={(macroItemId) => call(`/api/catalog/macro-items/${macroItemId}`, "DELETE")}
                    onAssembleSubItem={(macroItemId, subItemId, quantity) => call(`/api/catalog/macro-items/${macroItemId}/components`, "POST", { subItemId, quantity })}
                    onChangeMacroComponentQuantity={(joinId, quantity) => call(`/api/catalog/macro-item-components/${joinId}`, "PATCH", { quantity })}
                    onRemoveMacroComponent={(joinId) => call(`/api/catalog/macro-item-components/${joinId}`, "DELETE")}
                    onChangeMacroLabour={(macroItemId, labour) => call(`/api/catalog/macro-items/${macroItemId}`, "PATCH", { labour })}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
