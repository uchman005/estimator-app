"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import type { MicroItemLite } from "@/lib/calc/engine";

export function MicroItemsLibraryPanel({
  microItems,
  onCreate,
  onChange,
  onDelete,
}: {
  microItems: MicroItemLite[];
  onCreate: (spec: { name: string; unit: string }) => void;
  onChange: (id: number, patch: { name?: string; unit?: string; rates?: { basic: number; standard: number; premium: number } }) => void;
  onDelete: (id: number) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("m²");

  return (
    <Panel title="MICRO-ITEMS LIBRARY" eyebrow={`${microItems.length} defined`}>
      <p className="mb-3 text-[11.5px] text-muted">
        The actual priced leaves — a door, a m² of wall, a beam. Defined once here, then assembled into any number of
        sub-items with their own quantity. Editing a rate here changes every sub-item (and every macro-item, and every
        project) that assembles this micro-item in.
      </p>

      <div className="mb-2 grid grid-cols-[1fr_90px_70px_70px_70px_28px] gap-2 border-b border-border pb-2 text-[10px] font-medium uppercase tracking-wide text-muted">
        <span>Name</span>
        <span>Unit</span>
        <span className="text-right">Basic</span>
        <span className="text-right">Standard</span>
        <span className="text-right">Premium</span>
        <span></span>
      </div>

      <div className="max-h-[65vh] overflow-y-auto">
        {microItems.map((m) => (
          <MicroItemLibraryRow key={m.id} microItem={m} onChange={(patch) => onChange(m.id, patch)} onDelete={() => onDelete(m.id)} />
        ))}
        {microItems.length === 0 && <p className="py-3 text-center text-[12px] text-muted">No micro-items yet.</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New micro-item name" className="max-w-[260px] flex-1" />
        <Input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="unit" className="w-20" />
        <Button
          variant="addBorder"
          className="text-[11px]"
          onClick={() => {
            if (!newName.trim()) return;
            onCreate({ name: newName.trim(), unit: newUnit.trim() || "unit" });
            setNewName("");
          }}
        >
          + micro-item
        </Button>
      </div>
    </Panel>
  );
}

function MicroItemLibraryRow({
  microItem,
  onChange,
  onDelete,
}: {
  microItem: MicroItemLite;
  onChange: (patch: { name?: string; unit?: string; rates?: { basic: number; standard: number; premium: number } }) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(microItem.name);
  const [unit, setUnit] = useState(microItem.unit);
  const [rates, setRates] = useState({
    basic: microItem.rates.basic ?? 0,
    standard: microItem.rates.standard ?? 0,
    premium: microItem.rates.premium ?? 0,
  });

  function commitRate(tier: "basic" | "standard" | "premium", value: number) {
    const next = { ...rates, [tier]: value };
    setRates(next);
    onChange({ rates: next });
  }

  return (
    <div className="grid grid-cols-[1fr_90px_70px_70px_70px_28px] items-center gap-2 border-t border-border py-1.5 first:border-t-0">
      <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== microItem.name && onChange({ name })} className="text-[12px]" />
      <Input value={unit} onChange={(e) => setUnit(e.target.value)} onBlur={() => unit !== microItem.unit && onChange({ unit })} className="text-[11.5px]" />
      {(["basic", "standard", "premium"] as const).map((tier) => (
        <RateInput key={tier} value={rates[tier]} onCommit={(v) => commitRate(tier, v)} />
      ))}
      <button onClick={onDelete} className="h-5 w-5 justify-self-end rounded-sm border border-clay text-xs leading-none text-clay hover:bg-clay hover:text-white">
        ×
      </button>
    </div>
  );
}

function RateInput({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [local, setLocal] = useState(value);
  return (
    <Input type="number" step="any" className="text-right font-mono text-[12px]" value={local}
      onChange={(e) => setLocal(parseFloat(e.target.value) || 0)} onBlur={() => onCommit(local)} />
  );
}
