# Classified Infrastructure Estimator

A parametric capital-cost, schedule and feasibility estimator for social infrastructure
(hospitals, clinics, schools, housing, campuses) — line items classified under
**UniFormat II** (ASTM E1557), confidence bands aligned to **AACE International's**
Cost Estimate Classification System, country/region cost indices with FX support,
and **modeled square-meter cost estimating** for buildings (pick a template, type a
gross floor area, get an RSMeans-style per-division cost breakdown).

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Drizzle ORM** over **SQLite** (`better-sqlite3`) — chosen so the same schema/dialect
  carries forward to hosted Postgres later with a driver swap, not a rewrite
- No external services required to run locally; the one optional network call
  (`open.er-api.com` for live FX rates) fails gracefully to manual rates if unreachable

## Pricing model: building templates (modeled square-meter cost estimating) + flat items

Every facility's Bill of Quantities (`project_items`) is a flat list — every
row is just `quantity × rateUsd`, no catalog to defer to. Two ways rows get
onto that list:

- **Generated from a building template** — pick a template (`building_templates`,
  a small global reference list: `slug`, `name`, `defaultFloors`,
  `referenceGfaM2`), type in a gross floor area (m²), and
  `generateBuildingFromTemplate()` (`lib/calc/engine.ts`) creates one BOQ row
  per UniFormat division (A–G), each division's `baseRateUsdPerM2`
  (`building_template_divisions`) × your GFA — the industry-standard "modeled
  square-foot/m² cost estimating" method: a per-division $/m² breakdown that
  sums to a Sub-Total, on top of which Contractor Fee, Architect Fee and
  Permitting are layered (see "Soft costs" below). Re-generating (a new GFA,
  or switching templates) replaces this facility's prior generated rows —
  they're tagged `genTag: 'building-template'` so the regenerate can find and
  clean them up without touching any manually-added rows. A **buffer %**
  (default 10, 0 to disable) is baked directly into every generated row's
  rate at generation time — `generateBuildingFromTemplate(template, gfa,
  markupPct)` just multiplies each division's `baseRateUsdPerM2` by
  `1 + markupPct/100` before it's ever written — a flat margin over the
  templates' placeholder rates for the real-world surprises a rough per-m²
  figure can't see coming. It's a higher number on each row, not a separate
  contingency line in the cost breakdown (that's `aaceClasses.contingencyPct`
  / `project.contingencyPctOverride`, a distinct, already-existing knob).
  Every facility that has at least one generated row also shows a **cost per
  m²** figure (`cost.grandTotal ÷ that GFA`) — on its own page's summary KPI
  and next to it in the program's Facilities list — for comparing facilities
  at a glance; a flat-type facility (no generated rows) shows none.
- **Flat, manually typed rows** — for anything that isn't priced per-m² of a
  building (a vehicle, a piece of equipment, an ambulance): just a label, a
  unit, a quantity and a directly-typed `rateUsd`. Used identically to a
  generated row — same table, same columns, same `isAddon`/`isIncluded`
  toggles — the only difference is nobody clicked "Generate" for it. This is
  also the shape of every generated row after the fact: templates just
  provide sensible starting numbers, every field on a row stays directly
  editable afterward.

**Every facility type that's actually a structure is backed by a building
template** — not just the two clinics. Four starter templates are seeded,
sized and rated off the reference material this model was built from (see
`db/seed.ts`) — all explicitly flagged as **placeholder rates pending real QS
validation**, not independently sourced per division:
- **Remote Clinic** (`rural_clinic`, 2 floors, reference GFA ≈ 650 m²) and
  **Alpha Clinic** (`alpha_clinic`, 3 floors, reference GFA ≈ 3,000 m²) split
  their total $/m² rate across the seven UniFormat divisions in a typical
  RSMeans-style medical-building proportion (Services and Equipment &
  Furnishings weighted heaviest), baselined off the DHA Kenya Level 3A
  satellite clinic report's construction-rate range (KES 45,000–120,000/m²)
  — the remote clinic sits toward the low end of that range, the Alpha clinic
  (more specialized medical services) toward the high end.
- **Residential Apartment** (`residential_apartment`, 4 floors, reference GFA
  ≈ 1,200 m²) uses an ordinary-construction proportion instead (Shell &
  Interiors weighted heaviest, no specialized medical or data-center load),
  scaled below the clinics.
