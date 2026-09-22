"use client";

import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { SubItemsLibraryPanel } from "../components/SubItemsLibraryPanel";
import { ImportPicker } from "@/components/catalog/ImportPicker";
import { useCatalog, type ProgramCatalog } from "../CatalogProvider";

export function SubItemsView() {
  const { programs, call, reload } = useCatalog();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <PageHeader title="Sub-Items">
        Reusable makeup groups, each assembled from existing micro-items at its own quantity — one library per program.
        One sub-item can be assembled into any number of that program&apos;s main-item macro-items — edit it here once
        and all of them recompute. Need one from another program&apos;s library? Import it.
      </PageHeader>

      <div className="space-y-6">
        {programs.map((program) => (
          <ProgramSubItems key={program.id} program={program} onMutate={call} onImported={reload} />
        ))}
      </div>
    </div>
  );
}

function ProgramSubItems({
  program,
  onMutate,
  onImported,
}: {
  program: ProgramCatalog;
  onMutate: (url: string, method: string, body?: unknown) => Promise<void>;
  onImported: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const canEdit = program.role === "owner" || program.role === "editor";

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[11.5px] font-medium tracking-wide text-on-accent bg-blueprint rounded-t-xl"
      >
        <span>{program.name.toUpperCase()}</span>
        <span className="font-mono text-[10px] opacity-80">{program.subItems.length} sub-items · {expanded ? "collapse" : "expand"}</span>
      </button>

      {expanded && (
        <div className="p-4">
          {canEdit && <ImportPicker programId={program.id} kind="subItem" onImported={onImported} />}
          <SubItemsLibraryPanel
            subItems={program.subItems}
            microItems={program.microItems}
            onCreate={(name) => onMutate("/api/catalog/sub-items", "POST", { name, programId: program.id })}
            onRename={(id, name) => onMutate(`/api/catalog/sub-items/${id}`, "PATCH", { name })}
            onDelete={(id) => onMutate(`/api/catalog/sub-items/${id}`, "DELETE")}
            onChangeLabour={(id, labour) => onMutate(`/api/catalog/sub-items/${id}`, "PATCH", { labour })}
            onAssembleMicroItem={(subItemId, microItemId, quantity) => onMutate(`/api/catalog/sub-items/${subItemId}/components`, "POST", { microItemId, quantity })}
            onChangeComponentQuantity={(joinId, quantity) => onMutate(`/api/catalog/sub-item-components/${joinId}`, "PATCH", { quantity })}
            onRemoveComponent={(joinId) => onMutate(`/api/catalog/sub-item-components/${joinId}`, "DELETE")}
          />
        </div>
      )}
    </div>
  );
}
