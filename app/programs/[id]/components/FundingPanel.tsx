import { Panel } from "@/components/ui/Panel";
import { Field, Input, NumField } from "@/components/ui/Form";
import type { ProgramRow } from "./types";

export function FundingPanel({ program, onChange }: { program: ProgramRow; onChange: (patch: Partial<ProgramRow>) => void }) {
  return (
    <Panel title="03 — SITE COSTS, FUNDING & OPERATING SUSTAINABILITY">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Program name" className="col-span-2">
          <Input value={program.name} onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <NumField label="Land cost (USD)" value={program.landCostUsd} onChange={(v) => onChange({ landCostUsd: v })} />
        <NumField
          label="Escalation"
          suffix="%/yr"
          value={program.escalationPct}
          onChange={(v) => onChange({ escalationPct: v })}
        />
        <NumField
          label="Proposed / committed funding (USD)"
          value={program.fundedUsd}
          onChange={(v) => onChange({ fundedUsd: v })}
        />
        <NumField
          label="Program-wide opex override (0=auto)"
          value={program.opexOverrideUsd}
          onChange={(v) => onChange({ opexOverrideUsd: v })}
        />
        <NumField
          label="Opex fallback, % of a facility's own capex/yr"
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
        Land, escalation, funding and revenue apply once, across the whole program. Recurring cost is different — each
        facility totals its own itemized salaries/maintenance/etc. (set on that facility&apos;s own page); the % above is
        only an estimate for a facility that hasn&apos;t itemized yet. The override above replaces the sum of all of that
        with one flat program-wide number, if you&apos;d rather set it directly.
      </p>
      <p className="mt-1 text-[10.5px] text-muted">
        <b>Proposed / committed funding</b> is what the feasibility verdict (right-hand panel) compares against this
        program&apos;s total estimated cost — the &quot;FUNDING COVERAGE&quot; figure and funding gap both come straight
        from this number.
      </p>
    </Panel>
  );
}
