"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Form";
import type { Tier } from "@/lib/calc/engine";

export function LabourInputs({
  labour,
  onChange,
  label = "Assembly labour",
}: {
  labour: Record<Tier, number>;
  onChange: (labour: Record<Tier, number>) => void;
  label?: string;
}) {
  const [local, setLocal] = useState(labour);

  function commit(tier: Tier, value: number) {
    const next = { ...local, [tier]: value };
    setLocal(next);
    onChange(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="whitespace-nowrap text-[10.5px] text-muted" title="Added on top of the component sum — the cost of putting the pieces together, not another piece.">
        {label}:
      </span>
      {(["basic", "standard", "premium"] as Tier[]).map((tier) => (
        <label key={tier} className="flex items-center gap-1 text-[10px] text-muted">
          {tier[0].toUpperCase()}
          <Input
            type="number"
            step="any"
            className="w-16 text-right font-mono text-[11px]"
            value={local[tier]}
            onChange={(e) => setLocal((l) => ({ ...l, [tier]: parseFloat(e.target.value) || 0 }))}
            onBlur={() => commit(tier, local[tier])}
          />
        </label>
      ))}
    </div>
  );
}
