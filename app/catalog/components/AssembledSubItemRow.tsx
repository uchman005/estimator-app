"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Form";
import { subItemRate, type MacroItemComponentLite, type Tier } from "@/lib/calc/engine";

export function AssembledSubItemRow({
  component,
  onChangeQuantity,
  onRemove,
}: {
  component: MacroItemComponentLite;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const [qty, setQty] = useState(component.quantity);
  const [expanded, setExpanded] = useState(false);
  const { subItem } = component;

  return (
    <div className="border-t border-border py-1.5 first:border-t-0 text-[12px]">
      <div className="grid grid-cols-[1fr_70px_70px_70px_70px_28px] items-center gap-2">
        <button onClick={() => setExpanded((v) => !v)} className="flex items-center gap-1.5 truncate text-left text-ink">
          <span className="text-muted">{expanded ? "▾" : "▸"}</span>
          {subItem.name}
        </button>
        <Input type="number" step="any" className="text-right font-mono" value={qty}
          onChange={(e) => setQty(parseFloat(e.target.value) || 0)} onBlur={() => onChangeQuantity(qty)} title="Quantity assembled into this macro-item" />
        {(["basic", "standard", "premium"] as Tier[]).map((tier) => (
          <span key={tier} className="text-right font-mono text-[11px] text-muted">{(qty * subItemRate(subItem, tier)).toFixed(1)}</span>
        ))}
        <button onClick={onRemove} className="h-5 w-5 justify-self-end rounded-sm border border-clay text-xs leading-none text-clay hover:bg-clay hover:text-white" title="Remove from this macro-item (doesn't delete the library sub-item)">
          ×
        </button>
      </div>
      {expanded && (
        <div className="mt-1.5 ml-4 space-y-0.5 border-l border-border pl-3">
          {subItem.components.map((c) => (
            <div key={c.joinId} className="flex justify-between text-[11px] text-muted">
              <span>{c.quantity} × {c.microItem.name}</span>
              <span className="font-mono">{(c.quantity * (c.microItem.rates.standard ?? 0)).toFixed(1)}</span>
            </div>
          ))}
          <Link href="/catalog/sub-items" className="inline-block pt-1 text-[10.5px] text-blueprint underline">
            Edit this sub-item&apos;s makeup on the Sub-Items page →
          </Link>
        </div>
      )}
    </div>
  );
}
