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
/*  Building types & space-programming templates                        */
/* -------------------------------------------------------------------- */

export const buildingTypes = sqliteTable("building_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // 'Acute Care Hospital'
  driverUnit: text("driver_unit").notNull(), // 'bed' | 'student' | 'sqm' ...
});

// One row per building type: how much GFA per driver unit at each quality tier.
export const spaceTemplates = sqliteTable("space_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  buildingTypeId: integer("building_type_id")
    .notNull()
    .references(() => buildingTypes.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  gfaPerDriverBasic: real("gfa_per_driver_basic").notNull(),
  gfaPerDriverStandard: real("gfa_per_driver_standard").notNull(),
  gfaPerDriverPremium: real("gfa_per_driver_premium").notNull(),
});

// Departmental (or other) split of that GFA — percentages should sum to <= 100.
export const spaceTemplateItems = sqliteTable("space_template_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id")
    .notNull()
    .references(() => spaceTemplates.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // 'Inpatient Nursing Units'
  pctOfGfa: real("pct_of_gfa").notNull(),
  assemblyId: integer("assembly_id").references(() => assemblies.id),
});

/* -------------------------------------------------------------------- */
/*  Assemblies (priced, classified components) & material/labour variants */
/* -------------------------------------------------------------------- */

export const assemblies = sqliteTable("assemblies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Every assembly ("Main Item") belongs to exactly one program's catalog —
  // see lib/catalogClone.ts for how a program's catalog is cloned into
  // another program (including the shared template) rather than shared
  // directly.
  programId: integer("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  classNodeId: integer("class_node_id")
    .notNull()
    .references(() => classNodes.id),
  name: text("name").notNull(),
  slug: text("slug"), // stable machine key (e.g. 'ext_wall') used by generators to find a specific assembly
  unit: text("unit").notNull(), // 'm²', 'unit', 'car', 'stair core', ...
  // How this assembly's rate is determined:
  //  'tier'      — one flat rate per quality tier (assembly_tier_rates)
  //  'variant'   — pick ONE of several named material/labour options (assembly_variants)
  //  'composite' — rate is the SUM of its macro_items' micro_items, at the
  //                selected tier. This is the "makeup items" model: nobody
  //                sets the assembly's rate directly, it's always the sum of
  //                what's underneath it. assembly_tier_rates/variants are
  //                unused (and should stay empty) for composite assemblies.
  pricingMode: text("pricing_mode").notNull().default("tier"),
  hasVariants: integer("has_variants", { mode: "boolean" })
    .notNull()
    .default(false),
  // duration model (parametric): baseDurationMonths * (qty/baseSize)^exponent
  baseDurationMonths: real("base_duration_months").notNull().default(3),
  baseSize: real("base_size").notNull().default(1),
  durationExponent: real("duration_exponent").notNull().default(0.3),
  phase: text("phase").notNull().default("vertical"), // 'site' | 'vertical' | 'procurement'
  isCustom: integer("is_custom", { mode: "boolean" }).notNull().default(false),
});

// Used when hasVariants = false: one rate per quality tier.
export const assemblyTierRates = sqliteTable("assembly_tier_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assemblyId: integer("assembly_id")
    .notNull()
    .references(() => assemblies.id, { onDelete: "cascade" }),
  tier: text("tier").notNull(), // 'basic' | 'standard' | 'premium'
  unitRateUsd: real("unit_rate_usd").notNull(),
});

// Used when hasVariants = true: material/labour options, e.g. wall systems.
export const assemblyVariants = sqliteTable("assembly_variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assemblyId: integer("assembly_id")
    .notNull()
    .references(() => assemblies.id, { onDelete: "cascade" }),
  label: text("label").notNull(), // 'Precast concrete panel'
  unitRateUsd: real("unit_rate_usd").notNull(),
  laborPct: real("labor_pct").notNull(),
  materialPct: real("material_pct").notNull(),
  sourceNote: text("source_note"),
});

/* -------------------------------------------------------------------- */
/*  Composite pricing: a four-level tree under any 'composite' assembly */
/*  (the "Main Item"):                                                  */
/*    assembly (Main Item) → macro_items → sub_items → micro_items      */
/*                                                                        */
/*  sub_items and micro_items are a REUSABLE LIBRARY, not owned by any   */
/*  one parent. A "Theatre door (fire-rated)" micro-item or a "Theatre   */
/*  Envelope" sub-item is defined once and can be assembled into any     */
/*  number of macro-items/sub-items, each with its own quantity — the    */
/*  same door might be quantity 2 in one theatre and quantity 4 in       */
/*  another. That quantity lives on the JOIN (macro_item_sub_items /     */
/*  sub_item_micro_items), never on the library row itself. Only         */
/*  micro_items carry a price (via micro_item_rates); every level above  */
/*  it is purely a sum of quantity × (whatever's under it) — see         */
/*  compositeAssemblyRate() and subItemRate() in lib/calc/engine.ts, the */
/*  only place that sum happens. Editing a micro-item's rate, or a       */
/*  join row's quantity, is the ONE thing that ever changes what a       */
/*  composite assembly costs — and it changes everywhere that library    */
/*  row is assembled into, by design.                                    */
/* -------------------------------------------------------------------- */

