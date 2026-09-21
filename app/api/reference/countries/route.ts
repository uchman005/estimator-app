import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { countries, currencies, regions, fxRates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SEED_FX_SOURCE } from "@/lib/fx";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const id: string = body.id || body.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || `country-${Date.now()}`;

  const currencyCode = (body.currencyCode || "USD").toUpperCase();
  const [existingCurrency] = await db.select().from(currencies).where(eq(currencies.code, currencyCode));
  if (!existingCurrency) {
    await db.insert(currencies).values({ code: currencyCode, symbol: body.currencySymbol || currencyCode, name: body.currencyName || currencyCode });
  }

  // Every currency needs a starting fx_rates row so the UI can show "never
  // fetched" honestly instead of silently defaulting to 1 with no record at
  // all. This is a placeholder, not a rate anyone chose — the only way it
  // ever changes after this is POST /api/fx/refresh.
  const [existingRate] = await db.select().from(fxRates).where(eq(fxRates.currencyCode, currencyCode));
  if (!existingRate) {
    await db.insert(fxRates).values({ currencyCode, rateToUsd: 1, source: SEED_FX_SOURCE, isManualOverride: false });
  }

  const [row] = await db
    .insert(countries)
    .values({ id, name: body.name || "New country", currencyCode, baseCostIndex: body.baseCostIndex ?? 1.0 })
    .returning();
  await db.insert(regions).values({ countryId: id, name: "National average", offsetPct: 0 });

  return NextResponse.json(row, { status: 201 });
}
