import { Panel } from "@/components/ui/Panel";
import { BreakdownRow, fmtUsd, fmtNum } from "@/components/ui/Metrics";
import type { CostBreakdown } from "@/lib/calc/engine";
import type { ItemRow } from "./types";

/** The modeled-square-foot presentation: one row per UniFormat division
 * (code, $/m², % of subtotal), then the general-contractor buildup lines,
 * reading every fee/markup straight off `cost` (computeCost()'s own
 * output) rather than recomputing them here — one implementation of the
 * math, matching the reference RSMeans-style layout. */
export function BuildingCostBreakdownPanel({
  items,
  cost,
  costIndex,
}: {
  items: ItemRow[];
  cost: CostBreakdown;
  costIndex: number;
}) {
  // A-G are the building-division codes the generator assigns; 'Z' (and
  // anything else) is a flat-priced item (vehicle, equipment) — this panel
  // is specifically the building breakdown, not the whole BOQ.
  const generatedRows = items.filter((it) => it.isIncluded && it.customUnifCode && /^[A-G]$/.test(it.customUnifCode));
  const totalConstruction = cost.coreConstruction + cost.addonConstruction;

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
      <BreakdownRow label="Sub-Total (BOQ construction)" value={fmtUsd(totalConstruction)} strong />
      <BreakdownRow label="General contractor cost" value={fmtUsd(cost.generalContractorCost)} />
      <BreakdownRow label="Sub-contractor markup" value={fmtUsd(cost.subContractorMarkup)} />
      <BreakdownRow label="Mobilization fee" value={fmtUsd(cost.mobilizationFee)} />
      <BreakdownRow label="Contractor profit" value={fmtUsd(cost.contractorProfit)} />
      <BreakdownRow label="Architect / engineer fee" value={fmtUsd(cost.architectEngineerFee)} />
      <BreakdownRow label="Permitting fee" value={fmtUsd(cost.permittingFee)} />
      <BreakdownRow label="Escalation / FX buffer" value={fmtUsd(cost.escalation)} />
      <BreakdownRow label="Fast-track premium" value={fmtUsd(cost.fastTrackPremium)} />
      <BreakdownRow label="Building cost (before contingency)" value={fmtUsd(cost.buildingCostSubtotal)} strong />
      <BreakdownRow label="Contingency" value={fmtUsd(cost.contingency)} />
      <BreakdownRow label="Commissioning fee" value={fmtUsd(cost.commissioningFee)} />
      <BreakdownRow label="Construction quality control" value={fmtUsd(cost.constructionQc)} />
      <BreakdownRow label="Total building cost" value={fmtUsd(cost.grandTotal)} strong />
      <p className="mt-2 text-[10.5px] text-muted">
        Sub-Total is this facility&apos;s whole construction total — if you&apos;ve also added flat-priced items (vehicles,
        equipment), they&apos;re included here but not broken out by division above. Every fee/markup line is set in the
        General Contractor Cost Buildup section below.
      </p>
    </Panel>
  );
}
