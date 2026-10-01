import { Select, Input } from "@/components/ui/Form";
import { ClassBadge } from "@/components/ui/Button";
import { fmtUsd } from "@/components/ui/Metrics";
import { UNIFORMAT_DIVISIONS, type ItemRow } from "./types";

export function BoqRow({
  item,
  costIndex,
  onChange,
  onDelete,
}: {
  item: ItemRow;
  costIndex: number;
  onChange: (patch: Partial<ItemRow>) => void;
  onDelete: () => void;
}) {
  const subtotal = item.isIncluded ? item.quantity * item.rateUsd * costIndex : 0;

  return (
    <tr className={`border-b border-paper-line align-middle ${item.isIncluded ? "" : "opacity-40"}`}>
      <td className="py-1 pr-2">
        <ClassBadge code={item.customUnifCode || "Z"} />
      </td>
      <td className="min-w-[180px] py-1 pr-2">
        <Input
          placeholder="Describe this item"
          value={item.customLabel ?? ""}
          onChange={(e) => onChange({ customLabel: e.target.value })}
        />
      </td>
      <td className="w-32 py-1 pr-2">
        <Select value={item.customUnifCode ?? "Z"} onChange={(e) => onChange({ customUnifCode: e.target.value })}>
          {UNIFORMAT_DIVISIONS.map((d) => (
            <option key={d.code} value={d.code}>
              {d.code} — {d.name}
            </option>
          ))}
        </Select>
      </td>
      <td className="w-20 py-1 pr-2">
        <Input
          type="number"
          step="any"
          className="font-mono"
          value={item.quantity}
          onChange={(e) => onChange({ quantity: parseFloat(e.target.value) || 0 })}
        />
      </td>
      <td className="w-20 py-1 pr-2">
        <Input
          placeholder="unit"
          value={item.customUnit ?? ""}
          onChange={(e) => onChange({ customUnit: e.target.value })}
        />
      </td>
      <td className="w-28 py-1 pr-2 text-right">
        <Input
          type="number"
          step="any"
          className="text-right font-mono"
          value={item.rateUsd}
          onChange={(e) => onChange({ rateUsd: parseFloat(e.target.value) || 0 })}
        />
      </td>
      <td className="py-1 pr-2 text-center">
        <input type="checkbox" checked={item.isAddon} onChange={(e) => onChange({ isAddon: e.target.checked })} />
      </td>
      <td className="py-1 pr-2 text-center">
        <input type="checkbox" checked={item.isIncluded} onChange={(e) => onChange({ isIncluded: e.target.checked })} />
      </td>
      <td className="py-1 pr-2 text-right font-mono">{fmtUsd(subtotal)}</td>
      <td>
        <button onClick={onDelete} className="h-5 w-5 rounded-sm border border-clay text-xs leading-none text-clay hover:bg-clay hover:text-white">
          ×
        </button>
      </td>
    </tr>
  );
}
