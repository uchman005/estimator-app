// The only two states an fx_rates.source column can be in. Nothing in this
// app ever inserts a fx_rates row with a user-supplied value — 'seed-default'
// is the bootstrap placeholder written by db/seed.ts (and by the
// reference/countries route when a brand-new currency is added), and
// LIVE_FX_SOURCE is written exclusively by POST /api/fx/refresh. There is no
// third path, and no UI anywhere lets a person type a rate directly.
export const LIVE_FX_SOURCE = "open.er-api.com";
export const SEED_FX_SOURCE = "seed-default";

export function isLiveFxRate(source: string | null | undefined): boolean {
  return source === LIVE_FX_SOURCE;
}
