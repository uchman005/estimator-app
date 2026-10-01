"use client";

import { useState } from "react";
import { Field, Input, Select } from "./Form";

const OTHER_SENTINEL = "__other__";

// Relabels an EXISTING facility's type. `presets` is the full option list
// (building template names + flat presets — see AddFacilityForm for the one
// place a building type also regenerates the BOQ; this field never does,
// it's a plain label edit). Starts in "custom" mode whenever the current
// value isn't one of the presets, so an existing free-text type (e.g.
// "Mortuary") shows as an editable text field, not a mismatched select.
export function FacilityTypeField({
  value,
  onChange,
  presets,
  label = "Facility type",
  className = "",
  compact = false,
}: {
  value: string;
  onChange: (v: string) => void;
  presets: readonly string[];
  label?: string;
  className?: string;
  /** No label, tighter sizing — for an inline table-row cell rather than a form field. */
  compact?: boolean;
}) {
  const isPreset = presets.includes(value);
  const [customMode, setCustomMode] = useState(!isPreset && value !== "");
  const selectClassName = compact ? "!w-auto py-1 text-[11px]" : undefined;
  const inputClassName = compact ? "!w-auto py-1 text-[11px]" : undefined;
  const fallback = presets[0] ?? "";

  const control = customMode ? (
    <div className="flex items-center gap-1">
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. Mortuary, Staff Housing" className={inputClassName} autoFocus />
      <button
        type="button"
        onClick={() => {
          setCustomMode(false);
          onChange(fallback);
        }}
        className="whitespace-nowrap text-[10.5px] text-blueprint underline"
      >
        list
      </button>
    </div>
  ) : (
    <Select
      value={isPreset ? value : fallback}
      className={selectClassName}
      onChange={(e) => {
        if (e.target.value === OTHER_SENTINEL) {
          setCustomMode(true);
          onChange("");
        } else {
          onChange(e.target.value);
        }
      }}
    >
      {presets.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
      <option value={OTHER_SENTINEL}>Other (free text)…</option>
    </Select>
  );

  if (compact) return <span className={className}>{control}</span>;
  return (
    <Field label={label} className={className}>
      {control}
    </Field>
  );
}