- **ICT Hub** (`ict_hub`, 1 floor, reference GFA ≈ 800 m²) is the inverse — a
  data-center-grade proportion (Services and Equipment & Furnishings
  dominate: backup power, precision cooling, server racks), among the
  highest $/m² of the four for exactly that reason.

The only facility type that stays flat/manual is **Ambulance** — a vehicle,
not a structure, so modeled square-meter billing doesn't apply to it (see
`lib/facilityTypes.ts`'s `FLAT_FACILITY_TYPE_PRESETS`).
Building templates are global reference data, like countries or AACE
classes — not owned by any one program — since a rate is now just a flat
$/m² number with no per-program customization machinery to manage.

**Country/region cost variation is already solved by the existing cost
index, no new mechanism needed for this.** Every row's rate — generated or
flat — runs through the same `costIndex = country.baseCostIndex ×
(1 + region.offsetPct / 100)` multiplier in `computeCost()` that every rate
in this app has always run through. Switch a program's country and every
division's $ figure (and every flat item's $ figure) rescales instantly,
with no separate "variation" input to fill in.

## Programs & facilities: the elevated aggregation level

A **program** (`programs` table) is a site/campus/portfolio — a 200-bed hospital
plus several 50–100 bed clinics, housing, a school of nursing, a mortuary, a
cafeteria, all on one piece of ground. A **facility** (`projects` table — the name
stuck from before this level existed) is one building inside it, with its own BOQ,
building template generator, soft costs and schedule assumptions.
Every facility belongs to exactly one program (`projects.programId`, `NOT NULL`) —
there's no such thing as a standalone facility outside a program.

`projects.aaceClass` still exists and still drives `contingencyPct`/the
confidence band in `computeCost()`, but it's no longer a UI-selectable
control (there was an `AaceClassPanel.tsx` picker; it's gone) — every
facility defaults to Class 5 and stays there unless `contingencyPctOverride`
is set directly (`SoftCostsPanel.tsx`'s "Contingency override" field).
"AACE Class N" as a label was removed from the UI and from
`FacilityPrintSummary.tsx`'s header; the underlying classification/
contingency math is unchanged.

Location, funding and feasibility all live on the **program**, not the facility:

- **Location** (`countryId`/`regionId`, and therefore the FX rate and cost index)
  is set once for the whole site and shared by every facility in it.
- **Funding** — the program's budget — is `programs.fundedUsd`, set on the
  program (`FundingPanel.tsx`). `landCostUsd` and `escalationPct` are
  program-level too. Escalation still runs against each facility's *own*
  schedule length (`computeCost()` in `lib/calc/engine.ts`), it's just one
  shared rate.
- **The feasibility verdict, capital cost, confidence band, operating cost
  and schedule duration are all computed together by one function**,
  `computeProgramReport()` in `lib/calc/engine.ts` — against every
  *included* facility's own subtotal (`computeCost().grandTotal`, which no
  longer includes land), confidence band, and opex, plus the program's land
  cost. A facility's own page shows its own subtotal, confidence band and
  recurring cost; it doesn't compute or show a feasibility verdict of its
  own. Every aggregate `computeProgramReport()` returns is built by rounding
  each facility's own figure to the dollar *before* summing (not summing
  exact values and rounding the total independently) — the deliberate fix
  for a real bug: independently-rounded aggregates can drift by a dollar or
  two from the sum of the rounded rows a report shows them next to, which
  reads as the numbers not adding up even though nothing is actually wrong.
  It also reports every headline figure (coverage, gap, opex, operating
  balance) at *both* the point estimate and the estimate's own upper
  confidence band, rather than a single figure that quietly hides how much
  the AACE classification's own uncertainty could move it, and uncaps
  funding coverage past 100% so an over-funded program shows a surplus
  instead of a gap frozen at zero.
