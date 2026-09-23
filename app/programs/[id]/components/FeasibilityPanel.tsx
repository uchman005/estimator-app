import { Panel } from "@/components/ui/Panel";
import { fmtUsd } from "@/components/ui/Metrics";
import type { FeasibilityResult } from "@/lib/calc/engine";

const VERDICT_COPY: Record<FeasibilityResult["verdict"], (f: FeasibilityResult) => { title: string; desc: string; color: string }> = {
  not_feasible: (f) => ({
    title: "Not feasible as currently scoped",
    desc: `Funding gap of ${fmtUsd(f.gap)} exceeds half the estimated cost — close it or cut scope before committing.`,
    color: "var(--color-clay)",
  }),
  conditional_funding: (f) => ({
    title: "Feasible with conditions",
    desc: `A funding gap of ${fmtUsd(f.gap)} remains — buildable if closed on a realistic timeline.`,
    color: "var(--color-amber)",
  }),
  conditional_ops: (f) => ({
    title: "Capital feasible, operations fragile",
    desc: `Revenue covers only ${Math.round(f.sustainabilityRatio)}% of estimated annual operating cost.`,
    color: "var(--color-amber)",
  }),
  feasible: () => ({
    title: "Feasible",
    desc: "Capital is funded and the operating model is expected to cover its own running costs.",
    color: "var(--color-green)",
  }),
};

export function FeasibilityPanel({ feasibility }: { feasibility: FeasibilityResult }) {
  const copy = VERDICT_COPY[feasibility.verdict](feasibility);
  return (
    <Panel title="PROGRAM FEASIBILITY VERDICT">
      <div className="mb-2 border-l-4 bg-paper-warm p-2.5" style={{ borderColor: copy.color }}>
        <div className="text-[13px] font-bold">{copy.title}</div>
        <div className="mt-0.5 text-[11.5px] text-muted">{copy.desc}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="border border-paper-line px-2 py-1.5">
          <div className="text-[10px] text-muted">{feasibility.operatingBalance >= 0 ? "ANNUAL SURPLUS" : "ANNUAL DEFICIT"}</div>
          <div className={`font-mono font-semibold ${feasibility.operatingBalance >= 0 ? "text-green" : "text-clay"}`}>
            {feasibility.operatingBalance >= 0 ? "+" : "−"}
            {fmtUsd(Math.abs(feasibility.operatingBalance))}/yr
          </div>
        </div>
        <div className="border border-paper-line px-2 py-1.5">
          <div className="text-[10px] text-muted">REVENUE/OPEX RATIO</div>
          <div className="font-mono font-semibold">{Math.round(feasibility.sustainabilityRatio)}%</div>
        </div>
      </div>
    </Panel>
  );
}
