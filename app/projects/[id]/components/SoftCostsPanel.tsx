import { Panel } from "@/components/ui/Panel";
import { Field, NumField, Select } from "@/components/ui/Form";
import type { ProjectRow } from "./types";

export function SoftCostsPanel({ project, onChange }: { project: ProjectRow; onChange: (patch: Partial<ProjectRow>) => void }) {
  return (
    <Panel title="05 — CONTRACTOR &amp; ARCHITECT FEES, DELIVERY">
      <p className="mb-2 text-[11.5px] text-muted">
        The RSMeans-style layer on top of the BOQ sub-total: Architect Fee, Contractor Fee (general requirements,
        overhead &amp; profit) and Permitting — see the breakdown in the summary panel.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumField label="Architect fee" suffix="%" value={project.designFeePct} onChange={(v) => onChange({ designFeePct: v })} />
        <NumField label="Contractor fee (overhead & profit)" suffix="%" value={project.pmFeePct} onChange={(v) => onChange({ pmFeePct: v })} />
        <NumField label="Permitting/legal" suffix="%" value={project.permitFeePct} onChange={(v) => onChange({ permitFeePct: v })} />
        <Field label="Delivery strategy">
          <Select
            value={project.deliveryStrategy}
            onChange={(e) => onChange({ deliveryStrategy: e.target.value as "phased" | "parallel" })}
          >
            <option value="phased">Phased</option>
            <option value="parallel">Fast-tracked (+cost)</option>
          </Select>
        </Field>
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