- **Recurring/operating cost is itemized per facility, not one program-wide
  number.** Each facility has its own `project_opex_items` rows (salaries,
  maintenance, utilities, ...), managed on that facility's own page
  (`OperatingCostsPanel.tsx`). `computeFacilityOpex()` sums a facility's
  *included* items; a facility with zero items instead gets an auto-estimate
  — `programs.opexPctOfCapexPerYear`% of *that facility's own* capex
  (rounded to the dollar first, for the same reconciliation reason as
  above), not the program's. This is a flat multiplier, not a staffing/
  utilities/maintenance calculation — `computeProgramReport()` flags which
  facilities are using it (`isItemizedOpex: false`) so a report can mark
  those figures as estimates rather than presenting them as real.
  `programs.opexOverrideUsd`, when set above 0, replaces the whole computed
  program total outright — see `computeProgramReport()`'s `funding`
  parameter, precomputed by the caller rather than derived internally.
- **Revenue is itemized per facility too**, the same shape as opex but
  without a fallback: `project_revenue_items` rows (patient/service fees,
  pharmacy & lab income, rental/ancillary income, grants — see
  `RevenueProjectionPanel.tsx`), summed by `computeFacilityRevenue()`. A
  facility with zero rows is assumed to generate $0 of its own revenue
  (correct for an ambulance or ICT hub — there's no principled %-of-capex
  estimate for revenue the way there is for opex). `programs.annualRevenueUsd`,
  when set above 0, overrides the summed total outright — same "0 = auto"
  convention as `opexOverrideUsd` above.
- **Every facility can be toggled in or out of the program's totals**
  (`projects.isIncluded`, default `true`) without deleting it — same "present
  but off" idea as a BOQ addon's own `isIncluded`. Toggled off, a facility's
  capex, band and opex all drop out of the program aggregate, and the site
  programme duration no longer counts its schedule — but its own page, BOQ and
  recurring costs are untouched, so switching it back on is instant. The
  checkbox lives in the program's Facilities panel and on `/facilities`;
  `useProgramEditor.ts` filters to `isIncluded` facilities and recomputes
  capex/opex/feasibility client-side the moment you click it, no round trip
  needed to see the number change.
- **Collaborators** (`program_collaborators`) are granted on the program. One
  invite/role there governs every facility inside it — a facility has no
  collaborators or owner of its own; `requireFacilityRole()` in
  `lib/auth/permissions.ts` resolves a facility's `programId` and delegates to
  `requireProgramRole()`.
