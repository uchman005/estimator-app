# Classified Infrastructure Estimator

A parametric capital-cost, schedule and feasibility estimator for social infrastructure
(hospitals, clinics, schools, housing, campuses) — line items classified under
**UniFormat II** (ASTM E1557), confidence bands aligned to **AACE International's**
Cost Estimate Classification System, country/region cost indices with FX support,
and a bed-count-driven hospital space-program generator.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Drizzle ORM** over **SQLite** (`better-sqlite3`) — chosen so the same schema/dialect
  carries forward to hosted Postgres later with a driver swap, not a rewrite
- No external services required to run locally; the one optional network call
  (`open.er-api.com` for live FX rates) fails gracefully to manual rates if unreachable

## Pricing model: Main Item → macro-items → sub-items → micro-items (a reusable library)

Every priced line item (an "assembly" — the "Main Item" in a project's BOQ,
e.g. "Hospital Building — Core Construction") gets its rate one of three
ways — `assemblies.pricingMode`:

- **`tier`** — a flat basic/standard/premium rate set directly (`assembly_tier_rates`).
- **`variant`** — pick ONE of several named material/labour options
  (`assembly_variants`), e.g. exterior wall systems.
- **`composite`** — the assembly's rate is never set directly. It's the *sum*,
  four levels deep — and `sub_items`/`micro_items` are a **reusable library**,
  not private to whatever assembly happens to use them:

  ```
  assembly (Main Item)
    └─ macro_items                      owned by ONE assembly, e.g. "Structural Work"
        └─ macro_item_sub_items (join)   assembles a LIBRARY sub-item in, at a quantity
            └─ sub_items                  reusable — the same "Theatre Envelope" can be
                                          assembled into any number of macro-items
                └─ sub_item_micro_items (join)  assembles a LIBRARY micro-item in, at a quantity
                    └─ micro_items             reusable — the actual priced leaf
                                               (micro_item_rates: basic/standard/premium)
  ```

  A macro-item doesn't create its own private sub-items — it picks existing
  ones from the Sub-Items Library and assembles them in with a quantity (the
  join row). A sub-item does the same with micro-items. Edit a micro-item's
  rate, or a join's quantity, once, and *every* macro-item — in *every*
  assembly — that assembles it in recomputes together. There is exactly one
  place this sum happens (`compositeAssemblyRate()` / `subItemRate()` in
  `lib/calc/engine.ts`), used identically by the catalog view and by actual
  project costing, so the two can never drift apart.

  Every level can hold anywhere from 1 to ~1000 rows — nothing in the schema
  or the catalog UI caps it, though at real scale (hundreds of rows) you'd
  want search/virtualization on the library panels, which isn't built yet.

  Each join (`sub_item_micro_items`, `macro_item_sub_items`) carries its own
  `quantity` (default 1), which is what lets two genuinely different pricing
  patterns coexist under the same `composite` mode:
  - **Per-unit rate** (quantity left at 1): a micro-item like "Excavation &
    footings" priced at $19.10/m² GFA — quantity×rate just collapses to
    rate, behaving exactly like a blended $/unit figure. This is how the
    hospital's five structural/MEP macro-items work.
  - **Literal takeoff** (quantity set for real): a micro-item like "Theatre
    door (fire-rated)" assembled at quantity 2, rate $1,400/door —
    contributing a genuine $2,800, not a rate to be multiplied by something
    else later. This is how the PHC clinic's "Minor Theatre" macro-item
    works (2 doors, 45 m² of wall, 4 m² of glazing, 6 structural beams).

  On top of the component sum, **both `macro_items` and `sub_items` carry
  their own basic/standard/premium `labourBasic/Standard/Premium`** — the
  cost of actually assembling what's underneath into a working whole,
  additive, not baked into any one micro-item's rate. Zero by default (most
  macro-items — a blended per-m² rate — need none); set it where combining
  several real components into one sub-assembly genuinely takes extra work.
  The PHC clinic's "Theatre Envelope" sub-item and "Minor Theatre" macro-item
  both carry non-zero labour as a worked example; the hospital's five
  PDF-sourced macro-items deliberately carry zero, since their sourced
  totals already are the full number — adding labour on top of them would
  double-count against the source.

  A project's line-item `quantity` (set where the assembly is added to a
  BOQ) then means whatever fits the assembly: m² of GFA for the per-unit-rate
  pattern, or "how many of this templated thing" (e.g. 5 satellite clinics)
  for the takeoff pattern.

