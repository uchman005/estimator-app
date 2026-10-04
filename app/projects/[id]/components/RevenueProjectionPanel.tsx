import { Panel } from "@/components/ui/Panel";
import { Input, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { fmtUsd } from "@/components/ui/Metrics";
import { REVENUE_CATEGORIES, REVENUE_CATEGORY_LABEL, type RevenueItemRow, type RevenueCategory } from "./types";

export function RevenueProjectionPanel({
  items,
  onAdd,
  onChange,
  onDelete,
}: {
  items: RevenueItemRow[];
  onAdd: () => void;
  onChange: (id: number, patch: Partial<RevenueItemRow>) => void;
  onDelete: (id: number) => void;
}) {
  const includedTotal = items.filter((it) => it.isIncluded).reduce((s, it) => s + it.annualAmountUsd, 0);

  return (
    <Panel title="08 — REVENUE PROJECTION" eyebrow={`${fmtUsd(includedTotal)}/yr`}>
      <p className="mb-2 text-[11.5px] text-muted">
        What this facility itself generates each year — patient/service fees, pharmacy or lab income, rental or
        ancillary income, grants. These roll up into the program&apos;s feasibility alongside every other facility&apos;s.
        A facility with no rows here (an ambulance, an ICT hub) is assumed to generate none of its own.
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
                  <Select value={it.category} onChange={(e) => onChange(it.id, { category: e.target.value as RevenueCategory })}>
                    {REVENUE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {REVENUE_CATEGORY_LABEL[c]}
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
        + Add revenue source
      </Button>
    </Panel>
  );
}
