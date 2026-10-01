import { Panel } from "@/components/ui/Panel";
import { BreakdownRow, fmtUsd, fmtNum } from "@/components/ui/Metrics";
import type { CostBreakdown } from "@/lib/calc/engine";
import type { ItemRow } from "./types";

/** The modeled-square-foot presentation: one row per UniFormat division
 * (code, $/m², % of subtotal), then Sub-Total, Contractor Fee, Architect
 * Fee, Permitting, Total — matches the reference RSMeans-style layout.
 * Built entirely from data the facility already computes; no separate
 * engine call needed. */
export function BuildingCostBreakdownPanel({
  items,
  cost,
  costIndex,
  designFeePct,
  pmFeePct,
  permitFeePct,
}: {
  items: ItemRow[];
  cost: CostBreakdown;
  costIndex: number;
  designFeePct: number;
  pmFeePct: number;
  permitFeePct: number;
}) {
  // A-G are the building-division codes the generator assigns; 'Z' (and
  // anything else) is a flat-priced item (vehicle, equipment) — this panel
  // is specifically the building breakdown, not the whole BOQ.
  const generatedRows = items.filter((it) => it.isIncluded && it.customUnifCode && /^[A-G]$/.test(it.customUnifCode));
  const totalConstruction = cost.coreConstruction + cost.addonConstruction;
  const architectFee = totalConstruction * (designFeePct / 100);
  const contractorFee = totalConstruction * (pmFeePct / 100);
  const permitFee = totalConstruction * (permitFeePct / 100);

  if (generatedRows.length === 0) return null;

  return (
    <Panel title="MODELED SQUARE-METER COST BREAKDOWN">
      {generatedRows.map((it) => {
        const rateIndexed = it.rateUsd * costIndex;
        const subtotal = it.quantity * rateIndexed;
        const pctOfSubtotal = totalConstruction > 0 ? (subtotal / totalConstruction) * 100 : 0;
        return (
          <BreakdownRow
            key={it.id}
            label={`${it.customUnifCode} — ${it.customLabel ?? ""}`}
            value={`${fmtUsd(rateIndexed)}/m² · ${fmtNum(pctOfSubtotal)}%`}
          />
        );
      })}
      <BreakdownRow label="Sub-Total" value={fmtUsd(totalConstruction)} strong />
      <BreakdownRow label={`Contractor fee (${fmtNum(pmFeePct)}%)`} value={fmtUsd(contractorFee)} />
      <BreakdownRow label={`Architect fee (${fmtNum(designFeePct)}%)`} value={fmtUsd(architectFee)} />
      <BreakdownRow label={`Permitting (${fmtNum(permitFeePct)}%)`} value={fmtUsd(permitFee)} />
      <BreakdownRow label="Total building cost" value={fmtUsd(totalConstruction + architectFee + contractorFee + permitFee)} strong />
      <p className="mt-2 text-[10.5px] text-muted">
        Sub-Total is this facility&apos;s whole construction total — if you&apos;ve also added flat-priced items (vehicles,
        equipment) below, they&apos;re included here but not broken out by division above. Escalation and contingency are
        layered on top of this at the facility level — see the estimate summary for the full subtotal.
      </p>
    </Panel>
  );
}