Two composite Main Items are seeded, deliberately demonstrating both
patterns:
- **"Hospital Building — Core Construction"** (Structural Work, Mechanical
  Systems, Electrical Systems, Specialized Medical Areas, Finishing as its
  five macro-items) — sourced from a 2025 Nigerian market breakdown (see the
  sourcing note at the top of `db/seed.ts`'s `mainItems` array); everything
  below the macro-item level is this seed's own reasonable allocation of a
  sourced category total, clearly flagged via `sourceNote`, not
  independently sourced. Zero labour throughout — see above.
- **"Primary Health Care Clinic — Composite"** — a blended per-m² shell (same
  pattern as above) plus a literal "Minor Theatre / Procedure Room" takeoff
  (door/wall/window/beam quantities, plus fitting/coordination labour at
  both the sub-item and macro-item level), showing every pattern this model
  supports in one assembly. Its quantities, rates, and labour are explicit
  planning-stage placeholders (`sourceNote` says so on every line) — replace
  with a real room schedule for an actual project.

Both are intentionally small "samples" trees, not 1000 rows — the point is
to seed something real and manageable that demonstrates the shape, not to
pre-populate every possible line item.

Manage all of this under the **Rate Book** section of the sidebar, which is
split into three pages, one per concern: **Main Items** (`/catalog` — the
assemblies, grouped by UniFormat letter; composite ones show their
macro-items, each an *assembler* with a picker to add existing library
sub-items rather than an inline creator), **Sub-Items** (`/catalog/sub-items`
— the standalone library, each sub-item assembled from micro-items), and
**Micro-Items** (`/catalog/micro-items` — the priced leaves). Creating a
brand-new sub-item or micro-item happens on its own page; using an existing
one in a macro-item or sub-item happens via the picker next to it. All three
pages share one layout (`app/catalog/layout.tsx` + `CatalogProvider`), so the
sidebar persists and the rate book is loaded once between them.
Each level renders as a collapsed summary pill (name + running subtotal)
that expands into its own dedicated workspace — deliberately roomy, not a
cramped inline strip.

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
- The UniFormat II classification tree (A–G + Z, down to the leaf codes assemblies attach to)
- AACE Class 1–5 contingency/accuracy bands
- 25 assemblies: 17 tier-rate, 3 material-variant (exterior walls/windows/doors),
  and 5 composite (Structural Work, Mechanical Systems, Electrical Systems,
  Specialized Medical Areas, Finishing — each built from sub-items and
  micro-items, see "Pricing model" above)
- The hospital building type + its department space-program template

No user accounts or projects are seeded — the first thing you'll do is sign up.
Delete `sqlite.db*` and re-run `npm run db:setup` to start over.

> **If `npm install` fails on `better-sqlite3`** with a `node-gyp`/compile error:
> this has shown up as a transient registry hiccup during a large install batch
> in some sandboxed environments. It self-heals — run
> `rm -rf node_modules/better-sqlite3 && npm install better-sqlite3` and it will
> pick up the package's bundled prebuilt binary (`prebuilds/linux-x64.node` etc.)
> without needing to compile anything. No code change needed.

## Accounts, ownership & sharing

- Every project has exactly one **owner** (`projects.ownerId`) — whoever created it.
  A user can own any number of projects (`db/schema.ts` puts no limit on it).
- The owner can share a project with anyone **by email**, choosing **viewer** or
  **editor**. If that email doesn't have an account yet, the invite sits as
  `status: 'pending'` in `project_collaborators` and links itself automatically
  — no re-invite needed — the moment that email signs up (`app/api/auth/signup`
  checks for matching pending invites and accepts them as part of account creation).
- **Editors** can change everything about a project (settings, BOQ, hospital
  generator) except delete it or manage who else has access. **Viewers** can see
  the full computed estimate but every input is disabled — enforced both in the
  UI (the entire input column renders inside a native `<fieldset disabled>`, which
  cascades to every control inside it regardless of which component renders it)
  and, more importantly, server-side on every mutating route.
- Authorization is centralized in `lib/auth/permissions.ts`
  (`requireProjectRole(userId, projectId, minRole)`), which every project-scoped
  API route calls before doing anything. A user with no access at all gets a 404
  rather than a 403, so a project's existence isn't leaked to people who aren't on it.
- Sessions are DB-backed (`sessions` table, random 32-byte token in an httpOnly
  cookie, 30-day expiry) rather than stateless JWTs, so a session can be revoked
  by deleting its row — simpler to reason about than token invalidation, and fine
  at this scale. Passwords are hashed with Node's built-in `scrypt` (no extra
  dependency); see `lib/auth/password.ts`.