- Each facility also carries a **`facilityType`** (free text — a program's
  facilities lists group by it), picked one of two ways when a facility is
  created (`components/ui/AddFacilityForm.tsx`):
  - **A building type** — the name of a seeded building template (Alpha
    Clinic, Remote Clinic, Residential Apartment, ICT Hub, ... — the live
    list, not hardcoded) — picking one also asks for a GFA and generates the
    facility's whole BOQ immediately (`POST /api/programs/:id/facilities`
    does the insert *and* the generate in one request via
    `insertBuildingFromTemplate()` in `lib/data.ts`), so a building-type
    facility is never left empty behind a label. Every type that's actually a
    structure works this way, not just the clinics.
  - **A flat type** — a vehicle, not a structure (Ambulance —
    `lib/facilityTypes.ts`'s only preset) or free text for anything else that
    genuinely isn't priced per m² — just a label; its BOQ is priced by hand.
  Relabeling an *existing* facility's type (the compact selector on each row)
  never re-triggers generation — only the creation flow does, since that's
  the one moment an empty facility is unambiguously safe to fill.
- **Construction duration can be overridden manually** per facility
  (`projects.constructionMonthsOverride`, `ScheduleAssumptionsPanel.tsx`) —
  "0 = auto" convention, same as `opexOverrideUsd`/`annualRevenueUsd`. Left
  at 0, `computeSchedule()` derives it from the BOQ's own critical path as
  before; set it above 0 and that figure replaces the computed one
  everywhere downstream (total programme duration, the escalation window in
  `computeCost()`, and the cash-flow timeline below) — `ScheduleBreakdown`
  carries `constructionIsOverridden` so the UI can disclose when a figure
  isn't computed.
- **Each program has a dedicated, viewable + printable summary page**
  (`/programs/[id]/summary`, `ProgramSummaryView.tsx`) — a stakeholder-
  facing report built from the same `useProgramEditor()` data as the editor
  (no duplicated computation), including a **cash-flow-over-time chart**
  (`CashFlowChart.tsx`, driven by `computeCashFlowTimeline()` in
  `lib/calc/engine.ts`): a year-by-year, stacked diverging bar chart —
  capital spend and operating cost below a zero baseline, revenue above it —
  so funding timing (not just lump-sum totals) is visible at a glance.
  Facilities are each assumed to start on day one of the program (the same
  "parallel build" assumption `totalMonthsParallel` already uses) with
  capital spend spread evenly across each facility's own construction
  window; opex/revenue begin accruing once a facility's own schedule
  completes. Right below it, a **cumulative cash position chart**
  (`CashRunwayChart.tsx`) plots the same data's running `cumulativeBalance`
  as a single trajectory — color (the skill's fixed status green/red pair,
  not the flow chart's categorical one) and position both carry
  surplus-vs-deficit, and a computed caption names the year it crosses from
  one to the other, turning the single `fundingRunwayYears` figure into a
  visible shape. Each facility also has its own **operational summary** page
  (`/projects/[id]/summary`) alongside the original print-only "structural"
  handout (`FacilityPrintSummary.tsx`, relabeled "Print structural summary"
  on the editor) — the two are kept deliberately separate and labeled by
  purpose rather than merged.

`GET /api/programs/:id` returns the program, every facility (all of them,
regardless of `isIncluded`, each with its own `cost`/`schedule`/`opex`
already resolved), and the aggregate `capex`/`bandLow`/`bandHigh`/`opex`/
`feasibility` computed from the *included* ones only — see
`app/api/programs/[id]/route.ts`.

## Getting started

```bash
npm install
npm run db:setup   # runs migrations, then seeds reference data
npm run dev        # http://localhost:3000
```

You'll land on `/login` — sign up for an account (email + password, no email
verification in this scaffold) to reach the dashboard.

`npm run db:setup` creates `sqlite.db` in the project root and populates it with:
- 5 starter countries (Nigeria, Ghana, Kenya, South Africa, custom/USD) with regions
- The UniFormat II classification tree (A–G + Z, for classifying a BOQ row via `classNodeId`)
- AACE Class 1–5 contingency/accuracy bands
- 4 starter building templates (Remote Clinic, Alpha Clinic, Residential
  Apartment, ICT Hub), each with its 7 UniFormat-division $/m² rates — see
  "Pricing model" above

No *real* user accounts or programs are seeded — the first thing you'll do is
sign up and create a program. Delete `sqlite.db*` and re-run `npm run db:setup`
to start over.

> **If `npm install` fails on `better-sqlite3`** with a `node-gyp`/compile error:
> this has shown up as a transient registry hiccup during a large install batch
> in some sandboxed environments. It self-heals — run
> `rm -rf node_modules/better-sqlite3 && npm install better-sqlite3` and it will
> pick up the package's bundled prebuilt binary (`prebuilds/linux-x64.node` etc.)
> without needing to compile anything. No code change needed.

## Accounts, ownership & sharing

- Every program has exactly one **owner** (`programs.ownerId`) — whoever created
  it. A user can own any number of programs (`db/schema.ts` puts no limit on it).
  Facilities have no owner of their own — access is entirely inherited from their
  parent program.
- The owner can share a program with anyone **by email**, choosing **viewer** or
  **editor** — one grant that covers every facility inside the program. If that
  email doesn't have an account yet, the invite sits as `status: 'pending'` in
  `program_collaborators` and links itself automatically — no re-invite needed —
  the moment that email signs up (`app/api/auth/signup` checks for matching
  pending invites and accepts them as part of account creation).
- **Editors** can change everything about a program or any of its facilities
  (settings, BOQ, building generator) except delete the program or manage who
  else has access. **Viewers** can see the full computed estimate but every input
  is disabled — enforced both in the UI (the entire input column renders inside a
  native `<fieldset disabled>`, which cascades to every control inside it
  regardless of which component renders it) and, more importantly, server-side on
  every mutating route.
- **Deleting a program** (owner-only — the "Danger zone" block at the bottom of
  the program page) is irreversible and total: every facility inside it, their
  BOQ and recurring-cost rows, and every collaborator invite cascade away in one
  request (`onDelete: "cascade"` all the way down in `db/schema.ts` — there's
  nothing a second cleanup step needs to catch). The confirmation is a
  type-the-program's-name modal (`components/ui/ConfirmDeleteModal.tsx`) rather
  than a plain `window.confirm()`, given the blast radius is more than the one
  row being clicked on.
- Authorization is centralized in `lib/auth/permissions.ts`:
  `requireProgramRole(userId, programId, minRole)` is the gate every
  program-scoped API route calls; `requireFacilityRole(userId, projectId, minRole)`
  resolves a facility's `programId` and delegates to it, so a facility-scoped
  route (BOQ items, the building generator, a facility's own settings) is governed
  by the same program-level grant. A user with no access at all gets a 404 rather
  than a 403, so a program's (or facility's) existence isn't leaked to people who
  aren't on it.
- Sessions are DB-backed (`sessions` table, random 32-byte token in an httpOnly
  cookie, 30-day expiry) rather than stateless JWTs, so a session can be revoked
  by deleting its row — simpler to reason about than token invalidation, and fine
  at this scale. Passwords are hashed with Node's built-in `scrypt` (no extra
  dependency); see `lib/auth/password.ts`.

