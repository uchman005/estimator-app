import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { fmtUsd } from "@/components/ui/Metrics";
import { BoqRow } from "./BoqRow";
import type { ItemRow } from "./types";

const COLUMNS = ["Div", "Description", "Division", "Qty", "Unit", "Rate ($)", "Addon", "On", "Subtotal", ""];

export function BoqPanel({
  items,
  costIndex,
  coreSubtotal,
  addonSubtotal,
  onChangeItem,
  onDeleteItem,
  onAddItem,
}: {
  items: ItemRow[];
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
        Generated building-division rows (from the template below) and flat-priced items (vehicles, equipment) live side by
        side here — every row is just quantity × rate. Addon items can be switched off without deleting them.
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
                costIndex={costIndex}
                onChange={(patch) => onChangeItem(item.id, patch)}
                onDelete={() => onDeleteItem(item.id)}
              />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink font-semibold">
              <td colSpan={8} className="py-1.5">
                Core scope subtotal (indexed, included rows)
              </td>
              <td className="py-1.5 text-right font-mono">{fmtUsd(coreSubtotal)}</td>
              <td />
            </tr>
            <tr className="font-semibold">
              <td colSpan={8} className="py-1.5">
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
