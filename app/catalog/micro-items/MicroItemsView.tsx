"use client";

import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { MicroItemsLibraryPanel } from "../components/MicroItemsLibraryPanel";
import { ImportPicker } from "@/components/catalog/ImportPicker";
import { useCatalog, type ProgramCatalog } from "../CatalogProvider";

export function MicroItemsView() {
  const { programs, call, reload } = useCatalog();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <PageHeader title="Micro-Items">
        The priced leaves of the rate book — a door, a m² of wall, a beam — one library per program. Every sub-item,
        macro-item and facility in that program that assembles a micro-item picks up its rate from here. Need one from
        another program&apos;s library? Import it.
      </PageHeader>

      <div className="space-y-6">
        {programs.map((program) => (
          <ProgramMicroItems key={program.id} program={program} onMutate={call} onImported={reload} />
        ))}
      </div>
    </div>
  );
}

function ProgramMicroItems({
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
        <span className="font-mono text-[10px] opacity-80">{program.microItems.length} micro-items · {expanded ? "collapse" : "expand"}</span>
      </button>

      {expanded && (
        <div className="p-4">
          {canEdit && <ImportPicker programId={program.id} kind="microItem" onImported={onImported} />}
          <MicroItemsLibraryPanel
            microItems={program.microItems}
            onCreate={(spec) => onMutate("/api/catalog/micro-items", "POST", { ...spec, programId: program.id, rates: { basic: 0, standard: 0, premium: 0 } })}
            onChange={(id, patch) => onMutate(`/api/catalog/micro-items/${id}`, "PATCH", patch)}
            onDelete={(id) => onMutate(`/api/catalog/micro-items/${id}`, "DELETE")}
          />
        </div>
      )}
    </div>
  );
}
