"use client";

import { useState } from "react";
import Link from "next/link";
import { AssemblyCard } from "./components/AssemblyCard";
import { PageHeader } from "./components/PageHeader";
import { ImportPicker } from "@/components/catalog/ImportPicker";
import { useCatalog, type ProgramCatalog } from "./CatalogProvider";
import type { AssemblyLite } from "@/lib/calc/engine";

export function MainItemsView() {
  const { programs, call, reload } = useCatalog();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <PageHeader title="Main Items">
        The assemblies a facility&apos;s BOQ is built from — one catalog per program. A composite assembly&apos;s
        macro-items don&apos;t create their own private copies — they <em>assemble</em> existing{" "}
        <Link href="/catalog/sub-items" className="text-blueprint underline">sub-items</Link>, which in turn assemble
        existing <Link href="/catalog/micro-items" className="text-blueprint underline">micro-items</Link>, each at its own
        quantity, all within that program&apos;s own catalog. Edit a micro-item&apos;s rate once, and everything that
        assembles it in updates together — need something from another program&apos;s catalog? Import it.
      </PageHeader>

      <div className="space-y-6">
        {programs.map((program) => (
          <ProgramMainItems key={program.id} program={program} onMutate={call} onImported={reload} />
        ))}
      </div>
    </div>
  );
}

function ProgramMainItems({
  program,
  onMutate,
  onImported,
}: {
  program: ProgramCatalog;
  onMutate: (url: string, method: string, body?: unknown) => Promise<void>;
  onImported: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [filter, setFilter] = useState("");
  const canEdit = program.role === "owner" || program.role === "editor";

  const visible = program.assemblies.filter(
    (a) => !filter.trim() || a.name.toLowerCase().includes(filter.toLowerCase()) || a.classCode.toLowerCase().includes(filter.toLowerCase())
  );
  const grouped: Record<string, AssemblyLite[]> = {};
  for (const a of visible) {
    const letter = a.classCode[0] || "Z";
    (grouped[letter] ??= []).push(a);
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[11.5px] font-medium tracking-wide text-on-accent bg-blueprint rounded-t-xl"
      >
        <span>{program.name.toUpperCase()}</span>
        <span className="font-mono text-[10px] opacity-80">{program.assemblies.length} main items · {expanded ? "collapse" : "expand"}</span>
      </button>

      {expanded && (
        <div className="p-4">
          {canEdit && <ImportPicker programId={program.id} kind="assembly" onImported={onImported} />}

          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter assemblies by name or class code…"
            className="mb-4 w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-[13px] text-ink focus:outline-none focus:ring-2 focus:ring-blueprint/40"
          />

          <div className="space-y-6">
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
                        subItemLibrary={program.subItems}
                        onPatchTierRates={(rates) => onMutate(`/api/catalog/assemblies/${assembly.id}/tier-rates`, "PATCH", rates)}
                        onAddVariant={(label) => onMutate(`/api/catalog/assemblies/${assembly.id}/variants`, "POST", { label, unitRateUsd: 0, laborPct: 40, materialPct: 60 })}
                        onChangeVariant={(variantId, patch) => onMutate(`/api/catalog/variants/${variantId}`, "PATCH", patch)}
                        onDeleteVariant={(variantId) => onMutate(`/api/catalog/variants/${variantId}`, "DELETE")}
                        onAddMacroItem={(name) => onMutate(`/api/catalog/assemblies/${assembly.id}/macro-items`, "POST", { name })}
                        onRenameMacroItem={(macroItemId, name) => onMutate(`/api/catalog/macro-items/${macroItemId}`, "PATCH", { name })}
                        onDeleteMacroItem={(macroItemId) => onMutate(`/api/catalog/macro-items/${macroItemId}`, "DELETE")}
                        onAssembleSubItem={(macroItemId, subItemId, quantity) => onMutate(`/api/catalog/macro-items/${macroItemId}/components`, "POST", { subItemId, quantity })}
                        onChangeMacroComponentQuantity={(joinId, quantity) => onMutate(`/api/catalog/macro-item-components/${joinId}`, "PATCH", { quantity })}
                        onRemoveMacroComponent={(joinId) => onMutate(`/api/catalog/macro-item-components/${joinId}`, "DELETE")}
                        onChangeMacroLabour={(macroItemId, labour) => onMutate(`/api/catalog/macro-items/${macroItemId}`, "PATCH", { labour })}
                      />
                    ))}
                  </div>
                </div>
              ))}
            {visible.length === 0 && <p className="text-[11.5px] text-muted">No assemblies match &quot;{filter}&quot;.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
