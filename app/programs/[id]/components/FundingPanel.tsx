import { Panel } from "@/components/ui/Panel";
import { NumField } from "@/components/ui/Form";
import type { ProgramRow } from "./types";

export function FundingPanel({ program, onChange }: { program: ProgramRow; onChange: (patch: Partial<ProgramRow>) => void }) {
  return (
    <Panel title="07 — SITE COSTS, FUNDING & OPERATING SUSTAINABILITY">
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Land cost (USD)" value={program.landCostUsd} onChange={(v) => onChange({ landCostUsd: v })} />
        <NumField
          label="Escalation"
          suffix="%/yr"
          value={program.escalationPct}
          onChange={(v) => onChange({ escalationPct: v })}
        />
        <NumField label="Committed funding (USD)" value={program.fundedUsd} onChange={(v) => onChange({ fundedUsd: v })} />
        <NumField
          label="Annual opex override (0=auto)"
          value={program.opexOverrideUsd}
          onChange={(v) => onChange({ opexOverrideUsd: v })}
        />
        <NumField
          label="Auto opex % of CAPEX/yr"
          suffix="%"
          value={program.opexPctOfCapexPerYear}
          onChange={(v) => onChange({ opexPctOfCapexPerYear: v })}
        />
        <NumField
          label="Annual revenue (USD)"
          value={program.annualRevenueUsd}
          onChange={(v) => onChange({ annualRevenueUsd: v })}
        />
      </div>
      <p className="mt-2 text-[10.5px] text-muted">
        Applies once, across every facility in this program — escalation runs against each facility&apos;s own schedule length.
      </p>
    </Panel>
  );
}
