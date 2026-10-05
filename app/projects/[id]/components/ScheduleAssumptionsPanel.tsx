import { Panel } from "@/components/ui/Panel";
import { Field, NumField, Input } from "@/components/ui/Form";
import type { ProjectRow } from "./types";

export function ScheduleAssumptionsPanel({ project, onChange }: { project: ProjectRow; onChange: (patch: Partial<ProjectRow>) => void }) {
  return (
    <Panel title="06 — SCHEDULE ASSUMPTIONS">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <NumField label="Land & permitting" suffix="mo" value={project.landMonths} onChange={(v) => onChange({ landMonths: v })} />
        <NumField label="Design & engineering" suffix="mo" value={project.designMonths} onChange={(v) => onChange({ designMonths: v })} />
        <NumField
          label="Design/permit overlap"
          suffix="%"
          value={project.designPermitOverlapPct}
          onChange={(v) => onChange({ designPermitOverlapPct: v })}
        />
        <NumField
          label="Commissioning"
          suffix="mo"
          value={project.commissionMonths}
          onChange={(v) => onChange({ commissionMonths: v })}
        />
        <Field label="Start date">
          <Input type="date" value={project.startDate ?? ""} onChange={(e) => onChange({ startDate: e.target.value })} />
        </Field>
        <NumField
          label="Construction duration override"
          suffix="mo (0=auto)"
          value={project.constructionMonthsOverride}
          onChange={(v) => onChange({ constructionMonthsOverride: v })}
        />
      </div>
      {project.constructionMonthsOverride > 0 && (
        <p className="mt-2 text-[10.5px] text-muted">
          Construction duration is set manually above instead of being derived from the BOQ&apos;s own critical path.
          Set it back to 0 to return to the computed estimate.
        </p>
      )}
    </Panel>
  );
}
