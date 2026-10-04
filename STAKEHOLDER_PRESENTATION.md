# Classified Infrastructure Estimator — Stakeholder Presentation

*Speaking notes for a 30-minute walkthrough. Section headers include a suggested time budget — adjust live based on questions.*

---

## 1. The problem (3 min)

When we plan a new facility — a clinic, a hospital, a staff housing block, an ICT hub — the first question everyone asks is **"what will it cost, and can we afford it?"** Answering that well, early, before a single architectural drawing exists, is hard:

- Detailed quantity-takeoff estimating needs drawings we don't have yet at the concept stage.
- Spreadsheet-based estimates drift — every analyst builds their own, nothing is classified consistently, and nobody can compare one facility's estimate to another's on the same basis.
- Cost varies enormously by country and region, and that variation is usually hand-adjusted, inconsistently, if at all.
- Capital cost and the ability to *run* the thing afterward (staffing, utilities, maintenance) are usually estimated by two different people in two different documents that never reconcile.

**The Classified Infrastructure Estimator** is a tool that answers "what will it cost, and can we afford it" — for a single building and for a whole multi-building programme — in minutes, on a defensible, industry-standard basis, and keeps capital cost and operating cost in the same model so the feasibility question is answered honestly.

---

## 2. Who it's for, and what "classified" means (2 min)

Two industry standards do the heavy lifting, which is where the credibility of the numbers comes from:

- **UniFormat II (ASTM E1557)** — the standard way of breaking a building down into divisions: Substructure, Shell, Interiors, Services, Equipment & Furnishings, Special Construction, Building Sitework. Every cost line in this tool is classified this way, so a clinic's cost breakdown and a hospital's cost breakdown are directly comparable division-by-division.
- **AACE International's Cost Estimate Classification System** — the standard that says how much contingency and confidence-band uncertainty an estimate should carry depending on how much design information actually exists. A Class 5 "concept, no drawings yet" estimate is deliberately wide (−50%/+100%); a Class 1 "near-final design" estimate is deliberately tight (−10%/+15%). We don't pretend to know more than we do at each stage.

This means every number this tool produces comes with an honest, industry-recognized confidence band attached — not a single falsely-precise figure.

---

## 3. How a building gets priced — modeled square-meter cost estimating (5 min)

This is the core idea, and it's worth walking through live if there's time.

1. **Pick a building template.** We've seeded four to start: **Alpha Clinic** (advanced, 3 floors), **Remote Clinic** (rural/satellite, 2 floors), **Residential Apartment** (staff housing), and **ICT Hub** (data/comms). Each template carries a $/m² rate for each of the seven UniFormat divisions — sized and rated off real reference material (see Section 6).
2. **Type in a gross floor area.** That's the only building-specific input required at this stage.
3. **The tool generates one BOQ line per division** — division rate × your GFA — and lays it out exactly the way a professional quantity surveyor's "modeled square-foot" estimate reads: division rows → Sub-Total → Contractor Fee → Architect Fee → Permitting → **Total building cost**. This is the same presentation format used in RSMeans/Gordian reference estimating.
4. **A flat buffer is baked in automatically** (10% by default) on top of the template's placeholder rates — an explicit margin for the real-world surprises a rough per-m² figure can't see coming, adjustable per facility.

Anything that *isn't* a building — an ambulance, a piece of equipment — is just a flat label + quantity + rate. No template needed, no false precision implied.

**Country and region cost variation is one multiplier, not a separate system.** Every rate — generated or flat — is scaled by `country.baseCostIndex × (1 + region.offsetPct)`. Switch the country and every dollar figure in the facility rescales instantly.

---

## 4. From one building to a whole programme (5 min)

A **Program** is the site/portfolio level — a hospital campus, a chain of clinics — and it owns location, funding, and the feasibility verdict. A **Facility** is one building inside it, with its own BOQ, schedule, and confidence band.

- Add as many facilities to a program as the site needs; each can be toggled in or out of the program's totals without deleting it — useful for "what if we drop the staff housing block" scenario testing.
- **Capital cost rolls up** facility by facility into one program-level total, with its own confidence band.
- **Recurring operating cost is itemized per facility** where real numbers exist (staffing, utilities, maintenance), and falls back to a flat percentage of that facility's own capital cost where they don't — and the report **tells you which facilities are using the estimate versus the real figure**, so nobody mistakes a placeholder for a fact.
- **The feasibility verdict** compares proposed/committed funding against capital cost, reports funding coverage *and* the funding gap at both the expected cost and the estimate's own pessimistic upper band (not just one comfortable number), and — if there's a capital surplus — works out how many years of operating shortfall that surplus could self-fund before new money is needed. Every aggregate is reconciled dollar-for-dollar against the rows it's built from, so "do these four facility costs add up to the total" is always literally true, not approximately true.
- A simple multi-year operating-cost outlook (nominal, clearly labeled as not discounted to present value) shows what the recurring bill looks like inflated out a decade, not just year one.

