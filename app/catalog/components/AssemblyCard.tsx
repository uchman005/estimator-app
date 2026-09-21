"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { ClassBadge } from "@/components/ui/Button";
import { MacroItemBlock } from "./MacroItemBlock";
import { compositeAssemblyRate, type AssemblyLite, type SubItemLite, type Tier } from "@/lib/calc/engine";

const MODE_LABEL: Record<AssemblyLite["pricingMode"], string> = {
  tier: "tier rate",
  variant: "material options",
  composite: "composite (Σ makeup)",
};

export function AssemblyCard({
  assembly,
  subItemLibrary,
  onPatchTierRates,
  onAddVariant,
  onChangeVariant,
  onDeleteVariant,
  onAddMacroItem,
  onRenameMacroItem,
  onDeleteMacroItem,
  onAssembleSubItem,
  onChangeMacroComponentQuantity,
  onRemoveMacroComponent,
  onChangeMacroLabour,
}: {
  assembly: AssemblyLite;
  subItemLibrary: SubItemLite[];
  onPatchTierRates: (rates: { basic: number; standard: number; premium: number }) => void;
  onAddVariant: (label: string) => void;
  onChangeVariant: (variantId: number, patch: { label?: string; unitRateUsd?: number }) => void;
  onDeleteVariant: (variantId: number) => void;
  onAddMacroItem: (name: string) => void;
  onRenameMacroItem: (macroItemId: number, name: string) => void;
  onDeleteMacroItem: (macroItemId: number) => void;
  onAssembleSubItem: (macroItemId: number, subItemId: number, quantity: number) => void;
  onChangeMacroComponentQuantity: (joinId: number, quantity: number) => void;
  onRemoveMacroComponent: (joinId: number) => void;
  onChangeMacroLabour: (macroItemId: number, labour: Record<Tier, number>) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-surface shadow-sm">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="flex min-w-0 items-center gap-2.5">
          <ClassBadge code={assembly.classCode} />
          <span className="truncate text-[13px] font-medium text-ink">{assembly.name}</span>
          <span className="whitespace-nowrap text-[10.5px] text-muted">{assembly.unit}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted">{MODE_LABEL[assembly.pricingMode]}</span>
          <span className="text-muted">{open ? "▾" : "▸"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-border p-4">
          {assembly.pricingMode === "tier" && <TierEditor assembly={assembly} onSave={onPatchTierRates} />}
          {assembly.pricingMode === "variant" && (
            <VariantEditor assembly={assembly} onAdd={onAddVariant} onChange={onChangeVariant} onDelete={onDeleteVariant} />
          )}
          {assembly.pricingMode === "composite" && (
            <CompositeEditor
              assembly={assembly}
              subItemLibrary={subItemLibrary}
              onAddMacroItem={onAddMacroItem}
              onRenameMacroItem={onRenameMacroItem}
              onDeleteMacroItem={onDeleteMacroItem}
              onAssembleSubItem={onAssembleSubItem}
              onChangeMacroComponentQuantity={onChangeMacroComponentQuantity}
              onRemoveMacroComponent={onRemoveMacroComponent}
              onChangeMacroLabour={onChangeMacroLabour}
            />
          )}
        </div>
      )}
    </div>
  );
}

function TierEditor({ assembly, onSave }: { assembly: AssemblyLite; onSave: (r: { basic: number; standard: number; premium: number }) => void }) {
  const [rates, setRates] = useState({
    basic: assembly.tierRates?.basic ?? 0,
    standard: assembly.tierRates?.standard ?? 0,
    premium: assembly.tierRates?.premium ?? 0,
  });
  return (
    <div className="grid grid-cols-3 gap-3">
      {(["basic", "standard", "premium"] as const).map((tier) => (
        <label key={tier} className="flex flex-col gap-1 text-[11px] text-muted">
          {tier} ({assembly.unit})
          <Input
            type="number"
            step="any"
            className="font-mono"
            value={rates[tier]}
            onChange={(e) => setRates((r) => ({ ...r, [tier]: parseFloat(e.target.value) || 0 }))}
            onBlur={() => onSave(rates)}
          />
        </label>
      ))}
    </div>
  );
}

