import { Panel } from "@/components/ui/Panel";
import { Field, NumField, Select } from "@/components/ui/Form";
import { fmtNum } from "@/components/ui/Metrics";
import type { AaceClass } from "@/lib/calc/engine";
import type { ProjectRow } from "./types";

export function SoftCostsPanel({
  project,
  aaceClasses,
  onChange,
}: {
  project: ProjectRow;
  aaceClasses: AaceClass[];
  onChange: (patch: Partial<ProjectRow>) => void;
}) {
  const currentClass = aaceClasses.find((c) => c.classNumber === project.aaceClass);
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
        <Field label="Contingency level">
          <Select
            value={project.aaceClass}
            onChange={(e) => onChange({ aaceClass: Number(e.target.value), contingencyPctOverride: null })}
          >
            {aaceClasses.map((c) => (
              <option key={c.classNumber} value={c.classNumber}>
                {fmtNum(c.contingencyPct)}% contingency ({fmtNum(c.bandLowPct)}% / +{fmtNum(c.bandHighPct)}%)
              </option>
            ))}
          </Select>
        </Field>
        <NumField
          label="Fast-track premium"
          suffix="%"
          value={project.fastTrackPremiumPct}
          onChange={(v) => onChange({ fastTrackPremiumPct: v })}
        />
      </div>
      {currentClass && <p className="mt-2 text-[10.5px] text-muted">{currentClass.description}</p>}
    </Panel>
  );
}