## Project structure

```
db/
  schema.ts          Drizzle schema — see below
  seed.ts             Reference-data seed (idempotent-ish; re-run against a fresh DB)
  migrate.ts          Migration runner (npm run db:migrate)
lib/
  auth/
    password.ts       scrypt hashing (Node built-in, no dependency)
    session.ts         DB-backed sessions, cookie read/write
    permissions.ts      requireProgramRole (the single gate every program route calls)
                        + requireFacilityRole (resolves a facility's programId and
                        delegates to it — see "Programs & facilities" above)
  calc/engine.ts      Pure calculation functions — no DB, no fetch. Per-facility cost/
                      schedule, generateBuildingFromTemplate() (turns a template +
                      a GFA into one BOQ row per UniFormat division),
                      computeFacilityOpex()/computeFacilityRevenue() (itemized-or-
                      fallback / itemized-only), the program-level
                      computeProgramReport() (capex, confidence band, opex, revenue,
                      funding coverage/gap, feasibility verdict, schedule — all
                      reconciled against each other, see "Programs & facilities"
                      above), and computeCashFlowTimeline() (the year-by-year
                      capex/opex/revenue series behind CashFlowChart.tsx) all live
                      here, shared verbatim by API routes (server) and the editor
                      (client), so there is exactly one implementation of the math
                      to trust.
  data.ts             Drizzle query helpers — getBuildingTemplates() nests each
                      template's divisions; getProgramFull()/getProjectFull()
                      assemble a program's or one facility's raw rows (location
                      resolved via resolveLocation()); the calling route does the math.
  fx.ts               LIVE_FX_SOURCE / SEED_FX_SOURCE constants
app/
  login/, signup/     Auth pages (AuthForm client component, shared by both)
  page.tsx            Dashboard — auth-gated; lists owned + shared-with-you programs
  api/
    auth/              signup, login, logout, me
    programs/            see table below, all permission-checked
    projects/            facility-scoped routes (BOQ, building generator,
                        opex-items, revenue-items) — see table
  facilities/
    page.tsx + FacilitiesClient.tsx   Every facility across every program you have
                        access to, grouped by program (one collapsible section per
                        program) — open a facility, change its type, delete it, or
                        add a new one, without visiting the program page first
  programs/[id]/
    page.tsx           Server wrapper — redirects to /login if not authenticated
    ProgramEditor.tsx   Thin client orchestrator, mirrors ProjectEditor.tsx
    useProgramEditor.ts Data-fetching + local state + persistence, as a hook
    components/         CountryRegionPanel, FacilitiesPanel (add a facility, grouped
                        by type), FundingPanel, CollaboratorsPanel,
                        ProgramSummaryPanel, FeasibilityPanel, CashFlowChart,
                        CashRunwayChart + types.ts
    summary/            ProgramSummaryView.tsx — the viewable + printable
                        program report (see "Programs & facilities" above)
  projects/[id]/
    page.tsx           Server wrapper — redirects to /login if not authenticated
    ProjectEditor.tsx   Thin client orchestrator — no business logic, just wiring;
                        wraps every input in <fieldset disabled={!canEdit}>
    useProjectEditor.ts Data-fetching + local state + persistence, as a hook
    components/         One file per panel (BuildingTemplatePanel
                        [template picker + GFA input + generate], BoqPanel + BoqRow
                        [division/label/qty/unit/rate — every row directly editable],
                        BuildingCostBreakdownPanel [the RSMeans-style division →
                        Sub-Total → Contractor/Architect Fee → Total layout],
                        SoftCostsPanel, ScheduleAssumptionsPanel, OperatingCostsPanel
                        [itemized recurring cost, see project_opex_items below],
                        RevenueProjectionPanel [itemized revenue sources, see
                        project_revenue_items below], SummaryPanel, SchedulePanel,
                        FacilityPrintSummary [the print-only "structural" handout])
                        + types.ts — location, funding, feasibility and
                        collaborators live on the program instead (see
                        app/programs/[id]/components/)
    summary/            FacilitySummaryView.tsx — the viewable + printable
                        "operational summary" (see "Programs & facilities" above)
components/
  AppShell.tsx        The persistent sidebar (Programs, Facilities, user email,
                      sign-out, theme toggle) — wraps every authenticated page
  ThemeToggle.tsx     Light/dark switch; persists to localStorage, applies via
                      data-theme on <html> (see the anti-flash script in
                      app/layout.tsx that reads it before first paint)
  AuthForm.tsx        Shared login/signup form UI
  FxStatusPanel.tsx   Dashboard-level global FX status + refresh
  ui/                 Generic, reusable primitives (Panel, Field/Input/Select/NumField,
                        Button/ClassBadge, ConfirmDeleteModal, Kpi/BreakdownRow/
                        ScheduleBar) used by every page — the design system, not
                        project-specific
```

