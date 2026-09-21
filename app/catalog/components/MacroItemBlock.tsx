"use client";

import { useState } from "react";
import { Input, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { AssembledSubItemRow } from "./AssembledSubItemRow";
import { LabourInputs } from "./LabourInputs";
import { subItemRate, type MacroItemLite, type SubItemLite, type Tier } from "@/lib/calc/engine";

export function MacroItemBlock({
  macroItem,
  subItemLibrary,
  onRename,
  onDelete,
  onChangeLabour,
  onAssembleSubItem,
  onChangeComponentQuantity,
  onRemoveComponent,
}: {
  macroItem: MacroItemLite;
  subItemLibrary: SubItemLite[];
  onRename: (name: string) => void;
  onDelete: () => void;
  onChangeLabour: (labour: Record<Tier, number>) => void;
  onAssembleSubItem: (subItemId: number, quantity: number) => void;
  onChangeComponentQuantity: (joinId: number, quantity: number) => void;
  onRemoveComponent: (joinId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(macroItem.name);
  const [pickId, setPickId] = useState<number | "">("");
  const [pickQty, setPickQty] = useState(1);

  const subtotal = (tier: Tier) =>
    macroItem.components.reduce((s, c) => s + c.quantity * subItemRate(c.subItem, tier), 0) + (macroItem.labour[tier] ?? 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {/* Collapsed summary pill — a named group assembled from existing
          library sub-items, with its own running subtotal. */}
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 bg-surface px-3.5 py-2.5 text-left">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted">{open ? "▾" : "▸"}</span>
          <span className="truncate text-[13px] font-semibold text-ink">{macroItem.name}</span>
          <span className="whitespace-nowrap rounded-md bg-surface-alt px-1.5 py-0.5 text-[10px] text-muted">
            {macroItem.components.length} sub-item{macroItem.components.length === 1 ? "" : "s"}
          </span>
        </div>
        <span className="whitespace-nowrap font-mono text-[11px] text-muted">
          Σ {subtotal("basic").toFixed(1)} / {subtotal("standard").toFixed(1)} / {subtotal("premium").toFixed(1)}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border bg-surface-alt/40 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <label className="flex flex-1 flex-col gap-1 text-[11px] text-muted">
              Macro-item name
              <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== macroItem.name && onRename(name)} className="max-w-[320px]" />
            </label>
            <button onClick={onDelete} className="whitespace-nowrap text-[11px] text-clay underline">remove this macro-item</button>
          </div>

          <LabourInputs labour={macroItem.labour} onChange={onChangeLabour} label="Coordination/commissioning labour" />

          <div className="rounded-lg border border-border bg-surface p-3">
            {macroItem.components.length === 0 && (
              <p className="py-2 text-center text-[12px] text-muted">Not assembled from anything yet — pick a sub-item below.</p>
            )}
            {macroItem.components.map((c) => (
              <AssembledSubItemRow key={c.joinId} component={c} onChangeQuantity={(q) => onChangeComponentQuantity(c.joinId, q)} onRemove={() => onRemoveComponent(c.joinId)} />
            ))}

            {/* This is the "assembly" step — pick an EXISTING sub-item from
                the reusable library rather than creating a private copy. */}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Select value={pickId} onChange={(e) => setPickId(e.target.value ? Number(e.target.value) : "")} className="max-w-[260px] flex-1">
                <option value="">Assemble a sub-item…</option>
                {subItemLibrary.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <Input type="number" step="any" value={pickQty} onChange={(e) => setPickQty(parseFloat(e.target.value) || 0)} className="w-16 font-mono" title="Quantity" />
              <Button
                variant="addBorder"
                className="text-[11px]"
                onClick={() => {
                  if (!pickId) return;
                  onAssembleSubItem(pickId, pickQty);
                  setPickId("");
                }}
              >
                + assemble
              </Button>
            </div>
            <p className="text-[10.5px] text-muted">
              Don&apos;t see the sub-item you need? Create it in the Sub-Items Library below, then come back here to assemble it in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
