import { db } from "./index";
import {
  currencies,
  countries,
  regions,
  classNodes,
  aaceClasses,
  buildingTypes,
  spaceTemplates,
  spaceTemplateItems,
  assemblies,
  assemblyTierRates,
  assemblyVariants,
  macroItems,
  macroItemSubItems,
  subItems,
  subItemMicroItems,
  microItems,
  microItemRates,
  users,
  programs,
} from "./schema";
import { hashPassword } from "../lib/auth/password";
import { randomBytes } from "crypto";

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
  // Level 1
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

  // Level 2 (+ some level 3/4 leaves used directly by assemblies)
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
    { code: "Z10", name: "Whole-Building Blended Rate (non-standard, pre-design use only)", parent: "Z" },
    { code: "Z20", name: "Composite Whole-Building Assembly (Main Item — aggregates macro-items spanning multiple UniFormat divisions)", parent: "Z" },
    { code: "Z90", name: "Custom / User-Defined", parent: "Z" },
  ];
  for (const n of level2) {
    const [row] = await db
      .insert(classNodes)
      .values({ code: n.code, name: n.name, level: 2, parentId: idByCode[n.parent] })
      .returning();
    idByCode[n.code] = row.id;
  }

  // Level 3/4 leaves — the codes assemblies actually attach to
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
    { code: "Z1000", name: "Whole-Facility Package", parent: "Z10", level: 3 },
    { code: "Z2000", name: "Hospital Building — Core Construction (Main Item)", parent: "Z20", level: 3 },
    { code: "Z2010", name: "Primary Health Care Clinic — Composite Construction (Main Item)", parent: "Z20", level: 3 },
    { code: "Z9000", name: "User-Defined Custom Item", parent: "Z90", level: 3 },
  ];
  for (const n of leaves) {
    const [row] = await db
      .insert(classNodes)
      .values({ code: n.code, name: n.name, level: n.level, parentId: idByCode[n.parent] })
      .returning();
    idByCode[n.code] = row.id;
  }

  console.log("Seeding the template catalog owner...");
  // Every assembly/sub-item/micro-item belongs to a program's catalog (see
  // lib/catalogClone.ts) — there's no "no program" catalog anymore. This
  // seed creates ONE program, flagged isTemplate, to own the starter catalog
  // below; every real program a user creates afterward gets its own cloned
  // copy of it (POST /api/programs), and anyone can import individual items
  // from it regardless of ownership. The owning user is never meant to log
  // in — its password is an unusable random value.
  const [templateUser] = await db
    .insert(users)
    .values({
      email: "catalog-template@system.local",
      passwordHash: hashPassword(randomBytes(32).toString("hex")),
      name: "Catalog Template (system)",
    })
    .returning();
  const [templateProgram] = await db
    .insert(programs)
    .values({ name: "Default Starter Catalog", ownerId: templateUser.id, countryId: "ng", isTemplate: true })
    .returning();
  const TEMPLATE_PROGRAM_ID = templateProgram.id;

  console.log("Seeding assemblies + rates/variants...");

  type TierSpec = { code: string; name: string; unit: string; classCode: string; baseDur: number; baseSize: number; exp: number; phase: string; rates: [number, number, number] };
  const tierAssemblies: TierSpec[] = [
    { code: "stairs_core", name: "Egress Stair Core", unit: "stair core", classCode: "C2010", baseDur: 2, baseSize: 2, exp: 0.2, phase: "vertical", rates: [35000, 55000, 85000] },
    { code: "elevator_car", name: "Elevators & Lifts", unit: "car", classCode: "D1010", baseDur: 5, baseSize: 2, exp: 0.25, phase: "procurement", rates: [90000, 150000, 220000] },
    { code: "solar", name: "Solar Microgrid", unit: "kWp", classCode: "D5090", baseDur: 3, baseSize: 100, exp: 0.3, phase: "site", rates: [900, 1400, 2000] },
    { code: "borehole", name: "Borehole & Water System", unit: "borehole", classCode: "D2010", baseDur: 2, baseSize: 1, exp: 0.2, phase: "site", rates: [12000, 22000, 38000] },
    { code: "data_hub", name: "Data Hub / ICT Infrastructure", unit: "facility", classCode: "D5030", baseDur: 3, baseSize: 1, exp: 0.25, phase: "vertical", rates: [15000, 35000, 70000] },
    { code: "ambulance", name: "ER Fleet / Ambulance (each)", unit: "vehicle", classCode: "E1030", baseDur: 4, baseSize: 1, exp: 0.15, phase: "procurement", rates: [35000, 55000, 85000] },
    { code: "waste", name: "Waste-to-Value Facility", unit: "facility", classCode: "F1000", baseDur: 4, baseSize: 1, exp: 0.3, phase: "vertical", rates: [30000, 60000, 110000] },
    { code: "park", name: "Park / Recreation / Sports Field", unit: "hectare", classCode: "G2000", baseDur: 3, baseSize: 1, exp: 0.4, phase: "site", rates: [40000, 70000, 120000] },
    { code: "site_infra", name: "Roads, Drainage, Fencing & Security", unit: "hectare", classCode: "G1000", baseDur: 4, baseSize: 1, exp: 0.35, phase: "site", rates: [25000, 45000, 75000] },
    // "phc" moved to the composite mainItems array below — it now has a real
    // macro-item/sub-item/micro-item takeoff (Clinic Shell → Theatre → door/
    // wall/window/beam) instead of a single blended tier rate.
    { code: "primary_school", name: "Primary School Block", unit: "m²", classCode: "Z1000", baseDur: 8, baseSize: 1000, exp: 0.5, phase: "vertical", rates: [220, 320, 450] },
    { code: "secondary_school", name: "Secondary School Block", unit: "m²", classCode: "Z1000", baseDur: 9, baseSize: 1200, exp: 0.5, phase: "vertical", rates: [250, 380, 520] },
    { code: "family_housing", name: "Family / Staff Housing (per unit)", unit: "unit", classCode: "Z1000", baseDur: 5, baseSize: 1, exp: 0.25, phase: "vertical", rates: [9000, 16000, 28000] },
    { code: "worker_apartments", name: "Health Worker Apartments (per unit)", unit: "unit", classCode: "Z1000", baseDur: 5, baseSize: 1, exp: 0.25, phase: "vertical", rates: [8500, 15000, 26000] },
    { code: "hall", name: "Community Hall / Chapel", unit: "m²", classCode: "Z1000", baseDur: 5, baseSize: 500, exp: 0.5, phase: "vertical", rates: [280, 420, 600] },
    { code: "commercial", name: "Commercial / Retail Space", unit: "m²", classCode: "Z1000", baseDur: 6, baseSize: 600, exp: 0.5, phase: "vertical", rates: [260, 400, 580] },
  ];

  const assemblyIdByCode: Record<string, number> = {};
  for (const a of tierAssemblies) {
    const [row] = await db
      .insert(assemblies)
      .values({
        programId: TEMPLATE_PROGRAM_ID,
        classNodeId: idByCode[a.classCode],
        name: a.name,
        slug: a.code,
        unit: a.unit,
        hasVariants: false,
        baseDurationMonths: a.baseDur,
        baseSize: a.baseSize,
        durationExponent: a.exp,
        phase: a.phase,
      })
      .returning();
    assemblyIdByCode[a.code] = row.id;
    await db.insert(assemblyTierRates).values([
      { assemblyId: row.id, tier: "basic", unitRateUsd: a.rates[0] },
      { assemblyId: row.id, tier: "standard", unitRateUsd: a.rates[1] },
      { assemblyId: row.id, tier: "premium", unitRateUsd: a.rates[2] },
    ]);
  }

  // Custom / user-defined
  {
    const [row] = await db
      .insert(assemblies)
      .values({
        programId: TEMPLATE_PROGRAM_ID,
        classNodeId: idByCode["Z9000"],
        name: "Custom / Other",
        slug: "custom",
        unit: "unit",
        hasVariants: false,
        baseDurationMonths: 3,
        baseSize: 1,
        durationExponent: 0.3,
        phase: "vertical",
        isCustom: true,
      })
      .returning();
    assemblyIdByCode["custom"] = row.id;
    await db.insert(assemblyTierRates).values([
      { assemblyId: row.id, tier: "basic", unitRateUsd: 0 },
      { assemblyId: row.id, tier: "standard", unitRateUsd: 0 },
      { assemblyId: row.id, tier: "premium", unitRateUsd: 0 },
    ]);
  }

  // Variant-based assemblies: walls, windows, doors
  const [wallRow] = await db
    .insert(assemblies)
    .values({ programId: TEMPLATE_PROGRAM_ID, classNodeId: idByCode["B2010"], name: "Exterior Walls", slug: "ext_wall", unit: "m² wall", pricingMode: "variant", hasVariants: true, baseDurationMonths: 3, baseSize: 1500, durationExponent: 0.4, phase: "vertical" })
    .returning();
  assemblyIdByCode["ext_wall"] = wallRow.id;
  await db.insert(assemblyVariants).values([
    { assemblyId: wallRow.id, label: "Sandcrete block + render", unitRateUsd: 85, laborPct: 45, materialPct: 55 },
    { assemblyId: wallRow.id, label: "Precast concrete panel", unitRateUsd: 150, laborPct: 30, materialPct: 70 },
    { assemblyId: wallRow.id, label: "Rainscreen cladding", unitRateUsd: 210, laborPct: 35, materialPct: 65 },
    { assemblyId: wallRow.id, label: "Curtain wall / glazed system", unitRateUsd: 320, laborPct: 40, materialPct: 60 },
  ]);

  const [winRow] = await db
    .insert(assemblies)
    .values({ programId: TEMPLATE_PROGRAM_ID, classNodeId: idByCode["B2020"], name: "Exterior Windows", slug: "ext_window", unit: "m² glazing", pricingMode: "variant", hasVariants: true, baseDurationMonths: 2, baseSize: 500, durationExponent: 0.3, phase: "vertical" })
    .returning();
  assemblyIdByCode["ext_window"] = winRow.id;
  await db.insert(assemblyVariants).values([
    { assemblyId: winRow.id, label: "Aluminum sliding, single glazed", unitRateUsd: 180, laborPct: 35, materialPct: 65 },
    { assemblyId: winRow.id, label: "uPVC, double glazed", unitRateUsd: 260, laborPct: 30, materialPct: 70 },
    { assemblyId: winRow.id, label: "Structural curtain wall glazing", unitRateUsd: 420, laborPct: 40, materialPct: 60 },
    { assemblyId: winRow.id, label: "Impact / hurricane-rated glazing", unitRateUsd: 480, laborPct: 38, materialPct: 62 },
  ]);

  const [doorRow] = await db
    .insert(assemblies)
    .values({ programId: TEMPLATE_PROGRAM_ID, classNodeId: idByCode["B2030"], name: "Exterior Doors", slug: "ext_door", unit: "door", pricingMode: "variant", hasVariants: true, baseDurationMonths: 1, baseSize: 10, durationExponent: 0.2, phase: "vertical" })
    .returning();
  assemblyIdByCode["ext_door"] = doorRow.id;
  await db.insert(assemblyVariants).values([
    { assemblyId: doorRow.id, label: "Steel hollow-core", unitRateUsd: 600, laborPct: 40, materialPct: 60 },
    { assemblyId: doorRow.id, label: "Aluminum-framed glazed", unitRateUsd: 1400, laborPct: 35, materialPct: 65 },
    { assemblyId: doorRow.id, label: "Automatic sliding (accessible entrance)", unitRateUsd: 8500, laborPct: 25, materialPct: 75 },
  ]);

  console.log("Seeding the hospital's composite Main Item (Structural/Mechanical/Electrical/Specialized Medical/Finishing as macro-items)...");
  // Sourced from a 2025 Nigerian market breakdown (Jedha Engineering &
  // Construction Co. Ltd — "Hospital Construction Costs in Nigeria (2025):
  // Complete Guide"), which gives a per-m² Basic/Standard split across
  // exactly these five categories; their stated totals (Basic ₦265k-385k/m²,
  // Standard ₦415k-560k/m², Premium ₦595k-865k/m²) match summing these
  // category midpoints, so the category-level numbers are the sourced part.
  // Everything below the macro-item level (sub-items, micro-items) is this
  // seed's own reasonable allocation of a sourced category total, not
  // independently sourced — edit freely once you have real subcontractor
  // quotes. This is deliberately a small, manageable "samples" tree (a
  // handful of macro-items, one or two sub-items each, two to four
  // micro-items each) — the schema supports up to ~1000 at any level, but
  // seeding that many isn't useful without real project data behind it.
  const PDF_SOURCE = "JECCL — Hospital Construction Costs in Nigeria (2025), per-m² breakdown table";
  const EST_SPLIT = "Estimated split of a sourced category total — not independently sourced. Override with real quotes.";

  type MicroSpec = { name: string; unit: string; qty?: number; rates: [number, number, number]; note: string };
  type SubSpec = { name: string; micros: MicroSpec[]; qty?: number; labour?: [number, number, number]; note?: string };
  type MacroSpec = { name: string; subs: SubSpec[]; labour?: [number, number, number]; note?: string };
  type MainItemSpec = {
    code: string; name: string; unit: string; classCode: string;
    baseDur: number; baseSize: number; exp: number; phase: string;
    macros: MacroSpec[];
  };

  const mainItems: MainItemSpec[] = [
    {
      code: "hospital_core", name: "Hospital Building — Core Construction", unit: "m² GFA", classCode: "Z2000",
      baseDur: 10, baseSize: 3000, exp: 0.5, phase: "vertical",
      macros: [
        { name: "Structural Work", note: PDF_SOURCE, subs: [
          { name: "Substructure", note: PDF_SOURCE, micros: [
            { name: "Excavation & footings", unit: "m² GFA", rates: [14.2, 19.1, 28.6], note: EST_SPLIT },
            { name: "Ground floor slab-on-grade", unit: "m² GFA", rates: [9.5, 12.7, 19.1], note: EST_SPLIT },
          ]},
          { name: "Superstructure", note: PDF_SOURCE, micros: [
            { name: "Reinforced concrete frame", unit: "m² GFA", rates: [13.5, 18.1, 27.1], note: EST_SPLIT },
            { name: "Suspended floor slabs", unit: "m² GFA", rates: [7.2, 9.8, 14.6], note: EST_SPLIT },
            { name: "Roof structure & trusses", unit: "m² GFA", rates: [8.1, 10.9, 16.4], note: EST_SPLIT },
            { name: "Roof covering & waterproofing", unit: "m² GFA", rates: [6.7, 9.0, 13.4], note: EST_SPLIT },
          ]},
        ]},
        { name: "Mechanical Systems", note: PDF_SOURCE, subs: [
          { name: "HVAC", note: PDF_SOURCE, micros: [
            { name: "Air handling units & ductwork", unit: "m² GFA", rates: [9.2, 14.6, 22.0], note: EST_SPLIT },
            { name: "Chillers & refrigeration plant", unit: "m² GFA", rates: [6.1, 9.8, 14.6], note: EST_SPLIT },
          ]},
          { name: "Plumbing & Fire Protection", note: PDF_SOURCE, micros: [
            { name: "Plumbing, drainage & water supply", unit: "m² GFA", rates: [8.3, 13.3, 20.0], note: EST_SPLIT },
            { name: "Fire protection & sprinkler systems", unit: "m² GFA", rates: [4.2, 6.7, 10.0], note: EST_SPLIT },
          ]},
        ]},
        { name: "Electrical Systems", note: PDF_SOURCE, subs: [
          { name: "Power Distribution", note: PDF_SOURCE, micros: [
            { name: "Main switchgear & panels", unit: "m² GFA", rates: [6.5, 11.0, 16.5], note: EST_SPLIT },
            { name: "Branch wiring & containment", unit: "m² GFA", rates: [8.0, 13.4, 20.1], note: EST_SPLIT },
          ]},
          { name: "Standby Power & Lighting", note: PDF_SOURCE, micros: [
            { name: "Backup generator & UPS systems", unit: "m² GFA", rates: [6.0, 10.2, 15.3], note: EST_SPLIT },
            { name: "Lighting & low-voltage systems", unit: "m² GFA", rates: [3.6, 6.1, 9.1], note: EST_SPLIT },
          ]},
        ]},
        { name: "Specialized Medical Areas", note: PDF_SOURCE, subs: [
          { name: "Surgical & Critical Care Fit-out", note: PDF_SOURCE, micros: [
            { name: "Operating theatre fit-out", unit: "m² GFA", rates: [33.4, 50.6, 75.8], note: EST_SPLIT },
            { name: "ICU fit-out", unit: "m² GFA", rates: [22.2, 33.8, 50.6], note: EST_SPLIT },
          ]},
          { name: "Diagnostic & Imaging Fit-out", note: PDF_SOURCE, micros: [
            { name: "Radiology imaging shielding", unit: "m² GFA", rates: [20.3, 31.0, 46.4], note: EST_SPLIT },
            { name: "Laboratory casework & fume hoods", unit: "m² GFA", rates: [16.7, 25.3, 37.9], note: EST_SPLIT },
          ]},
        ]},
        { name: "Finishing", note: PDF_SOURCE, subs: [
          { name: "Floor & Wall Finishes", note: PDF_SOURCE, micros: [
            { name: "Flooring & wall tiling", unit: "m² GFA", rates: [13.3, 19.9, 29.8], note: EST_SPLIT },
            { name: "Painting & decorative finishes", unit: "m² GFA", rates: [7.1, 10.7, 16.0], note: EST_SPLIT },
          ]},
          { name: "Ceilings & Fixtures", note: PDF_SOURCE, micros: [
            { name: "Suspended ceilings", unit: "m² GFA", rates: [9.1, 13.7, 20.6], note: EST_SPLIT },
            { name: "Internal doors & ironmongery", unit: "m² GFA", rates: [7.5, 11.3, 16.8], note: EST_SPLIT },
          ]},
        ]},
      ],
    },
    {
      // Demonstrates the OTHER composite pattern in the same schema: instead
      // of every micro-item being a $/m²-GFA rate (quantity defaults to 1,
      // as above), this one is a literal quantity takeoff — a real count of
      // doors, an actual m² of wall, a real number of beams — that sums to
      // an absolute cost for ONE clinic. A project's line-item quantity
      // then means "how many of this templated clinic" (e.g. 5 satellite
      // clinics), not m² of anything. Both patterns coexist under the same
      // pricingMode:'composite' because quantity lives on the micro-item,
      // not the assembly — see MicroItemLite in lib/calc/engine.ts.
      code: "phc_clinic", name: "Primary Health Care Clinic — Composite", unit: "facility", classCode: "Z2010",
      baseDur: 7, baseSize: 1, exp: 0.3, phase: "vertical",
      macros: [
        { name: "Clinic Shell & General Fit-out", note: "Blended turnkey rate for the non-specialized bulk of a small single-storey clinic — deliberately not broken down further; not every macro-item needs to be.", subs: [
          { name: "General Construction", micros: [
            { name: "Structure, services & general fit-out (whole-clinic blended rate)", unit: "m² GFA", qty: 300, rates: [220, 320, 450], note: "Blended per-m² rate, same basis as the school/housing assemblies — appropriate for a small single-storey building where full disaggregation isn't worth the effort." },
          ]},
        ]},
        { name: "Minor Theatre / Procedure Room", note: "A literal component takeoff for one procedure room, not a per-m² split of a sourced total — quantities, rates and labour are planning-stage placeholders, edit them to match an actual room layout.", labour: [150, 300, 500], subs: [
          { name: "Theatre Envelope", labour: [200, 350, 600], micros: [
            { name: "Theatre door (fire-rated)", unit: "door", qty: 2, rates: [700, 1400, 2400], note: "Placeholder rate — align with the Exterior Doors variant rates in the Rate Book if this clinic's doors are externally exposed." },
            { name: "Theatre wall construction", unit: "m²", qty: 45, rates: [85, 150, 220], note: "Placeholder rate — align with the Exterior/Interior Walls variants if applicable." },
            { name: "Theatre window (impact-resistant)", unit: "m²", qty: 4, rates: [200, 280, 420], note: "Placeholder rate." },
          ]},
          { name: "Theatre Structure", labour: [80, 150, 250], micros: [
            { name: "Roof/ceiling structural beam", unit: "beam", qty: 6, rates: [300, 500, 750], note: "Placeholder rate — a small-span RC or steel beam typical of a single-storey procedure room." },
          ]},
        ]},
      ],
    },
  ];

  for (const item of mainItems) {
    const [row] = await db
      .insert(assemblies)
      .values({
        programId: TEMPLATE_PROGRAM_ID,
        classNodeId: idByCode[item.classCode],
        name: item.name,
        slug: item.code,
        unit: item.unit,
        pricingMode: "composite",
        hasVariants: false,
        baseDurationMonths: item.baseDur,
        baseSize: item.baseSize,
        durationExponent: item.exp,
        phase: item.phase,
      })
      .returning();
    assemblyIdByCode[item.code] = row.id;

    for (let ma = 0; ma < item.macros.length; ma++) {
      const macro = item.macros[ma];
      const [macroRow] = await db
        .insert(macroItems)
        .values({
          assemblyId: row.id, name: macro.name, sortOrder: ma, sourceNote: macro.note ?? null,
          labourBasic: macro.labour?.[0] ?? 0, labourStandard: macro.labour?.[1] ?? 0, labourPremium: macro.labour?.[2] ?? 0,
        })
        .returning();

      for (let si = 0; si < macro.subs.length; si++) {
        const sub = macro.subs[si];
        // sub_items is a reusable library row now — create it standalone,
        // then join it into this macro-item with a quantity (default 1,
        // meaning "one of this sub-item makes up the macro-item").
        const [subRow] = await db
          .insert(subItems)
          .values({
            programId: TEMPLATE_PROGRAM_ID,
            name: sub.name, sourceNote: sub.note ?? null,
            labourBasic: sub.labour?.[0] ?? 0, labourStandard: sub.labour?.[1] ?? 0, labourPremium: sub.labour?.[2] ?? 0,
          })
          .returning();
        await db.insert(macroItemSubItems).values({ macroItemId: macroRow.id, subItemId: subRow.id, quantity: sub.qty ?? 1, sortOrder: si });

        for (let mi = 0; mi < sub.micros.length; mi++) {
          const micro = sub.micros[mi];
          // micro_items is likewise a reusable library row — create it
          // standalone, then join it into this sub-item with its own
          // quantity (2 doors, 45 m² of wall, or just 1 for a plain
          // $/unit-rate item).
          const [microRow] = await db
            .insert(microItems)
            .values({ programId: TEMPLATE_PROGRAM_ID, name: micro.name, unit: micro.unit, sourceNote: micro.note })
            .returning();
          await db.insert(subItemMicroItems).values({ subItemId: subRow.id, microItemId: microRow.id, quantity: micro.qty ?? 1, sortOrder: mi });
          await db.insert(microItemRates).values([
            { microItemId: microRow.id, tier: "basic", unitRateUsd: micro.rates[0] },
            { microItemId: microRow.id, tier: "standard", unitRateUsd: micro.rates[1] },
            { microItemId: microRow.id, tier: "premium", unitRateUsd: micro.rates[2] },
          ]);
        }
      }
    }
  }

  console.log("Seeding hospital building type & space template...");
  const [hospitalType] = await db
    .insert(buildingTypes)
    .values({ name: "Acute Care Hospital", driverUnit: "bed" })
    .returning();
  const [hospitalTemplate] = await db
    .insert(spaceTemplates)
    .values({
      buildingTypeId: hospitalType.id,
      name: "General Acute Hospital — default space program",
      gfaPerDriverBasic: 65,
      gfaPerDriverStandard: 95,
      gfaPerDriverPremium: 160,
    })
    .returning();
  await db.insert(spaceTemplateItems).values([
    // Informational space-programming split only — NOT separately priced.
    // The five composite assemblies above already price the whole GFA
    // inclusive of this mix (see the note above compositeAssemblies), so
    // these rows carry no assemblyId. Surfaced in the generator's info
    // panel as "how the floor area breaks down by department."
    { templateId: hospitalTemplate.id, label: "Inpatient Nursing Units", pctOfGfa: 42, assemblyId: null },
    { templateId: hospitalTemplate.id, label: "Surgical / Operating Theatre Suite", pctOfGfa: 9, assemblyId: null },
    { templateId: hospitalTemplate.id, label: "Diagnostic & Treatment", pctOfGfa: 13, assemblyId: null },
    { templateId: hospitalTemplate.id, label: "Emergency Department", pctOfGfa: 6, assemblyId: null },
    { templateId: hospitalTemplate.id, label: "Administration", pctOfGfa: 8, assemblyId: null },
    { templateId: hospitalTemplate.id, label: "Support Services", pctOfGfa: 12, assemblyId: null },
    { templateId: hospitalTemplate.id, label: "Circulation, Risers & Plant (residual)", pctOfGfa: 10, assemblyId: null },
  ]);

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