## Theme

Light and dark are both real themes, not a `prefers-color-scheme` afterthought
— every color used anywhere in the app is a CSS variable defined once in
`app/globals.css` (`--color-bg`, `--color-surface`, `--color-sidebar`,
`--color-blueprint`, etc.), overridden under `[data-theme="dark"]`. Components
never hardcode a color; they use the matching Tailwind utility (`bg-surface`,
`text-blueprint`, `border-border`...), so the whole app re-colors from one
attribute flip — see `ThemeToggle.tsx`. The sidebar (`--color-sidebar`) is
deep blue in light mode and near-black-blue in dark mode; that's the "blue"
half of "white on blue" — white/near-white text sits on it in both themes.


Tailwind theme tokens (the blueprint/ledger palette — ink, blueprint, amber, clay,
green, muted, paper, paper-line) are defined once in `app/globals.css` under `@theme`,
so every component uses `bg-ink` / `text-blueprint` / `border-paper-line` etc.
instead of repeating hex codes.

## API routes

| Route | Methods | Purpose | Access |
|---|---|---|---|
| `/api/auth/signup` | POST | create account (auto-accepts any pending invites to that email) | public |
| `/api/auth/login` / `logout` | POST | session cookie issue/revoke | public |
| `/api/auth/me` | GET | current user, for client-side header | any |
| `/api/programs` | GET, POST | list (owned+shared, separated) / create | signed in |
| `/api/programs/:id` | GET, PATCH, DELETE | every facility's computed cost/schedule + aggregate capex/feasibility / update location+funding / delete (cascades to facilities) | viewer+ / editor+ / owner |
| `/api/programs/:id/facilities` | POST | add a facility to this program; with `{templateSlug, grossAreaM2, markupPct}` also generates its BOQ in the same request (`markupPct` defaults to 10) | editor+ |
| `/api/programs/:id/collaborators` | GET, POST | list access / invite by email+role — governs every facility in the program | viewer+ / owner |
| `/api/programs/:id/collaborators/:collabId` | PATCH, DELETE | change role / revoke access | owner |
| `/api/projects/:id` | GET, PATCH, DELETE | one facility's own computed BOQ/cost/schedule/opex / update its settings (incl. `isIncluded`, the program-totals toggle) / delete | viewer+ / editor+ / owner (of the parent program) |
| `/api/projects/:id/items` | POST | add a BOQ line item (flat `customLabel`/`customUnifCode`/`quantity`/`rateUsd`) | editor+ |
| `/api/projects/:id/items/:itemId` | PATCH, DELETE | edit / remove a line item | editor+ |
| `/api/projects/:id/generate-building` | POST | (re)generate one BOQ row per UniFormat division from a building template + GFA (`{templateSlug, grossAreaM2, markupPct}`, `markupPct` defaults to 10), replacing any prior generated rows — used from a facility's own page, after creation | editor+ |
| `/api/projects/:id/opex-items` | POST | add a recurring/operating cost line item (salaries, maintenance, ...) | editor+ |
| `/api/projects/:id/opex-items/:itemId` | PATCH, DELETE | edit / remove a recurring cost line item | editor+ |
| `/api/projects/:id/revenue-items` | POST | add a revenue-source line item (patient fees, pharmacy/lab, rental, grants, ...) | editor+ |
| `/api/projects/:id/revenue-items/:itemId` | PATCH, DELETE | edit / remove a revenue-source line item | editor+ |
| `/api/reference` | GET | countries+regions+FX, currencies, AACE classes, and the global building templates (with their division rates) | any signed-in user |
| `/api/reference/countries` | POST | add a country (+ a default "National average" region) | any |
| `/api/reference/countries/:id` | PATCH, DELETE | edit / remove a country | any |
| `/api/reference/regions` | POST | add a region | any |
| `/api/reference/regions/:id` | PATCH, DELETE | edit / remove a region | any |
| `/api/fx/refresh` | POST | pull live rates from `open.er-api.com` (free, no key, ~161 currencies); throttled to once/24h unless `?force=true`; on failure, existing rates are left untouched and the error is returned as JSON, never a crash | any |

