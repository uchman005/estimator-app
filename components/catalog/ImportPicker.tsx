"use client";

import { useEffect, useState } from "react";
import { Field, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

type Kind = "assembly" | "subItem" | "microItem";

const KIND_LABEL: Record<Kind, string> = { assembly: "Main Item", subItem: "sub-item", microItem: "micro-item" };

export function ImportPicker({ programId, kind, onImported }: { programId: number; kind: Kind; onImported: () => void }) {
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<{ id: number; name: string; isTemplate: boolean }[] | null>(null);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [items, setItems] = useState<{ id: number; name: string }[] | null>(null);
  const [importingId, setImportingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open || sources) return;
    fetch(`/api/programs/${programId}/catalog/sources`)
      .then((r) => r.json())
      .then((rows) => {
        setSources(rows);
        if (rows[0]) setSourceId(rows[0].id);
      });
  }, [open, sources, programId]);

  useEffect(() => {
    if (!open || sourceId == null) return;
    setItems(null);
    fetch(`/api/programs/${programId}/catalog/import?sourceProgramId=${sourceId}&kind=${kind}`)
      .then((r) => r.json())
      .then(setItems);
  }, [open, sourceId, kind, programId]);

  async function importItem(itemId: number) {
    setImportingId(itemId);
    try {
      await fetch(`/api/programs/${programId}/catalog/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceProgramId: sourceId, kind, itemId }),
      });
      onImported();
    } finally {
      setImportingId(null);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[11px] text-blueprint underline">
        Import a {KIND_LABEL[kind]} from another program…
      </button>
    );
  }

  return (
    <div className="mb-3 rounded-lg border border-border bg-surface-alt p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-blueprint">IMPORT {KIND_LABEL[kind].toUpperCase()}</span>
        <button onClick={() => setOpen(false)} className="text-[11px] text-muted underline">
          Close
        </button>
      </div>

      {!sources ? (
        <p className="text-[11.5px] text-muted">Loading programs…</p>
      ) : sources.length === 0 ? (
        <p className="text-[11.5px] text-muted">No other programs to import from yet.</p>
      ) : (
        <>
          <Field label="Source program" className="mb-2 max-w-xs">
            <Select value={sourceId ?? ""} onChange={(e) => setSourceId(Number(e.target.value))}>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.isTemplate ? " (starter catalog)" : ""}
                </option>
              ))}
            </Select>
          </Field>

          {!items ? (
            <p className="text-[11.5px] text-muted">Loading items…</p>
          ) : items.length === 0 ? (
            <p className="text-[11.5px] text-muted">That program&apos;s catalog has no {KIND_LABEL[kind]}s.</p>
          ) : (
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {items.map((it) => (
                <div key={it.id} className="flex items-center justify-between rounded-md border border-paper-line px-2 py-1 text-[12px]">
                  <span className="truncate">{it.name}</span>
                  <Button variant="ghost" onClick={() => importItem(it.id)} disabled={importingId === it.id}>
                    {importingId === it.id ? "Importing…" : "Import"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
