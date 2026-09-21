import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { currencies, fxRates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { LIVE_FX_SOURCE } from "@/lib/fx";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// This is the ONLY route in the app that ever writes a real (non-placeholder)
// fx_rates row. There is no PATCH/PUT for fx rates anywhere, and no UI field
// accepts one — clicking this action (or another automated call to it) is
// the sole way any rate ever changes, and it changes it for every project
// using that currency at once, not just one project's view of it.
export async function POST(req: NextRequest) {
  const force = new URL(req.url).searchParams.get("force") === "true";

  const allCurrencies = await db.select().from(currencies);
  const updated: string[] = [];
  const skipped: string[] = [];

  // Respect the "once a day" spirit of the free tier, unless forced.
  if (!force) {
    const [lastLive] = await db
      .select()
      .from(fxRates)
      .where(eq(fxRates.source, LIVE_FX_SOURCE))
      .orderBy(desc(fxRates.fetchedAt))
      .limit(1);
    if (lastLive && Date.now() - new Date(lastLive.fetchedAt).getTime() < ONE_DAY_MS) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "Already refreshed within the last 24h — pass ?force=true to override.",
        lastFetchedAt: lastLive.fetchedAt,
      });
    }
  }

  let data: { rates?: Record<string, number> };
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    data = await res.json();
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: `Could not reach ${LIVE_FX_SOURCE}: ${(err as Error).message}. Existing rates are unchanged — there is no manual fallback by design; try again once the network issue clears.`,
      },
      { status: 502 }
    );
  }
  if (!data.rates) {
    return NextResponse.json({ ok: false, error: `${LIVE_FX_SOURCE} returned no rates.` }, { status: 502 });
  }

  for (const c of allCurrencies) {
    const rate = data.rates[c.code];
    if (rate == null) {
      skipped.push(c.code);
      continue;
    }
    await db.insert(fxRates).values({ currencyCode: c.code, rateToUsd: rate, source: LIVE_FX_SOURCE, isManualOverride: false });
    updated.push(c.code);
  }

  return NextResponse.json({ ok: true, updated, skipped, fetchedAt: new Date().toISOString() });
}
