"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input, Select, NumField } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";

export default function NewProgramForm({ countries }: { countries: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("Regional Hospital System — Worked Example");
  const [countryId, setCountryId] = useState(countries[0]?.id ?? "ng");
  const [fundedUsd, setFundedUsd] = useState(0);
  const [busy, setBusy] = useState(false);

  async function createProgram() {
    setBusy(true);
    try {
      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, countryId, fundedUsd }),
      });
      const row = await res.json();
      router.push(`/programs/${row.id}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
      <Field label="Program name" className="min-w-[220px] flex-1">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Country">
        <Select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <NumField label="Proposed funding (USD)" value={fundedUsd} onChange={setFundedUsd} />
      <Button onClick={createProgram} disabled={busy}>
        {busy ? "Creating…" : "+ New program"}
      </Button>
    </div>
  );
}
