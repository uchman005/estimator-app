"use client";

import { useState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { Input, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { AssembledMicroItemRow } from "./AssembledMicroItemRow";
import { LabourInputs } from "./LabourInputs";
import { subItemRate, type MicroItemLite, type SubItemLite, type Tier } from "@/lib/calc/engine";

export function SubItemsLibraryPanel({
  subItems,
  microItems,
  onCreate,
  onRename,
  onDelete,
  onChangeLabour,
  onAssembleMicroItem,
  onChangeComponentQuantity,
  onRemoveComponent,
}: {
  subItems: SubItemLite[];
  microItems: MicroItemLite[];
  onCreate: (name: string) => void;
  onRename: (id: number, name: string) => void;
  onDelete: (id: number) => void;
  onChangeLabour: (id: number, labour: Record<Tier, number>) => void;
  onAssembleMicroItem: (subItemId: number, microItemId: number, quantity: number) => void;
  onChangeComponentQuantity: (joinId: number, quantity: number) => void;
  onRemoveComponent: (joinId: number) => void;
}) {
  const [newName, setNewName] = useState("");

  return (
    <Panel title="SUB-ITEMS LIBRARY" eyebrow={`${subItems.length} defined`}>
      <p className="mb-3 text-[11.5px] text-muted">
        Reusable &ldquo;makeup&rdquo; groups — e.g. &ldquo;Theatre Envelope&rdquo; — each assembled from a pick-list of{" "}
        <Link href="/catalog/micro-items" className="text-blueprint underline">micro-items</Link>, with its own quantity
        per micro-item. The same sub-item can be assembled into any number of macro-items; edit it once here and every
        macro-item using it recomputes.
      </p>

      <div className="space-y-2">
        {subItems.map((s) => (
          <SubItemLibraryCard
            key={s.id}
            subItem={s}
            microItems={microItems}
            onRename={(name) => onRename(s.id, name)}
            onDelete={() => onDelete(s.id)}
            onChangeLabour={(labour) => onChangeLabour(s.id, labour)}
            onAssembleMicroItem={(microItemId, quantity) => onAssembleMicroItem(s.id, microItemId, quantity)}
            onChangeComponentQuantity={onChangeComponentQuantity}
            onRemoveComponent={onRemoveComponent}
          />
        ))}
        {subItems.length === 0 && <p className="py-3 text-center text-[12px] text-muted">No sub-items yet.</p>}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New sub-item name" className="max-w-[280px] flex-1" />
        <Button
          variant="addBorder"
          className="text-[11px]"
          onClick={() => {
            if (!newName.trim()) return;
            onCreate(newName.trim());
            setNewName("");
          }}
        >
          + sub-item
        </Button>
      </div>
    </Panel>
  );
}

function SubItemLibraryCard({
  subItem, microItems, onRename, onDelete, onChangeLabour, onAssembleMicroItem, onChangeComponentQuantity, onRemoveComponent,
}: {
  subItem: SubItemLite;
  microItems: MicroItemLite[];
  onRename: (name: string) => void;
  onDelete: () => void;
  onChangeLabour: (labour: Record<Tier, number>) => void;
  onAssembleMicroItem: (microItemId: number, quantity: number) => void;
  onChangeComponentQuantity: (joinId: number, quantity: number) => void;
  onRemoveComponent: (joinId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(subItem.name);
  const [pickId, setPickId] = useState<number | "">("");
  const [pickQty, setPickQty] = useState(1);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 bg-surface-alt px-3 py-2 text-left">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-muted">{open ? "▾" : "▸"}</span>
          <span className="truncate text-[12.5px] font-medium text-ink">{subItem.name}</span>
          <span className="whitespace-nowrap rounded-md bg-surface px-1.5 py-0.5 text-[10px] text-muted">
            {subItem.components.length} micro-item{subItem.components.length === 1 ? "" : "s"}
          </span>
        </div>
        <span className="whitespace-nowrap font-mono text-[11px] text-muted">
          Σ {subItemRate(subItem, "basic").toFixed(1)} / {subItemRate(subItem, "standard").toFixed(1)} / {subItemRate(subItem, "premium").toFixed(1)}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border bg-bg/30 p-4">
          <div className="flex items-center justify-between gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== subItem.name && onRename(name)} className="max-w-[320px]" />
            <button onClick={onDelete} className="whitespace-nowrap text-[11px] text-clay underline">delete from library</button>
          </div>

          <LabourInputs labour={subItem.labour} onChange={onChangeLabour} label="Fitting/assembly labour" />

          <div className="rounded-lg border border-border bg-surface p-3">
            <div className="mb-2 grid grid-cols-[1fr_60px_60px_60px_60px_60px_28px] gap-2 border-b border-border pb-2 text-[10px] font-medium uppercase tracking-wide text-muted">
              <span>Micro-item</span><span>Unit</span><span className="text-right">Qty</span>
              <span className="text-right">Basic</span><span className="text-right">Standard</span><span className="text-right">Premium</span><span></span>
            </div>
            {subItem.components.length === 0 && <p className="py-3 text-center text-[12px] text-muted">Not assembled from anything yet.</p>}
            {subItem.components.map((c) => (
              <AssembledMicroItemRow key={c.joinId} component={c} onChangeQuantity={(q) => onChangeComponentQuantity(c.joinId, q)} onRemove={() => onRemoveComponent(c.joinId)} />
            ))}

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <Select value={pickId} onChange={(e) => setPickId(e.target.value ? Number(e.target.value) : "")} className="max-w-[240px] flex-1">
                <option value="">Assemble a micro-item…</option>
                {microItems.map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                ))}
              </Select>
              <Input type="number" step="any" value={pickQty} onChange={(e) => setPickQty(parseFloat(e.target.value) || 0)} className="w-16 font-mono" title="Quantity" />
              <Button
                variant="addBorder"
                className="text-[11px]"
                onClick={() => {
                  if (!pickId) return;
                  onAssembleMicroItem(pickId, pickQty);
                  setPickId("");
                }}
              >
                + assemble
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
