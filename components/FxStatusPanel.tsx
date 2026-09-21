"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { fmtRelativeTime } from "@/components/ui/Metrics";
import { isLiveFxRate } from "@/lib/fx";

interface CountryFx {
  id: string;
  name: string;
  currencyCode: string;
  fx: number;
  fxFetchedAt: string | null;
  fxSource: string | null;
}

export function FxStatusPanel() {
  const [countries, setCountries] = useState<CountryFx[] | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/reference");
    const data = await res.json();
    setCountries(data.countries);
  }

  useEffect(() => {
    load();
  }, []);

  async function refresh() {
    setBusy(true);
    setStatus("Fetching…");
    try {
      const res = await fetch("/api/fx/refresh", { method: "POST" });
      const data = await res.json();
      if (data.ok && !data.skipped) setStatus(`Updated ${data.updated?.length ?? 0} currencies just now.`);
      else if (data.skipped) setStatus(data.reason);
      else setStatus(data.error || "Fetch failed.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!countries) return null;

  // One row per currency, not per country (several countries can share USD/etc).
  const byCurrency = new Map<string, CountryFx>();
  for (const c of countries) if (!byCurrency.has(c.currencyCode)) byCurrency.set(c.currencyCode, c);

  return (
    <Panel title="EXCHANGE RATES" eyebrow="shared across every project">
      <p className="mb-2 text-[11.5px] text-muted">
        These rates are global — refreshing here updates the same numbers every project on the platform reads. There is no
        way to type a rate in by hand anywhere in the app; this button is the only thing that ever changes one.
      </p>
      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[...byCurrency.values()].map((c) => {
          const live = isLiveFxRate(c.fxSource);
          return (
            <div key={c.currencyCode} className="border border-paper-line px-2 py-1.5">
              <div className="font-mono text-[13px] font-semibold">
                {c.currencyCode} <span className="text-muted">/ USD</span>
              </div>
              <div className="font-mono text-[15px]">{c.fx.toFixed(2)}</div>
              <div className={`text-[10px] ${live ? "text-green" : "text-amber"}`}>
                {live ? `live · ${fmtRelativeTime(c.fxFetchedAt)}` : "never fetched"}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={refresh} disabled={busy}>
          {busy ? "Fetching…" : "Fetch live FX for all currencies"}
        </Button>
        {status && <span className="text-[11px] text-muted">{status}</span>}
      </div>
    </Panel>
  );
}
