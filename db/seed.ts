import { db } from "./index";
import {
  currencies,
  countries,
  regions,
  classNodes,
  aaceClasses,
  buildingTemplates,
  buildingTemplateDivisions,
} from "./schema";

/**
 * Idempotent-ish seed: safe to re-run against a fresh DB (db:setup does
 * migrate + seed). Re-running against a populated DB will duplicate rows —
 * this is a prototype seed, not a production migration-safe upsert.
 */
async function main() {
  console.log("Seeding currencies...");
  await db.insert(currencies).values([
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
    { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
    { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
    { code: "ZAR", symbol: "R", name: "South African Rand" },
  ]);

  console.log("Seeding countries & regions...");
  await db.insert(countries).values([
    { id: "ng", name: "Nigeria", currencyCode: "NGN", baseCostIndex: 1.0 },
    { id: "gh", name: "Ghana", currencyCode: "GHS", baseCostIndex: 1.08 },
    { id: "ke", name: "Kenya", currencyCode: "KES", baseCostIndex: 1.12 },
    { id: "za", name: "South Africa", currencyCode: "ZAR", baseCostIndex: 1.15 },
    { id: "us-custom", name: "Custom / USD baseline", currencyCode: "USD", baseCostIndex: 1.0 },
  ]);
  await db.insert(regions).values([
    { countryId: "ng", name: "National average", offsetPct: 0 },
    { countryId: "ng", name: "Lagos / Abuja / Port Harcourt (urban)", offsetPct: 25 },
    { countryId: "ng", name: "Rural / remote", offsetPct: -15 },
    { countryId: "gh", name: "National average", offsetPct: 0 },
    { countryId: "gh", name: "Accra (urban)", offsetPct: 20 },
    { countryId: "ke", name: "National average", offsetPct: 0 },
    { countryId: "ke", name: "Nairobi (urban)", offsetPct: 22 },
    { countryId: "za", name: "National average", offsetPct: 0 },
    { countryId: "za", name: "Johannesburg / Cape Town (urban)", offsetPct: 15 },
    { countryId: "us-custom", name: "National average", offsetPct: 0 },
  ]);

  // Seed FX at a fixed point-in-time value; /api/fx/refresh overwrites these
  // from a live source at runtime. These are placeholders, not a rate anyone
  // chose by hand — nothing in this app ever accepts a manually-typed rate.
  console.log("Seeding starting FX rates (Sept 2026 snapshot — placeholder until first live fetch)...");
  const { fxRates } = await import("./schema");
  const { SEED_FX_SOURCE } = await import("../lib/fx");
  await db.insert(fxRates).values([
    { currencyCode: "USD", rateToUsd: 1, source: SEED_FX_SOURCE, isManualOverride: false },
    { currencyCode: "NGN", rateToUsd: 1350, source: SEED_FX_SOURCE, isManualOverride: false },
    { currencyCode: "GHS", rateToUsd: 15.6, source: SEED_FX_SOURCE, isManualOverride: false },
    { currencyCode: "KES", rateToUsd: 129, source: SEED_FX_SOURCE, isManualOverride: false },
    { currencyCode: "ZAR", rateToUsd: 18.2, source: SEED_FX_SOURCE, isManualOverride: false },
  ]);

  console.log("Seeding AACE estimate classes...");
  await db.insert(aaceClasses).values([
    { classNumber: 5, contingencyPct: 30, bandLowPct: -50, bandHighPct: 100, description: "Concept — no drawings. Capacity/analogy-based." },
    { classNumber: 4, contingencyPct: 20, bandLowPct: -30, bandHighPct: 50, description: "Concept design, ~1-15% engineering complete." },
    { classNumber: 3, contingencyPct: 15, bandLowPct: -20, bandHighPct: 30, description: "Preliminary design, ~10-40% complete. Budget authorisation." },
    { classNumber: 2, contingencyPct: 10, bandLowPct: -15, bandHighPct: 20, description: "Detailed design, ~30-75% complete. Cost-control estimate." },
    { classNumber: 1, contingencyPct: 5, bandLowPct: -10, bandHighPct: 15, description: "Final design, ~65-100% complete. Bid / check estimate." },
  ]);

  console.log("Seeding UniFormat II classification tree...");
  // Level 1 — still used to classify a BOQ row (classNodeId), independent of
  // the flat customUnifCode ('A'..'G','Z') the building generator/BOQ UI
  // writes directly.
  const level1 = [
    { code: "A", name: "SUBSTRUCTURE" },
    { code: "B", name: "SHELL" },
    { code: "C", name: "INTERIORS" },
    { code: "D", name: "SERVICES" },
    { code: "E", name: "EQUIPMENT AND FURNISHINGS" },
    { code: "F", name: "SPECIAL CONSTRUCTION AND DEMOLITION" },
    { code: "G", name: "BUILDING SITEWORK" },
    { code: "Z", name: "GENERAL" },
  ];
  const idByCode: Record<string, number> = {};
  for (const n of level1) {
    const [row] = await db
      .insert(classNodes)
      .values({ code: n.code, name: n.name, level: 1, parentId: null })
      .returning();
    idByCode[n.code] = row.id;
  }

  const level2: { code: string; name: string; parent: string }[] = [
    { code: "A10", name: "Foundations", parent: "A" },
    { code: "B10", name: "Superstructure", parent: "B" },
    { code: "B20", name: "Exterior Enclosure", parent: "B" },
    { code: "B30", name: "Roofing", parent: "B" },
    { code: "C10", name: "Interior Construction", parent: "C" },
    { code: "C20", name: "Stairs", parent: "C" },
    { code: "C30", name: "Interior Finishes", parent: "C" },
    { code: "D10", name: "Conveying", parent: "D" },
    { code: "D20", name: "Plumbing", parent: "D" },
    { code: "D30", name: "HVAC", parent: "D" },
    { code: "D50", name: "Electrical", parent: "D" },
    { code: "E10", name: "Equipment", parent: "E" },
    { code: "F10", name: "Special Structures", parent: "F" },
    { code: "G10", name: "Site Preparation & Site Mechanical/Electrical Utilities", parent: "G" },
    { code: "G20", name: "Site Improvements", parent: "G" },
    { code: "Z90", name: "Custom / User-Defined", parent: "Z" },
  ];
  for (const n of level2) {
    const [row] = await db
      .insert(classNodes)
      .values({ code: n.code, name: n.name, level: 2, parentId: idByCode[n.parent] })
      .returning();
    idByCode[n.code] = row.id;
  }

  const leaves: { code: string; name: string; parent: string; level: number }[] = [
    { code: "B2010", name: "Exterior Walls", parent: "B20", level: 3 },
    { code: "B2020", name: "Exterior Windows", parent: "B20", level: 3 },
    { code: "B2030", name: "Exterior Doors", parent: "B20", level: 3 },
    { code: "C2010", name: "Stair Construction (accessible — ADA/ISO 21542)", parent: "C20", level: 3 },
    { code: "D1010", name: "Elevators & Lifts", parent: "D10", level: 3 },
    { code: "D2010", name: "Plumbing Fixtures (incl. borehole/water supply)", parent: "D20", level: 3 },
    { code: "D5030", name: "Communications & Security", parent: "D50", level: 3 },
    { code: "D5090", name: "Other Electrical Systems (incl. solar generation)", parent: "D50", level: 3 },
    { code: "E1030", name: "Vehicular Equipment", parent: "E10", level: 3 },
    { code: "F1000", name: "Special Process Facilities", parent: "F10", level: 3 },
    { code: "G1000", name: "Roads, Drainage, Fencing & Security", parent: "G10", level: 3 },
    { code: "G2000", name: "Park / Recreation / Sports Field", parent: "G20", level: 3 },
    { code: "Z9000", name: "User-Defined Custom Item", parent: "Z90", level: 3 },
  ];
  for (const n of leaves) {
    await db.insert(classNodes).values({ code: n.code, name: n.name, level: n.level, parentId: idByCode[n.parent] });
  }

  console.log("Seeding building templates (modeled square-meter cost estimating)...");
  // Placeholder $/m² rates, explicitly NOT independently sourced per division
  // — pending real QS validation. Four templates, one per facility type
  // that's actually a structure (everything except a vehicle like an
  // ambulance gets priced this way — see lib/facilityTypes.ts): the two
  // clinics' per-division PROPORTIONS follow a typical RSMeans-style
  // hospital/clinic split (Services and Equipment heavy) and their TOTAL
  // $/m² is baselined off the DHA Kenya Level 3A report's construction rate
  // range (KES 45,000-120,000/m², ~$350-930/m² at the seeded KES/USD rate
  // above) — a rural/remote clinic sits toward the low end of that range, an
  // advanced "Alpha" clinic (more specialized medical services) toward the
  // upper end. Residential Apartment and ICT Hub use their own, unrelated
  // division proportions — see each one's own note below.
  const templates: {
    slug: string;
    name: string;
    defaultFloors: number;
    referenceGfaM2: number;
    notes: string;
    divisions: { code: string; name: string; rate: number }[];
  }[] = [
    {
      slug: "rural_clinic",
      name: "Remote Clinic",
      defaultFloors: 2,
      referenceGfaM2: 650,
      notes:
        "GFA sized off the DHA Kenya Level 3A satellite clinic report's rural-clinic figures. Division $/m² rates are a placeholder split (not independently sourced) of that report's KES 45,000-120,000/m² construction-rate range across a typical RSMeans-style division proportion — override with real QS figures.",
      divisions: [
        { code: "A", name: "Substructure", rate: 27 },
        { code: "B", name: "Shell", rate: 76 },
        { code: "C", name: "Interiors", rate: 61 },
        { code: "D", name: "Services", rate: 122 },
        { code: "E", name: "Equipment & Furnishings", rate: 46 },
        { code: "F", name: "Special Construction", rate: 19 },
        { code: "G", name: "Building Sitework", rate: 30 },
      ],
    },
    {
      slug: "alpha_clinic",
      name: "Alpha Clinic",
      defaultFloors: 3,
      referenceGfaM2: 3000,
      notes:
        "GFA sized off the African Health Network functional-programme PDFs' advanced-clinic reference figure. Division $/m² rates are a placeholder split (not independently sourced) toward the upper end of the DHA Kenya report's KES 45,000-120,000/m² construction-rate range, reflecting more specialized medical services — override with real QS figures.",
      divisions: [
        { code: "A", name: "Substructure", rate: 60 },
        { code: "B", name: "Shell", rate: 135 },
        { code: "C", name: "Interiors", rate: 112 },
        { code: "D", name: "Services", rate: 255 },
        { code: "E", name: "Equipment & Furnishings", rate: 112 },
        { code: "F", name: "Special Construction", rate: 30 },
        { code: "G", name: "Building Sitework", rate: 45 },
      ],
    },
    {
      // Every facility type that's actually a structure gets priced this
      // way, not just the clinics — a residential block is ordinary
      // construction, no specialized medical/MEP load, so Shell & Interiors
      // dominate instead of Services & Equipment.
      slug: "residential_apartment",
      name: "Residential Apartment",
      defaultFloors: 4,
      referenceGfaM2: 1200,
      notes:
        "Placeholder $/m² rate and division split (not independently sourced) — general multi-unit residential construction proportions (Shell/Interiors-heavy, no specialized medical or data-center services), scaled below the clinic templates since there's no heavy MEP or medical equipment load. Override with real QS figures.",
      divisions: [
        { code: "A", name: "Substructure", rate: 30 },
        { code: "B", name: "Shell", rate: 106 },
        { code: "C", name: "Interiors", rate: 95 },
        { code: "D", name: "Services", rate: 76 },
        { code: "E", name: "Equipment & Furnishings", rate: 30 },
        { code: "F", name: "Special Construction", rate: 11 },
        { code: "G", name: "Building Sitework", rate: 30 },
      ],
    },
    {
      // The inverse of the residential split — a data/ICT hub is almost all
      // power and cooling (Services) plus the rack/server equipment itself
      // (Equipment & Furnishings), with comparatively little Interiors fit-out.
      slug: "ict_hub",
      name: "ICT Hub",
      defaultFloors: 1,
      referenceGfaM2: 800,
      notes:
        "Placeholder $/m² rate and division split (not independently sourced) — a data-center-grade proportion (Services and Equipment & Furnishings dominate: UPS/generator backup, precision cooling, server racks/cabling), among the highest $/m² of the seeded templates for exactly that reason. Override with real QS figures.",
      divisions: [
        { code: "A", name: "Substructure", rate: 57 },
        { code: "B", name: "Shell", rate: 142 },
        { code: "C", name: "Interiors", rate: 95 },
        { code: "D", name: "Services", rate: 380 },
        { code: "E", name: "Equipment & Furnishings", rate: 190 },
        { code: "F", name: "Special Construction", rate: 47 },
        { code: "G", name: "Building Sitework", rate: 38 },
      ],
    },
  ];

  for (const t of templates) {
    const [row] = await db
      .insert(buildingTemplates)
      .values({ slug: t.slug, name: t.name, defaultFloors: t.defaultFloors, referenceGfaM2: t.referenceGfaM2, notes: t.notes })
      .returning();
    await db.insert(buildingTemplateDivisions).values(
      t.divisions.map((d, i) => ({
        templateId: row.id,
        divisionCode: d.code,
        divisionName: d.name,
        baseRateUsdPerM2: d.rate,
        sortOrder: i,
      }))
    );
  }

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
