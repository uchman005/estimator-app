import { Panel } from "@/components/ui/Panel";
import { Input, NumberInput } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { fmtUsd } from "@/components/ui/Metrics";
import type { HospitalEquipmentItemRow } from "./types";

/** Medical equipment — MRI scanner, sterilizer, etc. — only shown for a
 * hospital-type facility (see isHospitalFacility() in lib/facilityTypes.ts).
 * A separate procurement line from the general-contractor buildup above:
 * each row's own cost plus its own commissioning % (installation/testing)
 * adds straight onto the facility's grand total, with no architect/
 * contractor fee, escalation or contingency applied to it — see
 * computeCost() in lib/calc/engine.ts. */
export function HospitalEquipmentPanel({
  items,
  sectionNumber,
  onAdd,
  onChange,
  onDelete,
}: {
  items: HospitalEquipmentItemRow[];
  sectionNumber: number;
  onAdd: () => void;
  onChange: (id: number, patch: Partial<HospitalEquipmentItemRow>) => void;
  onDelete: (id: number) => void;
}) {
  const includedTotal = items
    .filter((it) => it.isIncluded)
    .reduce((s, it) => s + it.costUsd * (1 + it.commissioningPct / 100), 0);

  return (
    <Panel title={`${String(sectionNumber).padStart(2, "0")} — HOSPITAL EQUIPMENT`} eyebrow={fmtUsd(includedTotal)}>
      <p className="mb-2 text-[11.5px] text-muted">
        Medical equipment this facility needs — MRI, sterilizers, imaging, lab kit. Each row&apos;s own cost plus its
        own commissioning % (installation &amp; testing) adds straight onto the facility&apos;s total — no architect/
        contractor fee, escalation or contingency applies to equipment, only to the building works above.
      </p>

      {items.length > 0 && (
        <table className="mb-2 w-full text-[12px]">
          <thead>
            <tr className="text-left text-[10px] uppercase text-muted">
              <th className="pb-1 font-semibold">Equipment</th>
              <th className="pb-1 pl-2 font-semibold">Cost (USD)</th>
              <th className="pb-1 pl-2 font-semibold">Commissioning</th>
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-paper-line">
                <td className="py-1.5 pr-2">
                  <Input value={it.label} onChange={(e) => onChange(it.id, { label: e.target.value })} />
                </td>
                <td className="py-1.5 pr-2 w-32">
                  <NumberInput className="font-mono text-right" value={it.costUsd} onChange={(v) => onChange(it.id, { costUsd: v })} />
                </td>
                <td className="py-1.5 pr-2 w-24">
                  <NumberInput
                    className="font-mono text-right"
                    value={it.commissioningPct}
                    onChange={(v) => onChange(it.id, { commissioningPct: v })}
                  />
                </td>
                <td className="py-1.5 pr-2 w-16 text-center" title="Included in the facility total">
                  <input type="checkbox" checked={it.isIncluded} onChange={(e) => onChange(it.id, { isIncluded: e.target.checked })} />
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
        + Add equipment
      </Button>
    </Panel>
  );
}