## Project structure

```
db/
  schema.ts          Drizzle schema — 24 tables, see below
  seed.ts             Reference-data seed (idempotent-ish; re-run against a fresh DB)
  migrate.ts          Migration runner (npm run db:migrate)
lib/
  auth/
    password.ts       scrypt hashing (Node built-in, no dependency)
    session.ts         DB-backed sessions, cookie read/write
    permissions.ts      getProjectRole / requireProjectRole — the single gate every
                        project route calls before reading or mutating anything
  calc/engine.ts      Pure calculation functions — no DB, no fetch. Cost, schedule,
                      feasibility, the hospital-program generator, AND the composite
                      macro-item/sub-item/micro-item rate sum (subItemRate(),
                      compositeAssemblyRate()) all live here, shared verbatim by API
                      routes (server), the editor (client), and the catalog page, so
                      there is exactly one implementation of the math to trust.
  data.ts             Drizzle query helpers — getComponentLibrary() builds the full
                      reusable sub-item/micro-item library as in-memory maps first,
                      then getAllAssembliesLite() nests macro_items → (join) →
                      library sub-items → (join) → library micro-items into each
                      composite assembly from those same maps, so a sub-item
                      assembled into three different macro-items is the same object
                      in memory, not three copies
  fx.ts               LIVE_FX_SOURCE / SEED_FX_SOURCE constants
app/
  login/, signup/     Auth pages (AuthForm client component, shared by both)
  page.tsx            Dashboard — auth-gated; lists owned + shared-with-you projects
  catalog/
    page.tsx           Server auth guard
    CatalogClient.tsx   Fetches both the assemblies and the standalone library,
                        renders the Assemblies list, Sub-Items Library, and
                        Micro-Items Library sections
    components/         AssemblyCard (branches per pricingMode) → MacroItemBlock
                        (assembles library sub-items in, via a picker, plus its own
                        labour) → AssembledSubItemRow; SubItemsLibraryPanel (create/
                        edit library sub-items, each assembling library micro-items
                        in via a picker, plus its own labour) → AssembledMicroItemRow;
                        MicroItemsLibraryPanel (flat CRUD — where a micro-item's
                        name/unit/rates are actually defined); LabourInputs (shared
                        3-tier input, used by both macro-item and sub-item editors)
  api/
    auth/              signup, login, logout, me
    catalog/            library CRUD + assemble/detach joins + tier-rate/variant
                        CRUD — see table below
    projects/           see table below, all permission-checked
  projects/[id]/
    page.tsx           Server wrapper — redirects to /login if not authenticated
    ProjectEditor.tsx   Thin client orchestrator — no business logic, just wiring;
                        wraps every input in <fieldset disabled={!canEdit}>
    useProjectEditor.ts Data-fetching + local state + persistence, as a hook
    components/         One file per panel (CountryRegionPanel, AaceClassPanel,
                        HospitalGeneratorPanel, BoqPanel + BoqRow [shows a composite
                        assembly's breakdown inline via an expand toggle],
                        SoftCostsPanel, ScheduleAssumptionsPanel, FundingPanel,
                        CollaboratorsPanel, SummaryPanel, SchedulePanel,
                        FeasibilityPanel) + types.ts
components/
  AppShell.tsx        The persistent sidebar (Dashboard, Rate Book › Main / Sub / Micro Items, user email,
                      sign-out, theme toggle) — wraps every authenticated page
  ThemeToggle.tsx     Light/dark switch; persists to localStorage, applies via
                      data-theme on <html> (see the anti-flash script in
                      app/layout.tsx that reads it before first paint)
  AuthForm.tsx        Shared login/signup form UI
  FxStatusPanel.tsx   Dashboard-level global FX status + refresh
  ui/                 Generic, reusable primitives (Panel, Field/Input/Select/NumField,
                        Button/ClassBadge, Kpi/BreakdownRow/ScheduleBar) used by every
                        page — the design system, not project-specific
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
| `/api/projects` | GET, POST | list (owned+shared, separated) / create | signed in |
| `/api/projects/:id` | GET, PATCH, DELETE | full computed estimate / update settings / delete | viewer+ / editor+ / owner |
| `/api/projects/:id/items` | POST | add a BOQ line item | editor+ |
| `/api/projects/:id/items/:itemId` | PATCH, DELETE | edit / remove a line item | editor+ |
| `/api/projects/:id/generate-hospital` | POST | run the bed-program generator | editor+ |
| `/api/projects/:id/collaborators` | GET, POST | list access / invite by email+role | viewer+ / owner |
| `/api/projects/:id/collaborators/:collabId` | PATCH, DELETE | change role / revoke access | owner |
| `/api/reference` | GET | countries+regions+FX, currencies, AACE classes, assemblies | any |
| `/api/reference/countries` | POST | add a country (+ a default "National average" region) | any |
| `/api/reference/countries/:id` | PATCH, DELETE | edit / remove a country | any |
| `/api/reference/regions` | POST | add a region | any |
| `/api/reference/regions/:id` | PATCH, DELETE | edit / remove a region | any |
| `/api/fx/refresh` | POST | pull live rates from `open.er-api.com` (free, no key, ~161 currencies); throttled to once/24h unless `?force=true`; on failure, existing rates are left untouched and the error is returned as JSON, never a crash | any |
| `/api/catalog/assemblies/:id/tier-rates` | PATCH | upsert an assembly's basic/standard/premium rates | any |
| `/api/catalog/assemblies/:id/variants` | POST | add a material option to a variant-priced assembly | any |
| `/api/catalog/variants/:id` | PATCH, DELETE | edit/remove a material option | any |
| `/api/catalog/library` | GET | the full reusable sub-item/micro-item library, independent of any assembly | any |
| `/api/catalog/assemblies/:id/macro-items` | POST | add a macro-item to a composite assembly (the "Main Item") | any |
| `/api/catalog/macro-items/:id` | PATCH, DELETE | rename/remove a macro-item, or set its `labour` (cascades to its assembled-in join rows) | any |
| `/api/catalog/macro-items/:id/components` | POST | **assemble** an existing library sub-item into this macro-item, at a quantity | any |
| `/api/catalog/macro-item-components/:id` | PATCH, DELETE | change quantity / remove one sub-item from one macro-item — the library sub-item itself is untouched | any |
| `/api/catalog/sub-items` | POST | create a new standalone sub-item in the library (not yet assembled anywhere) | any |
| `/api/catalog/sub-items/:id` | PATCH, DELETE | rename the library sub-item, set its `labour`, or delete it outright (cascades everywhere it's assembled) | any |
| `/api/catalog/sub-items/:id/components` | POST | **assemble** an existing library micro-item into this sub-item, at a quantity | any |
| `/api/catalog/sub-item-components/:id` | PATCH, DELETE | change quantity / remove one micro-item from one sub-item — the library micro-item itself is untouched | any |
| `/api/catalog/micro-items` | POST | create a new standalone micro-item in the library, with its 3 tier rates | any |
| `/api/catalog/micro-items/:id` | PATCH, DELETE | edit name/unit/rates, or delete outright — this is the route that actually moves every composite price that assembles it in | any |

Reference-data routes (countries/regions/assemblies) aren't user-scoped in this
scaffold — they're shared global catalog data, same as a real quantity-surveyor's
rate book would be. Locking those down to specific roles (e.g. only certain users
can edit the rate book) is a reasonable next step but wasn't asked for yet.

## Design notes worth knowing before extending this

- **UniFormat buckets are mutually exclusive, not additive with a blended rate.**
  The hospital generator prices Substructure (A), Superstructure/Envelope/Roofing (B)
  and Building Services (D) separately, so the C-Interiors department rows price
  *fit-out only* — not structure or MEP, which would otherwise be counted twice. This
  bug existed in an earlier prototype iteration and is now fixed at the rate-table
  level (`db/seed.ts`) — don't reintroduce it by deriving department rates from a
  whole-building blended rate again.
- **`is_addon` and `is_included` are separate booleans on purpose.** `is_addon` is a
  scope classification (discretionary vs core); `is_included` is a live toggle. This
  is what lets a project keep a chapel/park/commercial block present-but-off so its
  cost delta can be tested without deleting the row.
- **Department percentage splits are currently hardcoded** in `lib/calc/engine.ts`
  (`HOSPITAL_DEPT_SPLIT`) even though `space_template_items` in the DB already holds
  the same data. The generator route should be switched to read from that table (via
  `buildingTypeId` → `spaceTemplates` → `spaceTemplateItems`) so a maternity-heavy
  hospital and a trauma-heavy one can get different splits without a code change —
  flagged as the natural next step, not done yet.
- **Sub-items and micro-items are a shared library — deleting one is a blast-radius
  decision, not a local one.** `onDelete: "cascade"` on the join tables means
  deleting a library micro-item silently removes it from every sub-item that
  assembled it in, and deleting a sub-item removes it from every macro-item that
  assembled it in. There's no "used in N places, are you sure?" confirmation in the
  UI yet — worth adding before this is used by more than one person on real data.
- **Labour lives on `macro_items`/`sub_items`, not on the join or the micro-item.**
  That was a deliberate choice: labour is "the cost of combining what's assembled
  into *this* thing," which is a property of the container, not of any one
  component or any one assembly relationship. Don't be tempted to move it onto the
  join tables (`macro_item_sub_items`/`sub_item_micro_items`) — that would make the
  same sub-item cost different amounts to assemble depending on which macro-item
  assembled it, which isn't the model here (a sub-item's fitting labour is constant
  wherever it's used; only its *quantity* varies per assembly).
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

- **Catalog routes have no permission check at all** — same permissive pattern
  as the original `/api/reference/countries` routes (any signed-in user, in
  fact currently any *request* — these routes don't call
  `getCurrentUserFromRequest` — can edit the shared rate book). Fine for a
  single-org internal tool, not fine before this faces the public internet;
  the fix is straightforward (add an auth check, maybe a role) but hasn't
  been prioritized since nothing asked for it yet.
- **`space_template_items` still isn't wired into the hospital generator** —
  the department percentage split lives twice, once in the DB (informational
  only now) and once hardcoded in `lib/calc/engine.ts`'s `HOSPITAL_DEPT_SPLIT`.
  They agree today because one was copied from the other; they will silently
  diverge if either is edited without the other. Same flag as before, still
  the natural next step.
- **No way to add a wholly new *building type*** (something beyond "hospital")
  with its own generator from the UI — that still means writing a new pure
  function alongside `generateHospitalProgram` in `lib/calc/engine.ts`. The
  composite/sub-item/micro-item *pricing* model is fully data-driven now; the
  bed-count-to-line-items *generation logic* for a given building type is not.
- **No scenario save/compare UI**, though the `scenarios` table exists in the
  schema for it.
- **No automated tests.** `lib/calc/engine.ts` being pure functions makes it
  the highest-value place to add them first — `compositeAssemblyRate()`
  especially, since it's the one function every cost figure in the app
  ultimately runs through.