function VariantEditor({
  assembly,
  onAdd,
  onChange,
  onDelete,
}: {
  assembly: AssemblyLite;
  onAdd: (label: string) => void;
  onChange: (variantId: number, patch: { label?: string; unitRateUsd?: number }) => void;
  onDelete: (variantId: number) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  return (
    <div className="space-y-2">
      {assembly.variants?.map((v) => (
        <VariantRow key={v.id} variant={v} unit={assembly.unit} onChange={(p) => onChange(v.id, p)} onDelete={() => onDelete(v.id)} />
      ))}
      <div className="flex items-center gap-2 pt-1">
        <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="New material option" className="max-w-[260px]" />
        <Button
          variant="addBorder"
          className="text-[11px]"
          onClick={() => {
            if (!newLabel.trim()) return;
            onAdd(newLabel.trim());
            setNewLabel("");
          }}
        >
          + option
        </Button>
      </div>
    </div>
  );
}
function VariantRow({
  variant, unit, onChange, onDelete,
}: {
  variant: { id: number; label: string; unitRateUsd: number }; unit: string;
  onChange: (patch: { label?: string; unitRateUsd?: number }) => void; onDelete: () => void;
}) {
  const [label, setLabel] = useState(variant.label);
  const [rate, setRate] = useState(variant.unitRateUsd);
  return (
    <div className="grid grid-cols-[1fr_110px_24px] items-center gap-2 border-t border-border pt-2 first:border-t-0 first:pt-0">
      <Input value={label} onChange={(e) => setLabel(e.target.value)} onBlur={() => label !== variant.label && onChange({ label })} />
      <div className="flex items-center gap-1">
        <Input type="number" step="any" className="text-right font-mono" value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value) || 0)} onBlur={() => onChange({ unitRateUsd: rate })} />
        <span className="whitespace-nowrap text-[10px] text-muted">/{unit}</span>
      </div>
      <button onClick={onDelete} className="h-5 w-5 justify-self-end rounded-sm border border-clay text-xs leading-none text-clay hover:bg-clay hover:text-white">×</button>
    </div>
  );
}

function CompositeEditor({
  assembly, subItemLibrary, onAddMacroItem, onRenameMacroItem, onDeleteMacroItem, onAssembleSubItem, onChangeMacroComponentQuantity, onRemoveMacroComponent, onChangeMacroLabour,
}: {
  assembly: AssemblyLite;
  subItemLibrary: SubItemLite[];
  onAddMacroItem: (name: string) => void;
  onRenameMacroItem: (macroItemId: number, name: string) => void;
  onDeleteMacroItem: (macroItemId: number) => void;
  onAssembleSubItem: (macroItemId: number, subItemId: number, quantity: number) => void;
  onChangeMacroComponentQuantity: (joinId: number, quantity: number) => void;
  onRemoveMacroComponent: (joinId: number) => void;
  onChangeMacroLabour: (macroItemId: number, labour: Record<Tier, number>) => void;
}) {
  const [newMacroName, setNewMacroName] = useState("");
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-surface-alt px-3 py-2 text-[12px]">
        <span className="text-muted">Aggregated rate (Σ across every macro-item → sub-item → micro-item below):</span>
        {(["basic", "standard", "premium"] as const).map((tier) => (
          <span key={tier} className="font-mono">
            {tier}: <b>{compositeAssemblyRate(assembly, tier).toFixed(1)}</b>
          </span>
        ))}
        <span className="text-muted">/ {assembly.unit}</span>
      </div>

      <div className="space-y-2">
        {assembly.macroItems?.map((macro) => (
          <MacroItemBlock
            key={macro.id}
            macroItem={macro}
            subItemLibrary={subItemLibrary}
            onRename={(name) => onRenameMacroItem(macro.id, name)}
            onDelete={() => onDeleteMacroItem(macro.id)}
            onAssembleSubItem={(subItemId, quantity) => onAssembleSubItem(macro.id, subItemId, quantity)}
            onChangeComponentQuantity={onChangeMacroComponentQuantity}
            onRemoveComponent={onRemoveMacroComponent}
            onChangeLabour={(labour) => onChangeMacroLabour(macro.id, labour)}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Input value={newMacroName} onChange={(e) => setNewMacroName(e.target.value)} placeholder="New macro-item (makeup group)" className="max-w-[260px]" />
        <Button
          variant="addBorder"
          className="text-[11px]"
          onClick={() => {
            if (!newMacroName.trim()) return;
            onAddMacroItem(newMacroName.trim());
            setNewMacroName("");
          }}
        >
          + macro-item
        </Button>
      </div>
    </div>
  );
}
