import { useState, useEffect } from "react";
import { Panel } from "@/components/ui/Panel";
import { Field, Input, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { fmtNum } from "@/components/ui/Metrics";
import type { BuildingTemplateRow, BuildingGenInfo } from "./types";

export function BuildingTemplatePanel({
  templates,
  onGenerate,
  info,
  busy,
}: {
  templates: BuildingTemplateRow[];
  onGenerate: (input: { templateSlug: string; grossAreaM2: number; markupPct: number }) => void;
  info: BuildingGenInfo | null;
  busy: boolean;
}) {
  const [slug, setSlug] = useState(templates[0]?.slug ?? "");
  const [gfa, setGfa] = useState(templates[0]?.referenceGfaM2 ?? 0);
  const [markupPct, setMarkupPct] = useState(10);
  const template = templates.find((t) => t.slug === slug) ?? templates[0] ?? null;

  useEffect(() => {
    if (!slug && templates[0]) {
      setSlug(templates[0].slug);
      setGfa(templates[0].referenceGfaM2);
    }
  }, [templates, slug]);

  return (
    <Panel title="03 — BUILDING TEMPLATE" accent>
      <p className="mb-2 text-[11.5px] text-muted">
        Modeled square-meter cost estimating: pick a template, set the gross floor area, and generate one BOQ line per
        UniFormat division (A–G) at that division&apos;s $/m² rate × GFA — see the breakdown in the summary panel.
      </p>
      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Field label="Template">
          <Select
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              const t = templates.find((x) => x.slug === e.target.value);
              if (t) setGfa(t.referenceGfaM2);
            }}
          >
            {templates.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name} ({t.defaultFloors} floor{t.defaultFloors === 1 ? "" : "s"})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Gross floor area (m²)">
          <Input type="number" className="font-mono" value={gfa} onChange={(e) => setGfa(Number(e.target.value))} />
        </Field>
        <Field label="Buffer (%)">
          <Input type="number" className="font-mono" value={markupPct} onChange={(e) => setMarkupPct(Number(e.target.value))} />
        </Field>
      </div>
      {template && (
        <p className="mb-2 text-[10.5px] text-muted">
          Reference GFA for this template: {fmtNum(template.referenceGfaM2)} m² across {template.defaultFloors}{" "}
          floor{template.defaultFloors === 1 ? "" : "s"} — a planning-stage hint, not enforced. The buffer is baked
          straight into every division&apos;s $/m² rate (not a separate line) — a flat margin over the template&apos;s
          placeholder rates for the surprises a rough figure can&apos;t see coming; set it to 0 to use the template rate
          exactly as seeded.
        </p>
      )}
      <Button
        variant="accent"
        disabled={busy || !slug || gfa <= 0}
        onClick={() => onGenerate({ templateSlug: slug, grossAreaM2: gfa, markupPct })}
      >
        {busy ? "Generating…" : "Generate building →"}
      </Button>
      {info && (
        <div className="mt-2 border border-amber bg-paper-flag px-2.5 py-2 text-[11.5px] leading-relaxed">
          <b>{info.templateName}</b> generated at <b>{fmtNum(info.grossAreaM2)} m²</b> across{" "}
          {info.defaultFloors} floor(s){info.markupPct > 0 && <> with a <b>{fmtNum(info.markupPct)}%</b> buffer baked into every rate</>} —{" "}
          {info.divisionCount} division rows added to the BOQ below.
        </div>
      )}
    </Panel>
  );
}