---

## 5. What a stakeholder actually sees (5 min — live demo if possible)

- A **facility page**: template picker → GFA input → generated division breakdown → soft costs → schedule → recurring cost → one clean estimate summary with a confidence band.
- A **program page**: every facility listed with cost/opex/duration, a capital cost rollup, and the funding/feasibility verdict in plain language ("Feasible", "Capital feasible, operations fragile", etc.) plus the numbers behind it.
- A **"Print summary"** button on both — a one-page, curated PDF-ready report (via the browser's own print-to-PDF, no extra software) with only the figures a stakeholder actually needs, not the full editing interface.
- Every edit **auto-saves** with a visible "Saved ✓" confirmation, plus an explicit **"Save progress"** button for anyone who wants a deliberate checkpoint.

---

## 6. Where the numbers come from (3 min)

The starting $/m² rates aren't invented. They're grounded in:

- **African Health Network clinical-functional-programme reference material** — population→beds→GFA sizing figures for advanced clinics and rural/satellite clinics, used to size each template's reference gross floor area.
- **DHA Kenya Level 3A satellite clinic report** — real GFA ranges and a construction-rate range (KES 45,000–120,000/m²) used to baseline the total $/m² for the clinic templates, split across UniFormat divisions in a typical RSMeans-style medical-building proportion.
- **RSMeans/Gordian "Modeled Square Foot Cost Estimating" methodology** — the division-breakdown → Sub-Total → Contractor Fee → Architect Fee → Total presentation format this tool's output deliberately matches.

**Important, honest caveat to say out loud:** every seeded rate is explicitly flagged in the data as a *placeholder pending real quantity-surveyor validation* — this tool gets a team to a defensible Class 5 concept estimate in minutes; it is not a substitute for a QS review before anything is committed to.

---

## 7. What's deliberately not built yet (2 min — be upfront about this)

Good to pre-empt rather than get caught by a question:

- No full demand-driven population→beds→GFA *calculator* — the reference PDFs informed the seeded defaults, but you still type in a GFA directly rather than the tool deriving one from catchment population.
- No true NPV/discounted cash-flow life-cycle costing yet — the multi-year opex outlook is nominal (inflated, not discounted), clearly labeled as such rather than faking a discount-rate assumption nobody has validated.
- Operating-cost estimates for a facility with no itemized rows are a flat % of its own capital cost — not yet a staffing/utilities/maintenance build-up. The report flags which figures are real versus this estimate.
- No automated test suite yet (the calculation engine is pure, dependency-free functions specifically so this is cheap to add next).

---

## 8. The pitch, in one paragraph (1 min — your closing line)

*"This gives us a consistent, industry-classified way to answer 'what will this cost and can we afford it' for any facility or whole programme, in minutes instead of days, with an honest confidence band instead of a falsely precise single number — and it keeps capital cost and the ability to actually operate the building in the same model, so feasibility isn't a guess."*

---

## Anticipated questions

| Question | Answer |
|---|---|
| "How accurate is this?" | As accurate as a Class 5 concept estimate can honestly be — that's exactly why every figure carries a −50%/+100% band, not a false point estimate. Accuracy tightens automatically as real design/quotes replace placeholders. |
| "Can we use our own rates instead of the seeded ones?" | Yes — every rate is just a number in the database; replacing a template's $/m² rates with real QS figures is a direct edit, no architecture change needed. |
| "Does it handle currencies other than USD?" | Yes — live FX rates convert the USD-denominated estimate to local currency, with the rate and fetch date disclosed on every figure so nobody mistakes it for a fixed number. |
| "What happens if we add a new facility type, like a mortuary or a school?" | New building templates are just new database rows (name, floors, reference GFA, 7 division rates) — no code change required to add one. |
| "Who can see/edit a program?" | Role-based: owner, editor (full access, can't delete or manage sharing), viewer (read-only). Invite by email, works even before the invitee has an account. |
