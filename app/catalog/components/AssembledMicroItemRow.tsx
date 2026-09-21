"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Form";
import type { SubItemComponentLite, Tier } from "@/lib/calc/engine";

export function AssembledMicroItemRow({
  component,
  onChangeQuantity,
  onRemove,
}: {
  component: SubItemComponentLite;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const [qty, setQty] = useState(component.quantity);
  const { microItem } = component;

  return (
    <div className="grid grid-cols-[1fr_60px_60px_60px_60px_60px_28px] items-center gap-2 border-t border-border py-1.5 first:border-t-0 text-[12px]">
      <span className="truncate text-ink">{microItem.name}</span>
      <span className="text-[11px] text-muted">{microItem.unit}</span>
      <Input type="number" step="any" className="text-right font-mono" value={qty}
        onChange={(e) => setQty(parseFloat(e.target.value) || 0)} onBlur={() => onChangeQuantity(qty)} title="Quantity assembled into this sub-item" />
      {(["basic", "standard", "premium"] as Tier[]).map((tier) => (
        <span key={tier} className="text-right font-mono text-[11px] text-muted">{(microItem.rates[tier] ?? 0).toFixed(1)}</span>
      ))}
      <button onClick={onRemove} className="h-5 w-5 justify-self-end rounded-sm border border-clay text-xs leading-none text-clay hover:bg-clay hover:text-white" title="Remove from this sub-item (doesn't delete the library micro-item)">
        ×
      </button>
    </div>
  );
}
