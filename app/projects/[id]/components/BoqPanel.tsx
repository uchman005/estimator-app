import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { fmtUsd } from "@/components/ui/Metrics";
import { BoqRow } from "./BoqRow";
import type { AssemblyLite } from "@/lib/calc/engine";
import type { ItemRow } from "./types";

const COLUMNS = ["Class", "Component", "Qty", "Tier/Material", "Rate", "Addon", "On", "Subtotal", ""];

export function BoqPanel({
  items,
  assemblyById,
  groupedAssemblies,
  costIndex,
  coreSubtotal,
  addonSubtotal,
  onChangeItem,
  onDeleteItem,
  onAddItem,
}: {
  items: ItemRow[];
  assemblyById: Map<number, AssemblyLite>;
  groupedAssemblies: Record<string, AssemblyLite[]>;
  costIndex: number;
  coreSubtotal: number;
  addonSubtotal: number;
  onChangeItem: (id: number, patch: Partial<ItemRow>) => void;
  onDeleteItem: (id: number) => void;
  onAddItem: () => void;
}) {
  return (
    <Panel title="04 — BILL OF QUANTITIES (UniFormat II classified)">
      <p className="mb-2 text-[11.5px] text-muted">
        Every row carries a UniFormat II code. Addon items can be switched off without deleting them. Assemblies with material
        options (walls, windows, doors) show a material dropdown instead of a tier.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b-2 border-ink text-left text-[10px] text-muted">
              {COLUMNS.map((c) => (
                <th key={c} className="py-1 pr-2 font-semibold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <BoqRow
                key={item.id}
                item={item}
                assembly={item.assemblyId != null ? assemblyById.get(item.assemblyId) ?? null : null}
                groupedAssemblies={groupedAssemblies}
                costIndex={costIndex}
                onChange={(patch) => onChangeItem(item.id, patch)}
                onDelete={() => onDeleteItem(item.id)}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink font-semibold">
              <td colSpan={7} className="py-1.5">
                Core scope subtotal (indexed, included rows)
              </td>
              <td className="py-1.5 text-right font-mono">{fmtUsd(coreSubtotal)}</td>
              <td />
            </tr>
            <tr className="font-semibold">
              <td colSpan={7} className="py-1.5">
                Addon subtotal (indexed, included addon rows)
              </td>
              <td className="py-1.5 text-right font-mono">{fmtUsd(addonSubtotal)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <Button variant="addBorder" className="mt-2" onClick={onAddItem}>
        + Add line item
      </Button>
    </Panel>
  );
}
