import { Panel } from "@/components/ui/Panel";
import type { AaceClass } from "@/lib/calc/engine";

export function AaceClassPanel({
  classes,
  selected,
  onSelect,
}: {
  classes: AaceClass[];
  selected: number;
  onSelect: (classNumber: number, contingencyPct: number) => void;
}) {
  const current = classes.find((c) => c.classNumber === selected);
  return (
    <Panel title="02 — ESTIMATE CLASS (AACE-ALIGNED)">
      <div className="flex flex-wrap gap-1.5">
        {classes.map((c) => (
          <button
            key={c.classNumber}
            onClick={() => onSelect(c.classNumber, c.contingencyPct)}
            className={`min-w-[80px] flex-1 border px-2 py-1.5 text-center text-[11px] transition-colors ${
              selected === c.classNumber ? "border-blueprint bg-blueprint text-on-accent" : "border-border hover:border-blueprint"
            }`}
          >
            Class {c.classNumber}
            <br />
            <span className="text-[9.5px]">
              {c.bandLowPct}% / +{c.bandHighPct}%
            </span>
          </button>
        ))}
      </div>
      {current && <p className="mt-1.5 text-[11px] text-muted">{current.description}</p>}
    </Panel>
  );
}