export const macroItems = sqliteTable("macro_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  assemblyId: integer("assembly_id")
    .notNull()
    .references(() => assemblies.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. 'Structural Work' — one of up to ~1000 that make up the assembly ("Main Item")
  sortOrder: integer("sort_order").notNull().default(0),
  sourceNote: text("source_note"), // where this macro-item's split came from, if worth recording
  // Labour to coordinate/commission the assembled sub-items into this
  // macro-item as a working whole — on top of, not instead of, whatever
  // those sub-items already cost. Zero by default: most macro-items (a
  // blended per-m² rate, say) need none. Set it only where combining
  // several sub-items into this one genuinely takes extra work.
  labourBasic: real("labour_basic").notNull().default(0),
  labourStandard: real("labour_standard").notNull().default(0),
  labourPremium: real("labour_premium").notNull().default(0),
});

// Library entry — NOT owned by a macro-item. Reusable across as many
// macro-items (in any assembly) as want to assemble it in — WITHIN THE SAME
// PROGRAM's catalog.
export const subItems = sqliteTable("sub_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  programId: integer("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. 'Theatre Envelope'
  sourceNote: text("source_note"),
  // Labour to assemble/fit the joined micro-items into this sub-item as a
  // working unit — additive on top of the micro-items' own quantity×rate
  // sum. Zero by default. This is the "space for labour cost if an item
  // needs assembling" — a plain $/unit-rate micro-item sitting alone
  // usually doesn't need it; a door+wall+window becoming one theatre
  // envelope typically does.
  labourBasic: real("labour_basic").notNull().default(0),
  labourStandard: real("labour_standard").notNull().default(0),
  labourPremium: real("labour_premium").notNull().default(0),
});

// Join: which sub-items make up a given macro-item, and how many.
export const macroItemSubItems = sqliteTable("macro_item_sub_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  macroItemId: integer("macro_item_id")
    .notNull()
    .references(() => macroItems.id, { onDelete: "cascade" }),
  subItemId: integer("sub_item_id")
    .notNull()
    .references(() => subItems.id, { onDelete: "cascade" }),
  quantity: real("quantity").notNull().default(1), // how many of this sub-item make up the macro-item
  sortOrder: integer("sort_order").notNull().default(0),
});

// Library entry — NOT owned by a sub-item. Reusable across as many
// sub-items as want to assemble it in — WITHIN THE SAME PROGRAM's catalog.
export const microItems = sqliteTable("micro_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  programId: integer("program_id")
    .notNull()
    .references(() => programs.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. 'Theatre door (fire-rated)' — the actual priced leaf
  unit: text("unit").notNull(), // its OWN unit — 'door', 'm²', 'beam'
  sourceNote: text("source_note"),
});

// Join: which micro-items make up a given sub-item, and how many.
export const subItemMicroItems = sqliteTable("sub_item_micro_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  subItemId: integer("sub_item_id")
    .notNull()
    .references(() => subItems.id, { onDelete: "cascade" }),
  microItemId: integer("micro_item_id")
    .notNull()
    .references(() => microItems.id, { onDelete: "cascade" }),
  // How many of this micro-item make up ONE instance of the sub-item, e.g.
  // 2 doors, 45 m² of wall. Defaults to 1 so a plain "$/unit rate"
  // micro-item (the original per-m²-GFA style) behaves exactly as before —
  // quantity 1 makes qty*rate collapse to just rate.
  quantity: real("quantity").notNull().default(1),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const microItemRates = sqliteTable("micro_item_rates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  microItemId: integer("micro_item_id")
    .notNull()
    .references(() => microItems.id, { onDelete: "cascade" }),
  tier: text("tier").notNull(), // 'basic' | 'standard' | 'premium'
  unitRateUsd: real("unit_rate_usd").notNull(),
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
  // The one seeded "Default Starter Catalog" program (see db/seed.ts and
  // lib/catalogClone.ts). Hidden from dashboards/facility listings; anyone
  // can IMPORT from it into their own program's catalog regardless of
  // ownership, since it's the shared starting point, not private data.
  isTemplate: integer("is_template", { mode: "boolean" }).notNull().default(false),
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
  phase: text("phase").notNull().default("phase_1"), // 'phase_1' | 'phase_2' | 'phase_3' — Infrastructure Commissioning / Improvement / Expansion
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

  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

export const projectItems = sqliteTable("project_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  assemblyId: integer("assembly_id").references(() => assemblies.id),
  classNodeId: integer("class_node_id").references(() => classNodes.id),

  // for custom (non-catalog) rows:
  customLabel: text("custom_label"),
  customUnit: text("custom_unit"),
  customUnifCode: text("custom_unif_code"),

  quantity: real("quantity").notNull().default(1),
  tier: text("tier").default("standard"), // used when assembly has no variants
  variantId: integer("variant_id").references(() => assemblyVariants.id), // used when it does
  rateOverrideUsd: real("rate_override_usd"), // wins over tier/variant rate if set

  isAddon: integer("is_addon", { mode: "boolean" }).notNull().default(false),
  isIncluded: integer("is_included", { mode: "boolean" }).notNull().default(true),

  genTag: text("gen_tag"), // e.g. 'hospital-generator', so a re-run can replace its own rows cleanly
  notes: text("notes"),
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
