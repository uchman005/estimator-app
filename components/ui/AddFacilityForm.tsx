"use client";

import { useState } from "react";
import { Field, Input, Select } from "./Form";
import { Button } from "./Button";
import { FLAT_FACILITY_TYPE_PRESETS } from "@/lib/facilityTypes";

export interface BuildingTemplateChoice {
  slug: string;
  name: string;
  defaultFloors: number;
  referenceGfaM2: number;
}

export interface AddFacilityInput {
  name: string;
  facilityType: string;
  /** Present only when a building template was picked — the caller generates the BOQ immediately. */
  building?: { templateSlug: string; grossAreaM2: number; markupPct: number };
}

const OTHER_VALUE = "__other__";
const buildingValue = (slug: string) => `building:${slug}`;
const flatValue = (name: string) => `flat:${name}`;

// The shared "add a facility" control — a building template generates the
// BOQ right away (so there's something to price, not an empty facility
// behind a label), a flat/free-text type is just a label. Used identically
// on the program page and on the standalone /facilities page.
export function AddFacilityForm({
  buildingTemplates,
  onAdd,
  namePlaceholder = "e.g. 200-Bed Hospital, Level V",
}: {
  buildingTemplates: BuildingTemplateChoice[];
  onAdd: (input: AddFacilityInput) => Promise<void>;
  namePlaceholder?: string;
}) {
  const [name, setName] = useState("");
  const initialChoice = buildingTemplates[0] ? buildingValue(buildingTemplates[0].slug) : flatValue(FLAT_FACILITY_TYPE_PRESETS[0]);
  const [choice, setChoice] = useState(initialChoice);
  const [customType, setCustomType] = useState("");
  const [gfa, setGfa] = useState(buildingTemplates[0]?.referenceGfaM2 ?? 0);
  const [markupPct, setMarkupPct] = useState(10);
  const [busy, setBusy] = useState(false);

  const selectedTemplate = choice.startsWith("building:") ? buildingTemplates.find((t) => buildingValue(t.slug) === choice) ?? null : null;
  const isOther = choice === OTHER_VALUE;

  async function submit() {
    if (!name.trim()) return;
    if (isOther && !customType.trim()) return;
    setBusy(true);
    try {
      if (selectedTemplate) {
        await onAdd({
          name: name.trim(),
          facilityType: selectedTemplate.name,
          building: { templateSlug: selectedTemplate.slug, grossAreaM2: Math.max(1, gfa), markupPct: Math.max(0, markupPct) },
        });
      } else if (isOther) {
        await onAdd({ name: name.trim(), facilityType: customType.trim() });
      } else {
        await onAdd({ name: name.trim(), facilityType: choice.slice("flat:".length) });
      }
      setName("");
      setCustomType("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <Field label="Facility name" className="min-w-[200px] flex-1">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={namePlaceholder} />
      </Field>
      <Field label="Facility type">
        <Select
          value={choice}
          onChange={(e) => {
            setChoice(e.target.value);
            const t = buildingTemplates.find((x) => buildingValue(x.slug) === e.target.value);
            if (t) setGfa(t.referenceGfaM2);
          }}
        >
          {buildingTemplates.length > 0 && (
            <optgroup label="Buildings (generates the BOQ)">
              {buildingTemplates.map((t) => (
                <option key={t.slug} value={buildingValue(t.slug)}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label="Other facility types">
            {FLAT_FACILITY_TYPE_PRESETS.map((p) => (
              <option key={p} value={flatValue(p)}>
                {p}
              </option>
            ))}
            <option value={OTHER_VALUE}>Other (free text)…</option>
          </optgroup>
        </Select>
      </Field>
      {selectedTemplate && (
        <>
          <Field label="Gross floor area (m²)">
            <Input type="number" className="w-28 font-mono" value={gfa} onChange={(e) => setGfa(Number(e.target.value))} />
          </Field>
          <Field label="Buffer (%)">
            <Input type="number" className="w-20 font-mono" value={markupPct} onChange={(e) => setMarkupPct(Number(e.target.value))} />
          </Field>
        </>
      )}
      {isOther && (
        <Field label="Type name">
          <Input value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="e.g. Mortuary" />
        </Field>
      )}
      <Button onClick={submit} disabled={busy || !name.trim() || (isOther && !customType.trim())}>
        {busy ? "Adding…" : "+ Add facility"}
      </Button>
    </div>
  );
}
