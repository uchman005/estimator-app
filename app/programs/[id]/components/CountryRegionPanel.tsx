import { Field, Select } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { fmtRelativeTime } from "@/components/ui/Metrics";
import { isLiveFxRate } from "@/lib/fx";
import type { CountryRow, ProgramRow } from "./types";

export function CountryRegionPanel({
  program,
  countries,
  costIndex,
  fx,
  fxFetchedAt,
  fxSource,
  fxStatus,
  fxBusy,
  onChangeCountry,
  onChangeRegion,
  onRefreshFx,
}: {
  program: ProgramRow;
  countries: CountryRow[];
  costIndex: number;
  fx: number;
  fxFetchedAt: string | null;
  fxSource: string | null;
  fxStatus: string;
  fxBusy: boolean;
  onChangeCountry: (countryId: string) => void;
  onChangeRegion: (regionId: number) => void;
  onRefreshFx: () => void;
}) {
  const country = countries.find((c) => c.id === program.countryId) ?? null;
  const isLive = isLiveFxRate(fxSource);

  return (
    <Panel title="01 — SITE LOCATION, CURRENCY & REGIONAL COST INDEX">
      <p className="mb-2 text-[11.5px] text-muted">
        One site, one location — every facility in this program shares this country/region and cost index.
      </p>
      <div className="mb-2 grid grid-cols-2 gap-3">
        <Field label="Country">
          <Select value={program.countryId} onChange={(e) => onChangeCountry(e.target.value)}>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.currencyCode})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Region">
          <Select value={program.regionId ?? country?.regions[0]?.id ?? ""} onChange={(e) => onChangeRegion(Number(e.target.value))}>
            {country?.regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.offsetPct >= 0 ? "+" : ""}
                {r.offsetPct}%)
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
        <span>
          Effective index: <b className="font-mono text-ink">{costIndex.toFixed(3)}</b>
        </span>
        <span>
          FX: <b className="font-mono text-ink">{fx.toFixed(2)}</b> / USD
        </span>
        <span
          className={`rounded-sm border px-1.5 py-0.5 text-[10px] ${
            isLive ? "border-green text-green" : "border-amber text-amber"
          }`}
        >
          {isLive ? `live · fetched ${fmtRelativeTime(fxFetchedAt)}` : "placeholder rate · never fetched"}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Button variant="ghost" onClick={onRefreshFx} disabled={fxBusy}>
          {fxBusy ? "Fetching…" : "Fetch live FX for all currencies"}
        </Button>
        <span className="text-[10.5px] text-muted">
          Rates are shared across every program — this is the only way any rate ever changes. No one can type one in.
        </span>
      </div>
      {fxStatus && <p className="mt-1 text-[11px] text-muted">{fxStatus}</p>}
    </Panel>
  );
}
