import { Panel } from "@/components/ui/Panel";
import { Field, NumField, Select } from "@/components/ui/Form";
import type { ProjectRow } from "./types";

export function SoftCostsPanel({ project, onChange }: { project: ProjectRow; onChange: (patch: Partial<ProjectRow>) => void }) {
  return (
    <Panel title="05 — SOFT COSTS, LAND & ESCALATION">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumField label="Design & eng. fees" suffix="%" value={project.designFeePct} onChange={(v) => onChange({ designFeePct: v })} />
        <NumField label="PM & supervision" suffix="%" value={project.pmFeePct} onChange={(v) => onChange({ pmFeePct: v })} />
        <NumField label="Permitting/legal" suffix="%" value={project.permitFeePct} onChange={(v) => onChange({ permitFeePct: v })} />
        <NumField label="Land cost (USD)" value={project.landCostUsd} onChange={(v) => onChange({ landCostUsd: v })} />
        <Field label="Delivery strategy">
          <Select
            value={project.deliveryStrategy}
            onChange={(e) => onChange({ deliveryStrategy: e.target.value as "phased" | "parallel" })}
          >
            <option value="phased">Phased</option>
            <option value="parallel">Fast-tracked (+cost)</option>
          </Select>
        </Field>
        <NumField label="Escalation" suffix="%/yr" value={project.escalationPct} onChange={(v) => onChange({ escalationPct: v })} />
        <NumField
          label="Contingency override"
          suffix="%"
          value={project.contingencyPctOverride ?? 0}
          onChange={(v) => onChange({ contingencyPctOverride: v })}
        />
        <NumField
          label="Fast-track premium"
          suffix="%"
          value={project.fastTrackPremiumPct}
          onChange={(v) => onChange({ fastTrackPremiumPct: v })}
        />
      </div>
    </Panel>
  );
}
