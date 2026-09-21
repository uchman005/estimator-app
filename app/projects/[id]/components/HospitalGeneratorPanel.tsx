import { useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Field, Input, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import type { Tier } from "@/lib/calc/engine";
import type { HospitalGenInfo } from "./types";

export function HospitalGeneratorPanel({
  onGenerate,
  info,
  busy,
}: {
  onGenerate: (input: { beds: number; tier: Tier; floors: number; floorToFloorM: number; windowToWallRatioPct: number }) => void;
  info: HospitalGenInfo | null;
  busy: boolean;
}) {
  const [beds, setBeds] = useState(200);
  const [tier, setTier] = useState<Tier>("standard");
  const [floors, setFloors] = useState(5);
  const [ftf, setFtf] = useState(4.0);
  const [wwr, setWwr] = useState(30);

  return (
    <Panel title="03 — HOSPITAL BED-PROGRAM GENERATOR" accent>
      <p className="mb-2 text-[11.5px] text-muted">
        Derives gross floor area from published per-bed benchmarks, splits it into departments, sizes the envelope from the
        footprint, and sizes elevators &amp; stairs from US hospital code conventions.
      </p>
      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Field label="Beds">
          <Input type="number" className="font-mono" value={beds} onChange={(e) => setBeds(Number(e.target.value))} />
        </Field>
        <Field label="Tier">
          <Select value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </Select>
        </Field>
        <Field label="Floors">
          <Input type="number" className="font-mono" value={floors} onChange={(e) => setFloors(Number(e.target.value))} />
        </Field>
        <Field label="Floor-to-floor (m)">
          <Input type="number" step="0.1" className="font-mono" value={ftf} onChange={(e) => setFtf(Number(e.target.value))} />
        </Field>
        <Field label="Window ratio %">
          <Input type="number" className="font-mono" value={wwr} onChange={(e) => setWwr(Number(e.target.value))} />
        </Field>
      </div>
      <Button
        variant="accent"
        disabled={busy}
        onClick={() => onGenerate({ beds, tier, floors, floorToFloorM: ftf, windowToWallRatioPct: wwr })}
      >
        {busy ? "Generating…" : "Generate hospital program →"}
      </Button>
      {info && (
        <div className="mt-2 border border-amber bg-paper-flag px-2.5 py-2 text-[11.5px] leading-relaxed">
          <b>{Math.round(info.totalGFA).toLocaleString()} m² GFA</b> across {floors} floor(s), footprint ≈
          {Math.round(info.footprint).toLocaleString()} m². Envelope: {Math.round(info.wallAreaM2).toLocaleString()} m² wall,{" "}
          {Math.round(info.windowAreaM2).toLocaleString()} m² glazing, {info.doorCount} doors.{" "}
          <b>{info.elevators} elevator car(s)</b>, <b>{info.stairs} egress stair core(s)</b>.
          <div className="mt-1.5 text-[10.5px] text-muted">
            Space programme (informational — not separately priced, already inside Structural/Mechanical/Electrical/Specialized
            Medical/Finishing): {info.deptSplitM2.map((d) => `${d.label} ${Math.round(d.areaM2).toLocaleString()}m²`).join(" · ")}.
            Cross-check: ~{info.orCount} OR(s) suggested at 1:28 beds (FGI min {Math.round(info.orMinAreaM2)} m² for the rooms
            alone).
          </div>
        </div>
      )}
    </Panel>
  );
}