Country/region reference data is still global/shared and unauthenticated —
see "What's intentionally not built yet." Building templates are likewise
global/shared reference data now (see "Pricing model" above) — there's no
per-program catalog to manage anymore.

## Design notes worth knowing before extending this

- **Every field on the program and facility pages saves itself the instant it
  changes** — there's no separate draft/submit step, and no batch of local
  edits sitting unsent. `lib/useSaveStatus.ts`'s `track()` wraps each
  individual PATCH and drives the `SaveStatusBadge` next to the page title
  ("Saving…" → "Saved ✓"/an error), so every single change gets its own
  live confirmation. The **"Save progress"** button at the bottom of each
  page (`useProjectEditor.ts`/`useProgramEditor.ts`'s `saveProgress()`) adds
  an explicit, user-triggered checkpoint on top of that — it re-sends the
  whole current settings object as one PATCH, which is a genuine resync (not
  a no-op "reassurance" button), useful if someone isn't sure everything
  landed or a request dropped along the way. BOQ/opex rows aren't part of
  this resend since they already save individually the same way; there's
  nothing about them a page-level PATCH could re-send.
- **UniFormat buckets are mutually exclusive, not additive with a blended rate.**
  `generateBuildingFromTemplate()` prices Substructure (A), Shell (B), Interiors (C),
  Services (D), etc. as separate divisions, each with its own $/m² rate — there's no
  whole-building blended rate anywhere in the model that a division total could double
  up against. Keep any future generator (a new building type, a demand-driven
  population→GFA cascade) working the same way: divisions sum to the Sub-Total, never
  layered on top of one.
- **`is_addon` and `is_included` are separate booleans on purpose.** `is_addon` is a
  scope classification (discretionary vs core); `is_included` is a live toggle. This
  is what lets a project keep a chapel/park/commercial block present-but-off so its
  cost delta can be tested without deleting the row. `projects.isIncluded` is the
  exact same idea one level up — a facility present-but-off within its program.
- **A facility's recurring cost is either itemized or estimated, never both at
  once.** `computeFacilityOpex()` sums a facility's own `project_opex_items` if
  it has any; a facility with zero rows gets `opexPctOfCapexPerYear`% of its
  own capex instead. Adding one real row to a facility that's been running on
  the auto-estimate switches it over entirely — there's no "the estimate plus
  what I've itemized so far" blend.
- **A migration that tightens a column to `NOT NULL` across more than one table
  needs care on SQLite, or it silently deletes unrelated data.** SQLite has no
  `ALTER COLUMN`, so drizzle-kit generates a rebuild (`CREATE __new_x`,
  `INSERT...SELECT`, `DROP TABLE x`, `RENAME`) wrapped in
  `PRAGMA foreign_keys=OFF` / `=ON`. Two things compound badly: (1) that
  `PRAGMA` is a documented no-op while a transaction is open, and drizzle's own
  `migrate()` wraps every pending migration file in one `BEGIN...COMMIT`; (2)
  when a single migration rebuilds *several* tables, drizzle-kit's generated
  SQL only brackets the *first* rebuild in `OFF`/`ON` and re-enables
  `foreign_keys=ON` before the remaining `DROP TABLE`s. With enforcement
  genuinely on, SQLite's documented behavior for `DROP TABLE` on a table with
  `ON DELETE CASCADE` children is to run an *implicit* `DELETE FROM` first —
  which cascades, recursively, through every child (and grandchild) row,
  wiping tables the migration file never even mentions. This happened for
  real tightening `assemblies`/`sub_items`/`micro_items`.programId to
  `NOT NULL` in one migration — it silently deleted every `macro_items`,
  `assembly_tier_rates`, `assembly_variants`, `macro_item_sub_items`,
  `sub_item_micro_items` and `micro_item_rates` row. If you generate a
  migration like this, apply it with a small script that opens a **fresh**
  connection (so `PRAGMA foreign_keys=OFF` genuinely takes effect before any
  transaction starts), strips every embedded `PRAGMA foreign_keys=...`
  statement from the file and controls it yourself for the whole file, then
  hand-inserts the matching `__drizzle_migrations` row (same sha256-of-file
  hash and journal `when` timestamp `npm run db:migrate` would have used) so
  later runs don't try to reapply it. Test against a backup first. Reused for
  real a second time reworking `project_items` away from the old assembly-based
  model into the current flat `rate_usd` shape — `db/apply-migration-safely.ts`
  is the reusable version of that small script, kept in the repo rather than
  rewritten one-off each time.
- **The calculation engine (`lib/calc/engine.ts`) is deliberately dependency-free.**
  It's imported by both API routes and the client editor so the same numbers are
  computed everywhere without a network round-trip on every keystroke. Keep it that
  way — if a change to the math needs the DB, put the DB read in the caller and pass
  plain data in.
- **FX rates cannot be set manually anywhere — by design, not by omission.** No
  route, form field, or PATCH payload anywhere in the codebase accepts a
  caller-supplied exchange rate; `POST /api/fx/refresh` (via `open.er-api.com`)
  is the *only* code path that ever writes a real rate, and it does so for
  every currency at once, affecting every project that uses it — there's no
  per-project override. `lib/fx.ts` holds the two source values this can ever
  be (`SEED_FX_SOURCE` for the pre-first-fetch placeholder, `LIVE_FX_SOURCE`
  for a genuine fetch) and the UI always shows which one is live vs. a
  never-fetched placeholder rather than presenting both the same way. If you
  add a new mutation route touching `fx_rates`, that's the invariant to not break.
- **FX rates are versioned, not overwritten.** Every fetch inserts a new `fx_rates`
  row rather than updating one in place, so you can see exactly when the number
  behind any given estimate was actually pulled. `getProjectFull` and
  `getReferenceData` both resolve "latest by `fetchedAt`."

## What's intentionally not built yet

- **`/api/reference/countries` and `/api/reference/regions` still have no
  permission check** — any signed-in user (in fact currently any *request* —
  these routes don't call `getCurrentUserFromRequest`) can edit the shared
  country/region reference data. Building templates have the same gap now too
  (no route to edit them from the UI at all yet — seed-only) — both are
  intentionally global/shared, unauthenticated reference data for now.
- **No UI to add or edit a building template** — `building_templates`/
  `building_template_divisions` are seed-only; adding a third template (or
  editing the two placeholder rate sets toward real QS figures) currently
  means editing `db/seed.ts` and re-inserting rows by hand, not a form.
- **No demand-driven (population → beds → GFA) sizing engine** — the attached
  African Health Network functional-programme PDFs describe a full cascade
  from catchment population through bed count to a recommended GFA; this app
  deliberately stops short of that for now (per-conversation decision) and
  just takes a GFA typed in directly, using those PDFs' reference figures only
  to pick each template's `referenceGfaM2` hint. Building it would mean a new
  pure function alongside `generateBuildingFromTemplate()` in
  `lib/calc/engine.ts` that outputs a GFA instead of assuming one.
- **No scenario save/compare UI**, though the `scenarios` table exists in the
  schema for it.
- **No automated tests.** `lib/calc/engine.ts` being pure functions makes it
  the highest-value place to add them first — `computeCost()` and
  `generateBuildingFromTemplate()` especially, since every cost figure in the
  app ultimately runs through them.
