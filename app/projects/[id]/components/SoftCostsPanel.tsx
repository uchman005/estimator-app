import { Panel } from "@/components/ui/Panel";
import { Field, NumField, Select } from "@/components/ui/Form";
import { fmtNum } from "@/components/ui/Metrics";
import type { AaceClass } from "@/lib/calc/engine";
import type { ProjectRow } from "./types";

export function SoftCostsPanel({
  project,
  aaceClasses,
  isBuilding,
  sectionNumber,
  onChange,
}: {
  project: ProjectRow;
  aaceClasses: AaceClass[];
  /** Buildings get a much more detailed general-contractor cost buildup
   * (GeneralContractorPanel.tsx) in place of the plain contractor-fee/
   * permitting/contingency fields below — see that panel for why. */
  isBuilding: boolean;
  sectionNumber: number;
  onChange: (patch: Partial<ProjectRow>) => void;
}) {
  const currentClass = aaceClasses.find((c) => c.classNumber === project.aaceClass);
  return (
    <Panel title={`${String(sectionNumber).padStart(2, "0")} — ARCHITECT FEE, DELIVERY`}>
      <p className="mb-2 text-[11.5px] text-muted">
        {isBuilding
          ? "Architect / engineer fee and delivery strategy — the general-contractor cost buildup (contractor fee, permitting, contingency, and the rest) lives in its own section below."
          : "The RSMeans-style layer on top of the BOQ sub-total: Architect / Engineer Fee, General Contractor Cost and Permitting — see the breakdown in the summary panel."}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumField label="Architect / engineer fee" suffix="%" value={project.designFeePct} onChange={(v) => onChange({ designFeePct: v })} />
        {!isBuilding && (
          <>
            <NumField label="General contractor cost" suffix="%" value={project.pmFeePct} onChange={(v) => onChange({ pmFeePct: v })} />
            <NumField label="Permitting fee" suffix="%" value={project.permitFeePct} onChange={(v) => onChange({ permitFeePct: v })} />
          </>
        )}
        <Field label="Delivery strategy">
          <Select
            value={project.deliveryStrategy}
            onChange={(e) => onChange({ deliveryStrategy: e.target.value as "phased" | "parallel" })}
          >
            <option value="phased">Phased</option>
            <option value="parallel">Fast-tracked (+cost)</option>
          </Select>
        </Field>
        {!isBuilding && (
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
        )}
        <NumField
          label="Fast-track premium"
          suffix="%"
          value={project.fastTrackPremiumPct}
          onChange={(v) => onChange({ fastTrackPremiumPct: v })}
        />
      </div>
      {!isBuilding && currentClass && <p className="mt-2 text-[10.5px] text-muted">{currentClass.description}</p>}
    </Panel>
  );
}
