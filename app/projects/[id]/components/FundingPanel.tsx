import { Panel } from "@/components/ui/Panel";
import { NumField } from "@/components/ui/Form";
import type { ProjectRow } from "./types";

export function FundingPanel({ project, onChange }: { project: ProjectRow; onChange: (patch: Partial<ProjectRow>) => void }) {
  return (
    <Panel title="07 — FUNDING & OPERATING SUSTAINABILITY">
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Committed funding (USD)" value={project.fundedUsd} onChange={(v) => onChange({ fundedUsd: v })} />
        <NumField
          label="Annual opex override (0=auto)"
          value={project.opexOverrideUsd}
          onChange={(v) => onChange({ opexOverrideUsd: v })}
        />
        <NumField
          label="Auto opex % of CAPEX/yr"
          suffix="%"
          value={project.opexPctOfCapexPerYear}
          onChange={(v) => onChange({ opexPctOfCapexPerYear: v })}
        />
        <NumField
          label="Annual revenue (USD)"
          value={project.annualRevenueUsd}
          onChange={(v) => onChange({ annualRevenueUsd: v })}
        />
      </div>
    </Panel>
  );
}
