import { fmtUsd, fmtLocal, fmtNum, fmtMonths } from "@/components/ui/Metrics";
import { PrintPage, PrintHeader, PrintSection, PrintRow, PrintTable, PrintFooter } from "@/components/ui/PrintSummary";
import type { AaceClass, CostBreakdown, ScheduleBreakdown } from "@/lib/calc/engine";
import type { ItemRow, ProjectRow } from "./types";

// The curated, print-only view of one facility — deliberately NOT the whole
// editable page (no inputs, no BOQ line-by-line, no generator controls) —
// just the figures someone would actually want on a one-page handout: the
// modeled-m² breakdown (if it's a building), the cost summary, the
// schedule, and recurring opex. Rendered always (hidden on screen, shown
// only in @media print — see .print-summary in app/globals.css); the
// "Print summary" button just calls window.print().
export function FacilityPrintSummary({
  project,
  programName,
  countryName,
  regionName,
  costIndex,
  aace,
  cost,
  schedule,
  opex,
  buildingGfaM2,
  items,
  currencyCode,
  currencySymbol,
  fx,
}: {
  project: ProjectRow;
  programName: string;
  countryName: string;
  regionName: string | null;
  costIndex: number;
  aace: AaceClass;
  cost: CostBreakdown;
  schedule: ScheduleBreakdown;
  opex: number;
  buildingGfaM2: number | null;
  items: ItemRow[];
  currencyCode: string;
  currencySymbol?: string;
  fx: number;
}) {
  const generatedRows = items.filter((it) => it.isIncluded && it.customUnifCode && /^[A-G]$/.test(it.customUnifCode));
  const isBuilding = generatedRows.length > 0 && buildingGfaM2 != null;
  const totalConstruction = cost.coreConstruction + cost.addonConstruction;
  const architectFee = totalConstruction * (project.designFeePct / 100);
  const contractorFee = totalConstruction * (project.pmFeePct / 100);
  const permitFee = totalConstruction * (project.permitFeePct / 100);

  const printedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <PrintPage>
      <PrintHeader
        title={project.name}
        subtitle={`Facility Summary — ${programName}`}
        meta={[
          project.facilityType,
          `AACE Class ${aace.classNumber}`,
          `${countryName}${regionName ? ` — ${regionName}` : ""}`,
          `cost index ${fmtNum(costIndex)}`,
          `printed ${printedAt}`,
        ]}
      />

      {isBuilding && (
        <PrintSection title="Modeled square-meter cost breakdown">
          <PrintTable
            columns={[{ label: "Division" }, { label: "$/m²", align: "right" }, { label: "% of sub-total", align: "right" }]}
            rows={generatedRows.map((it) => {
              const rateIndexed = it.rateUsd * costIndex;
              const subtotal = it.quantity * rateIndexed;
              const pct = totalConstruction > 0 ? (subtotal / totalConstruction) * 100 : 0;
              return [`${it.customUnifCode} — ${it.customLabel ?? ""}`, `${fmtUsd(rateIndexed)}/m²`, `${fmtNum(pct)}%`];
            })}
          />
          <div className="mt-1">
            <PrintRow label="Sub-total (construction)" value={fmtUsd(totalConstruction)} strong />
            <PrintRow label={`Contractor fee (${fmtNum(project.pmFeePct)}%)`} value={fmtUsd(contractorFee)} />
            <PrintRow label={`Architect fee (${fmtNum(project.designFeePct)}%)`} value={fmtUsd(architectFee)} />
            <PrintRow label={`Permitting (${fmtNum(project.permitFeePct)}%)`} value={fmtUsd(permitFee)} />
            <PrintRow label="Total building cost" value={fmtUsd(totalConstruction + architectFee + contractorFee + permitFee)} strong />
            <PrintRow label="Gross floor area" value={`${fmtNum(buildingGfaM2!)} m²`} />
            <PrintRow label="All-in cost per m²" value={`${fmtUsd(cost.grandTotal / buildingGfaM2!)}/m²`} />
          </div>
        </PrintSection>
      )}

      <PrintSection title="Estimate summary">
        <PrintRow label="Core scope construction" value={fmtUsd(cost.coreConstruction)} />
        <PrintRow label="Addon construction (included)" value={fmtUsd(cost.addonConstruction)} />
        <PrintRow label="Soft costs" value={fmtUsd(cost.softCosts)} />
        <PrintRow label="Escalation / FX buffer" value={fmtUsd(cost.escalation)} />
        <PrintRow label="Fast-track premium" value={fmtUsd(cost.fastTrackPremium)} />
        <PrintRow label={`Contingency (${fmtNum(project.contingencyPctOverride ?? aace.contingencyPct)}%)`} value={fmtUsd(cost.contingency)} />
        <PrintRow label="Facility subtotal (USD)" value={fmtUsd(cost.grandTotal)} strong />
        <PrintRow label="Confidence band" value={`${fmtUsd(cost.bandLow)} – ${fmtUsd(cost.bandHigh)}`} />
        <PrintRow label={`Total (${currencyCode})`} value={fmtLocal(cost.grandTotal * fx, currencySymbol)} />
      </PrintSection>

      <PrintSection title="Schedule">
        <PrintRow label="Land, permitting & design" value={fmtMonths(schedule.prePhaseMonths)} />
        <PrintRow label="Construction" value={fmtMonths(schedule.constructionMonths)} />
        <PrintRow label="Commissioning & licensing" value={fmtMonths(schedule.commissionMonths)} />
        <PrintRow label="Total programme duration" value={fmtMonths(schedule.totalMonths)} strong />
      </PrintSection>

      <PrintSection title="Recurring operating cost">
        <PrintRow label="Annual total" value={`${fmtUsd(opex)}/yr`} strong />
      </PrintSection>

      <PrintFooter text={`Generated by Classified Infrastructure Estimator — facility #${project.id}, ${programName}.`} />
    </PrintPage>
  );
}
