import { useState } from "react";
import { Select, Input } from "@/components/ui/Form";
import { ClassBadge } from "@/components/ui/Button";
import { fmtUsd } from "@/components/ui/Metrics";
import { rowUnitRate, compositeBreakdown, type AssemblyLite, type Tier, type ProjectItemLite } from "@/lib/calc/engine";
import type { ItemRow } from "./types";

export function BoqRow({
  item,
  assembly,
  groupedAssemblies,
  costIndex,
  onChange,
  onDelete,
}: {
  item: ItemRow;
  assembly: AssemblyLite | null;
  groupedAssemblies: Record<string, AssemblyLite[]>;
  costIndex: number;
  onChange: (patch: Partial<ItemRow>) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCustom = assembly?.name === "Custom / Other";
  const isComposite = assembly?.pricingMode === "composite";
  const itemLite: ProjectItemLite = {
    id: item.id, assembly, customLabel: item.customLabel, customUnit: item.customUnit, customUnifCode: item.customUnifCode,
    quantity: item.quantity, tier: item.tier, variantId: item.variantId, rateOverrideUsd: item.rateOverrideUsd,
    isAddon: item.isAddon, isIncluded: item.isIncluded,
  };
  const resolvedRate = rowUnitRate(itemLite); // single source of truth — same function the totals use
  const subtotal = item.isIncluded ? item.quantity * resolvedRate * costIndex : 0;
  const isOverridden = item.rateOverrideUsd != null;
  const breakdown = isComposite && assembly ? compositeBreakdown(assembly, item.tier ?? "standard") : [];

  return (
    <>
      <tr className={`border-b border-paper-line align-middle ${item.isIncluded ? "" : "opacity-40"}`}>
        <td className="py-1 pr-2">
          <ClassBadge code={isCustom ? item.customUnifCode || "Z" : assembly?.classCode ?? "Z"} />
        </td>
        <td className="min-w-[180px] py-1 pr-2">
          <div className="flex items-center gap-1.5">
            {isComposite && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="shrink-0 text-[10px] text-blueprint"
                title="Show makeup (macro-items & micro-items)"
              >
                {expanded ? "▾" : "▸"}
              </button>
            )}
            <Select
              value={assembly?.id ?? ""}
              onChange={(e) => onChange({ assemblyId: Number(e.target.value), variantId: null, rateOverrideUsd: null })}
            >
              {Object.entries(groupedAssemblies).map(([letter, list]) => (
                <optgroup key={letter} label={letter}>
                  {list.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.pricingMode === "composite" ? " (composite)" : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </div>
          {isCustom && (
            <Input
              className="mt-1"
              placeholder="Describe this item"
              value={item.customLabel ?? ""}
              onChange={(e) => onChange({ customLabel: e.target.value })}
            />
          )}
        </td>
        <td className="w-20 py-1 pr-2">
          <Input
            type="number"
            step="any"
            className="font-mono"
            value={item.quantity}
            onChange={(e) => onChange({ quantity: parseFloat(e.target.value) || 0 })}
          />
        </td>
        <td className="min-w-[150px] py-1 pr-2">
          {assembly?.hasVariants ? (
            <Select
              value={item.variantId ?? assembly.variants?.[0]?.id ?? ""}
              onChange={(e) => onChange({ variantId: Number(e.target.value), rateOverrideUsd: null })}
            >
              {assembly.variants?.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </Select>
          ) : (
            <Select value={item.tier ?? "standard"} onChange={(e) => onChange({ tier: e.target.value as Tier, rateOverrideUsd: null })}>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
            </Select>
          )}
        </td>
        <td className="w-28 py-1 pr-2 text-right">
          <Input
            type="number"
            step="any"
            className="text-right font-mono"
            value={resolvedRate}
            onChange={(e) => onChange({ rateOverrideUsd: parseFloat(e.target.value) || 0 })}
          />
          {isComposite && !isOverridden && (
            <div className="mt-0.5 text-right text-[9.5px] text-muted">
              Σ {breakdown.length} macro-item{breakdown.length === 1 ? "" : "s"}
            </div>
          )}
          {isComposite && isOverridden && (
            <button
              className="mt-0.5 block w-full text-right text-[9.5px] text-blueprint underline"
              onClick={() => onChange({ rateOverrideUsd: null })}
            >
              revert to Σ makeup
            </button>
          )}
        </td>
        <td className="py-1 pr-2 text-center">
          <input type="checkbox" checked={item.isAddon} onChange={(e) => onChange({ isAddon: e.target.checked })} />
        </td>
        <td className="py-1 pr-2 text-center">
          <input type="checkbox" checked={item.isIncluded} onChange={(e) => onChange({ isIncluded: e.target.checked })} />
        </td>
        <td className="py-1 pr-2 text-right font-mono">{fmtUsd(subtotal)}</td>
        <td>
          <button onClick={onDelete} className="h-5 w-5 rounded-sm border border-clay text-xs leading-none text-clay hover:bg-clay hover:text-white">
            ×
          </button>
        </td>
      </tr>
      {isComposite && expanded && (
        <tr className="border-b border-paper-line bg-paper/60">
          <td></td>
          <td colSpan={7} className="py-2 pl-4 pr-2">
            <div className="space-y-1">
              {breakdown.map((b) => (
                <div key={b.macroItemId} className="flex justify-between text-[11px]">
                  <span className="text-muted">{b.name}</span>
                  <span className="font-mono">{b.subtotal.toFixed(1)} / {assembly?.unit}</span>
                </div>
              ))}
              <a href="/catalog" className="inline-block pt-1 text-[10.5px] text-blueprint underline">
                Manage macro-items & micro-item rates in the Rate Book →
              </a>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
