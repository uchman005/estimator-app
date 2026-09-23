import { Panel } from "@/components/ui/Panel";
import { Input, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { fmtUsd } from "@/components/ui/Metrics";
import { OPEX_CATEGORIES, OPEX_CATEGORY_LABEL, type OpexItemRow, type OpexCategory } from "./types";

export function OperatingCostsPanel({
  items,
  opexPctOfCapexPerYear,
  autoEstimate,
  onAdd,
  onChange,
  onDelete,
}: {
  items: OpexItemRow[];
  opexPctOfCapexPerYear: number;
  autoEstimate: number;
  onAdd: () => void;
  onChange: (id: number, patch: Partial<OpexItemRow>) => void;
  onDelete: (id: number) => void;
}) {
  const includedTotal = items.filter((it) => it.isIncluded).reduce((s, it) => s + it.annualAmountUsd, 0);

  return (
    <Panel title="07 — RECURRING OPERATING COSTS" eyebrow={`${fmtUsd(includedTotal)}/yr`}>
      <p className="mb-2 text-[11.5px] text-muted">
        Annual running costs for this facility — salaries, maintenance, utilities. These roll up into the program&apos;s
        feasibility alongside every other facility&apos;s. Add none, and the program instead estimates this facility&apos;s
        opex at <b className="font-mono text-ink">{opexPctOfCapexPerYear}%</b> of its own capital cost (
        <b className="font-mono text-ink">{fmtUsd(autoEstimate)}/yr</b> right now) — enter real numbers here whenever you
        have them.
      </p>

      {items.length > 0 && (
        <table className="mb-2 w-full text-[12px]">
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-paper-line">
                <td className="py-1.5 pr-2">
                  <Input value={it.label} onChange={(e) => onChange(it.id, { label: e.target.value })} />
                </td>
                <td className="py-1.5 pr-2 w-36">
                  <Select value={it.category} onChange={(e) => onChange(it.id, { category: e.target.value as OpexCategory })}>
                    {OPEX_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {OPEX_CATEGORY_LABEL[c]}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="py-1.5 pr-2 w-32">
                  <Input
                    type="number"
                    className="font-mono text-right"
                    value={it.annualAmountUsd}
                    onChange={(e) => onChange(it.id, { annualAmountUsd: parseFloat(e.target.value) || 0 })}
                  />
                </td>
                <td className="py-1.5 pr-2 w-16 text-center" title="Included in the program total">
                  <input
                    type="checkbox"
                    checked={it.isIncluded}
                    onChange={(e) => onChange(it.id, { isIncluded: e.target.checked })}
                  />
                </td>
                <td className="py-1.5 text-right w-16">
                  <button onClick={() => onDelete(it.id)} className="text-[11px] text-clay underline">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Button variant="ghost" onClick={onAdd}>
        + Add recurring cost
      </Button>
    </Panel>
  );
}
