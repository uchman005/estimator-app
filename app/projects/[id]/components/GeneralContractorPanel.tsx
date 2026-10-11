import { Panel } from "@/components/ui/Panel";
import { NumField } from "@/components/ui/Form";
import { fmtNum } from "@/components/ui/Metrics";
import type { AaceClass } from "@/lib/calc/engine";
import type { ProjectRow } from "./types";

/** Buildings price their contractor markup as a detailed buildup instead of
 * one flat "contractor fee" % — general contractor cost, sub-contractor
 * markup and mobilization are each their own line (all % of the BOQ
 * construction total), contractor profit is a margin on top of all three
 * plus the construction total itself, and contingency/commissioning/quality
 * control each apply further down the stack — see computeCost() in
 * lib/calc/engine.ts for the exact sequence, and SummaryPanel.tsx for where
 * each line lands in the facility's own estimate summary. */
export function GeneralContractorPanel({
  project,
  aaceClasses,
  sectionNumber,
  onChange,
}: {
  project: ProjectRow;
  aaceClasses: AaceClass[];
  sectionNumber: number;
  onChange: (patch: Partial<ProjectRow>) => void;
}) {
  const classPcts = aaceClasses.map((c) => c.contingencyPct);
  const minPct = classPcts.length ? Math.min(...classPcts) : 5;
  const maxPct = classPcts.length ? Math.max(...classPcts) : 30;

  // Contingency here is typed directly (not picked from the class list a
  // flat facility uses — see SoftCostsPanel.tsx) but the confidence band
  // shown elsewhere in the app still comes from a class, so every change
  // re-derives whichever class's own % is numerically closest and adopts
  // its band — keeping the two from drifting apart without a select.
  function setContingencyPct(typed: number) {
    const clamped = Math.min(maxPct, Math.max(minPct, typed));
    const nearest = aaceClasses.reduce(
      (best, c) => (Math.abs(c.contingencyPct - clamped) < Math.abs(best.contingencyPct - clamped) ? c : best),
      aaceClasses[0]
    );
    onChange({ contingencyPctOverride: clamped, aaceClass: nearest?.classNumber ?? project.aaceClass });
  }

  const currentClass = aaceClasses.find((c) => c.classNumber === project.aaceClass);
  const contingencyPct = project.contingencyPctOverride ?? 20;

  return (
    <Panel title={`${String(sectionNumber).padStart(2, "0")} — GENERAL CONTRACTOR COST BUILDUP`} accent>
      <p className="mb-2 text-[11.5px] text-muted">
        Every % below is of the BOQ construction total, except Contractor Profit (a margin on the construction total
        plus general contractor cost, sub-contractor markup and mobilization combined) and Contingency/Commissioning/
        Quality Control (each a % of the running subtotal above it) — see the facility&apos;s estimate summary for the
        dollar figures in sequence.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <NumField label="General contractor cost" suffix="%" value={project.pmFeePct} onChange={(v) => onChange({ pmFeePct: v })} />
        <NumField
          label="Sub-contractor markup"
          suffix="%"
          value={project.subContractorMarkupPct}
          onChange={(v) => onChange({ subContractorMarkupPct: v })}
        />
        <NumField label="Mobilization fee" suffix="%" value={project.mobilizationFeePct} onChange={(v) => onChange({ mobilizationFeePct: v })} />
        <NumField
          label="Contractor profit"
          suffix="%"
          value={project.contractorProfitPct}
          onChange={(v) => onChange({ contractorProfitPct: v })}
        />
        <NumField label="Permitting fee" suffix="%" value={project.permitFeePct} onChange={(v) => onChange({ permitFeePct: v })} />
        <NumField label={`Contingency (${fmtNum(minPct)}–${fmtNum(maxPct)}%)`} suffix="%" value={contingencyPct} onChange={setContingencyPct} />
        <NumField
          label="Commissioning fee"
          suffix="%"
          value={project.commissioningFeePct}
          onChange={(v) => onChange({ commissioningFeePct: v })}
        />
        <NumField
          label="Construction quality control"
          suffix="%"
          value={project.constructionQcPct}
          onChange={(v) => onChange({ constructionQcPct: v })}
        />
      </div>
      {currentClass && (
        <p className="mt-2 text-[10.5px] text-muted">
          Nearest confidence band for {fmtNum(contingencyPct)}% contingency: {fmtNum(currentClass.bandLowPct)}% / +
          {fmtNum(currentClass.bandHighPct)}% ({currentClass.description})
        </p>
      )}
    </Panel>
  );
}
