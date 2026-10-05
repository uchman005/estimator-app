import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/* -------------------------------------------------------------------- */
/*  Users, sessions                                                      */
/* -------------------------------------------------------------------- */

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(), // always stored lowercase
  passwordHash: text("password_hash").notNull(), // "salt:hash" hex, scrypt
  name: text("name"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(), // random 32-byte hex — the session cookie value
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/* -------------------------------------------------------------------- */
/*  Reference data: currencies, countries, regions, FX                  */
/* -------------------------------------------------------------------- */

export const currencies = sqliteTable("currencies", {
  code: text("code").primaryKey(), // ISO 4217, e.g. 'NGN'
  symbol: text("symbol").notNull(),
  name: text("name").notNull(),
});

export const countries = sqliteTable("countries", {
  id: text("id").primaryKey(), // slug, e.g. 'ng'
  name: text("name").notNull(),
  currencyCode: text("currency_code")
    .notNull()
    .references(() => currencies.code),
  baseCostIndex: real("base_cost_index").notNull().default(1.0), // relative to USD/global baseline
  notes: text("notes"),
});

export const regions = sqliteTable("regions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  countryId: text("country_id")
    .notNull()
    .references(() => countries.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  offsetPct: real("offset_pct").notNull().default(0), // e.g. +25 for urban premium, -15 for rural discount
});

export const fxRates = sqliteTable("fx_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  currencyCode: text("currency_code")
    .notNull()
    .references(() => currencies.code),
  rateToUsd: real("rate_to_usd").notNull(), // local units per 1 USD
  source: text("source").notNull(), // 'open.er-api.com' | 'manual'
  isManualOverride: integer("is_manual_override", { mode: "boolean" })
    .notNull()
    .default(false),
  fetchedAt: text("fetched_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/* -------------------------------------------------------------------- */
/*  Classification: UniFormat II (ASTM E1557) as a self-referencing tree */
/* -------------------------------------------------------------------- */

export const classNodes = sqliteTable("class_nodes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  parentId: integer("parent_id"),
  standard: text("standard").notNull().default("UNIFORMAT_II"), // room to add 'MASTERFORMAT' later
  code: text("code").notNull(), // e.g. 'B2010'
  name: text("name").notNull(), // e.g. 'Exterior Walls'
  level: integer("level").notNull(), // 1..4
});

/* -------------------------------------------------------------------- */
/*  AACE estimate classification (18R-97 / 56R-08)                      */
/* -------------------------------------------------------------------- */

export const aaceClasses = sqliteTable("aace_classes", {
  classNumber: integer("class_number").primaryKey(), // 5..1
  contingencyPct: real("contingency_pct").notNull(),
  bandLowPct: real("band_low_pct").notNull(), // e.g. -50
  bandHighPct: real("band_high_pct").notNull(), // e.g. 100
  description: text("description").notNull(),
});

/* -------------------------------------------------------------------- */
/*  Programs: the elevated level — a site/campus/portfolio that owns    */
/*  location, funding, feasibility and sharing for all of its           */
/*  facilities (see mighty-squishing-kettle.md)                        */
/* -------------------------------------------------------------------- */

export const programs = sqliteTable("programs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  author: text("author"),
  ownerId: integer("owner_id")
    .notNull()
    .references(() => users.id),
  countryId: text("country_id")
    .notNull()
    .references(() => countries.id),
  regionId: integer("region_id").references(() => regions.id),

  // funding & operations — aggregate across every facility in the program
  landCostUsd: real("land_cost_usd").notNull().default(0),
  escalationPct: real("escalation_pct").notNull().default(10),
  fundedUsd: real("funded_usd").notNull().default(0),
  opexOverrideUsd: real("opex_override_usd").notNull().default(0),
  opexPctOfCapexPerYear: real("opex_pct_of_capex_per_year").notNull().default(8),
  annualRevenueUsd: real("annual_revenue_usd").notNull().default(0),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

// Mirrors projectCollaborators exactly, one level up: a single grant here
// governs every facility inside the program.
export const programCollaborators = sqliteTable("program_collaborators", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  programId: integer("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  invitedEmail: text("invited_email").notNull(), // lowercase
  role: text("role").notNull().default("viewer"), // 'viewer' | 'editor'
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted'
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/* -------------------------------------------------------------------- */
/*  Projects (facilities) & line items                                  */
/* -------------------------------------------------------------------- */

// A "facility" — one building (hospital, clinic, housing block, mortuary...)
// inside a Program. Owns its own BOQ, hospital generator, AACE maturity, soft
// costs and schedule assumptions. Location, funding, feasibility and sharing
// all live one level up, on programs — see the comment above that table.
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  programId: integer("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  // What kind of facility this is — a handful of presets (Hospital, Ambulance,
  // Residential Apartment, ICT Hub) or free text for anything else. Purely
  // descriptive (grouping/labeling in the facilities lists), never read by
  // cost or schedule computation — see lib/facilityTypes.ts.
  facilityType: text("facility_type").notNull().default("Hospital"),
  name: text("name").notNull(),
  author: text("author"),
  // Toggle a facility in/out of its program's totals (capex AND recurring
  // opex) without deleting it — same "present but off" idea as
  // project_items.isIncluded, one level up. Lets you ask "does this program
  // still pencil out without the school of nursing" live.
  isIncluded: integer("is_included", { mode: "boolean" }).notNull().default(true),
  aaceClass: integer("aace_class").notNull().default(5),
  deliveryStrategy: text("delivery_strategy").notNull().default("phased"), // 'phased' | 'parallel'

  // soft costs & risk (percentages stored as e.g. 8 for 8%)
  designFeePct: real("design_fee_pct").notNull().default(8),
  pmFeePct: real("pm_fee_pct").notNull().default(6),
  permitFeePct: real("permit_fee_pct").notNull().default(2),
  contingencyPctOverride: real("contingency_pct_override"),
  fastTrackPremiumPct: real("fast_track_premium_pct").notNull().default(12),

  // schedule assumptions
  landMonths: real("land_months").notNull().default(4),
  designMonths: real("design_months").notNull().default(3),
  designPermitOverlapPct: real("design_permit_overlap_pct").notNull().default(50),
  commissionMonths: real("commission_months").notNull().default(2),
  startDate: text("start_date"),
  // Manual override for the computed construction duration — 0 = auto
  // (derived from the BOQ's critical path, see computeSchedule() in
  // lib/calc/engine.ts), same "0 = auto" convention as opexOverrideUsd and
  // annualRevenueUsd on programs. Doesn't change escalation's *rate*, but
  // does change the number of years escalation compounds over, since
  // computeCost() derives that from schedule.totalMonths.
  constructionMonthsOverride: real("construction_months_override").notNull().default(0),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

// A facility's BOQ line item. Every row is a flat quantity × rate — there's
// no catalog to defer to — used identically for a generated
// building-division row (see buildingTemplates below) and a manually typed
// "Ambulance, $85,000" row.
export const projectItems = sqliteTable("project_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  classNodeId: integer("class_node_id").references(() => classNodes.id),

  customLabel: text("custom_label"),
  customUnit: text("custom_unit"),
  customUnifCode: text("custom_unif_code"), // UniFormat division code, e.g. 'B' for a generated Shell row

  quantity: real("quantity").notNull().default(1),
  rateUsd: real("rate_usd").notNull().default(0),

  // Schedule inputs, one set per row (there's no shared assembly to read
  // them from anymore) — rowDurationMonths() in lib/calc/engine.ts reads
  // these directly off the row. Set by the building generator per division;
  // sensible defaults for a manually-added row.
  phase: text("phase").notNull().default("vertical"), // 'site' | 'vertical' | 'procurement'
  baseDurationMonths: real("base_duration_months").notNull().default(1),
  baseSize: real("base_size").notNull().default(1),
  durationExponent: real("duration_exponent").notNull().default(0.2),

  isAddon: integer("is_addon", { mode: "boolean" }).notNull().default(false),
  isIncluded: integer("is_included", { mode: "boolean" }).notNull().default(true),

  genTag: text("gen_tag"), // e.g. 'building-template', so a re-run can replace its own rows cleanly
  notes: text("notes"),
});

// Building templates: modeled square-meter cost estimating — a small,
// global reference list (like countries/aaceClasses — not program-scoped,
// since a rate is just a flat $/m² number now, no per-program customization
// machinery needed). Pick a template, type a GFA, and
// generateBuildingFromTemplate() in lib/calc/engine.ts turns it into one
// project_items row per UniFormat division (A-G), at that division's
// baseRateUsdPerM2 × GFA — scaled by the facility's program's costIndex
// exactly like every other row already is.

export const buildingTemplates = sqliteTable("building_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(), // e.g. 'rural_clinic' — matched by the generator
  name: text("name").notNull(), // 'Rural / Remote Clinic'
  defaultFloors: integer("default_floors").notNull().default(1),
  referenceGfaM2: real("reference_gfa_m2").notNull().default(0), // a sensible starting GFA to hint in the UI, not enforced
  notes: text("notes"),
});

export const buildingTemplateDivisions = sqliteTable("building_template_divisions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id")
    .notNull()
    .references(() => buildingTemplates.id, { onDelete: "cascade" }),
  divisionCode: text("division_code").notNull(), // UniFormat level-1: 'A'..'G'
  divisionName: text("division_name").notNull(), // 'Shell', 'Services', ...
  baseRateUsdPerM2: real("base_rate_usd_per_m2").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
});

// A facility's own recurring/operating cost line items — salaries,
// maintenance, utilities, etc. Same shape/spirit as project_items but for
// annual OPEX instead of one-time capex. A facility with zero rows here
// falls back to the program's opexPctOfCapexPerYear applied to ITS OWN capex
// subtotal (see computeFacilityOpex() in lib/calc/engine.ts) — rows only
// need entering where you want a real number instead of that estimate.
export const projectOpexItems = sqliteTable("project_opex_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // e.g. 'Nursing & clinical staff salaries'
  category: text("category").notNull().default("other"), // 'salaries' | 'maintenance' | 'utilities' | 'supplies' | 'other'
  annualAmountUsd: real("annual_amount_usd").notNull().default(0),
  isIncluded: integer("is_included", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
});

// A facility's own revenue-source line items — patient/service fees,
// pharmacy sales, rental or ancillary income, grants, etc. Same shape/spirit
// as project_opex_items, but for the operating-revenue side of the ledger.
// Unlike opex, there's no %-of-capex fallback: a facility with zero rows
// here simply has $0 projected revenue, which is usually correct (an
// ambulance or ICT hub doesn't generate its own revenue) — see
// computeFacilityRevenue() in lib/calc/engine.ts.
export const projectRevenueItems = sqliteTable("project_revenue_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // e.g. 'Outpatient consultation fees'
  category: text("category").notNull().default("other"), // 'patient_fees' | 'pharmacy_lab' | 'rental_ancillary' | 'grants_subsidies' | 'other'
  annualAmountUsd: real("annual_amount_usd").notNull().default(0),
  isIncluded: integer("is_included", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
});

export const scenarios = sqliteTable("scenarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  snapshotJson: text("snapshot_json").notNull(), // full project+items snapshot, for what-if comparison
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});
