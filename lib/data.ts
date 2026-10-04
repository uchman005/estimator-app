import { db } from "@/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  buildingTemplates,
  buildingTemplateDivisions,
  countries,
  regions,
  currencies,
  fxRates,
  aaceClasses,
  programs,
  projects,
  projectItems,
  projectOpexItems,
  projectRevenueItems,
} from "@/db/schema";
import { generateBuildingFromTemplate, type ProjectItemLite, type OpexItemLite, type RevenueItemLite, type BuildingTemplateLite, type Phase } from "@/lib/calc/engine";

const BUILDING_GEN_TAG = "building-template";

/** Generates one BOQ row per UniFormat division from a template + GFA,
 * replacing any prior generated rows for this facility first. The one place
 * this insert happens — shared by the facility-creation flow (a new
 * building-type facility gets its BOQ populated immediately, not left
 * empty) and the standalone "regenerate" button on a facility's own page.
 * `markupPct` (default 10) is the flat buffer baked into every row's rate —
 * see generateBuildingFromTemplate(). */
export async function insertBuildingFromTemplate(projectId: number, template: BuildingTemplateLite, grossAreaM2: number, markupPct = 10) {
  const lines = generateBuildingFromTemplate(template, grossAreaM2, markupPct);
  await db.delete(projectItems).where(and(eq(projectItems.projectId, projectId), eq(projectItems.genTag, BUILDING_GEN_TAG)));
  for (const line of lines) {
    await db.insert(projectItems).values({
      projectId,
      customLabel: `${line.divisionCode} — ${line.divisionName}`,
      customUnit: "m²",
      customUnifCode: line.divisionCode,
      quantity: line.quantity,
      rateUsd: line.rateUsd,
      phase: line.phase,
      baseDurationMonths: line.baseDurationMonths,
      baseSize: line.baseSize,
      durationExponent: line.durationExponent,
      isAddon: false,
      isIncluded: true,
      genTag: BUILDING_GEN_TAG,
    });
  }
  return lines.length;
}

/** Every seeded building template, each with its own UniFormat A-G division
 * rates nested — the picker in BuildingTemplatePanel.tsx and the generator
 * route both read this. Global reference data (like countries/aaceClasses),
 * not program-scoped — see the comment on buildingTemplates in db/schema.ts. */
export async function getBuildingTemplates(): Promise<BuildingTemplateLite[]> {
  const templateRows = await db.select().from(buildingTemplates);
  const divisionRows = await db.select().from(buildingTemplateDivisions);
  return templateRows.map((t) => ({
    slug: t.slug,
    name: t.name,
    defaultFloors: t.defaultFloors,
    referenceGfaM2: t.referenceGfaM2,
    divisions: divisionRows
      .filter((d) => d.templateId === t.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((d) => ({ divisionCode: d.divisionCode, divisionName: d.divisionName, baseRateUsdPerM2: d.baseRateUsdPerM2 })),
  }));
}

export async function getReferenceData() {
  const [countryRows, regionRows, currencyRows, fxRows, aaceRows, templates] = await Promise.all([
    db.select().from(countries),
    db.select().from(regions),
    db.select().from(currencies),
    db.select().from(fxRates),
    db.select().from(aaceClasses),
    getBuildingTemplates(),
  ]);

  // latest FX per currency
  const latestFx: Record<string, (typeof fxRows)[number]> = {};
  for (const row of fxRows) {
    const existing = latestFx[row.currencyCode];
    if (!existing || new Date(row.fetchedAt) > new Date(existing.fetchedAt)) {
      latestFx[row.currencyCode] = row;
    }
  }

  const countriesFull = countryRows.map((c) => ({
    ...c,
    regions: regionRows.filter((r) => r.countryId === c.id),
    currency: currencyRows.find((cur) => cur.code === c.currencyCode) ?? null,
    fx: latestFx[c.currencyCode]?.rateToUsd ?? 1,
    fxFetchedAt: latestFx[c.currencyCode]?.fetchedAt ?? null,
    fxSource: latestFx[c.currencyCode]?.source ?? null,
  }));

  return {
    countries: countriesFull,
    currencies: currencyRows,
    aaceClasses: aaceRows.sort((a, b) => b.classNumber - a.classNumber),
    buildingTemplates: templates,
  };
}

/** Country/region/currency/FX for a given location — shared by a single
 * facility (via its parent program) and by the program itself, since
 * location now lives only on programs. */
async function resolveLocation(countryId: string, regionId: number | null) {
  const [country] = await db.select().from(countries).where(eq(countries.id, countryId));
  const countryRegions = await db.select().from(regions).where(eq(regions.countryId, countryId));
  const region = regionId != null ? countryRegions.find((r) => r.id === regionId) ?? null : null;
  const currencyRow = country ? (await db.select().from(currencies).where(eq(currencies.code, country.currencyCode)))[0] : null;
  const fxRows = country ? await db.select().from(fxRates).where(eq(fxRates.currencyCode, country.currencyCode)) : [];
  const latestFx = fxRows.sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime())[0];
  return {
    country,
    region,
    currency: currencyRow,
    fx: latestFx?.rateToUsd ?? 1,
    fxFetchedAt: latestFx?.fetchedAt ?? null,
    fxSource: latestFx?.source ?? null,
  };
}

function toOpexItemsLite(items: (typeof projectOpexItems.$inferSelect)[]): OpexItemLite[] {
  return items.map((it) => ({ annualAmountUsd: it.annualAmountUsd, isIncluded: it.isIncluded }));
}

function toRevenueItemsLite(items: (typeof projectRevenueItems.$inferSelect)[]): RevenueItemLite[] {
  return items.map((it) => ({ annualAmountUsd: it.annualAmountUsd, isIncluded: it.isIncluded }));
}

function toItemsLite(items: (typeof projectItems.$inferSelect)[]): (ProjectItemLite & { id: number })[] {
  return items.map((it) => ({
    id: it.id,
    customLabel: it.customLabel,
    customUnit: it.customUnit,
    customUnifCode: it.customUnifCode,
    quantity: it.quantity,
    rateUsd: it.rateUsd,
    phase: it.phase as Phase,
    baseDurationMonths: it.baseDurationMonths,
    baseSize: it.baseSize,
    durationExponent: it.durationExponent,
    isAddon: it.isAddon,
    isIncluded: it.isIncluded,
  }));
}

/** One facility (a `projects` row) plus its parent program — a facility no
 * longer carries its own location, so it's resolved via the program. */
export async function getProjectFull(projectId: number) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return null;
  const [program] = await db.select().from(programs).where(eq(programs.id, project.programId));
  if (!program) return null;

  const items = await db.select().from(projectItems).where(eq(projectItems.projectId, projectId));
  const itemsLite = toItemsLite(items);
  const opexItems = await db.select().from(projectOpexItems).where(eq(projectOpexItems.projectId, projectId));
  const revenueItems = await db.select().from(projectRevenueItems).where(eq(projectRevenueItems.projectId, projectId));

  const location = await resolveLocation(program.countryId, program.regionId);
  const [aaceRow] = await db.select().from(aaceClasses).where(eq(aaceClasses.classNumber, project.aaceClass));

  return {
    project,
    program,
    items: itemsLite,
    opexItems,
    revenueItems,
    ...location,
    aace: aaceRow,
  };
}

/** A program and every facility inside it, each with its own raw items
 * (uncomputed — the caller runs computeCost/computeSchedule per facility and
 * computeProgramReport() across all of them, same division of labour as the
 * single-facility route: data.ts assembles rows, the route does the math). */
export async function getProgramFull(programId: number) {
  const [program] = await db.select().from(programs).where(eq(programs.id, programId));
  if (!program) return null;

  const facilityRows = await db.select().from(projects).where(eq(projects.programId, programId));
  const facilityIds = facilityRows.map((p) => p.id);
  const allItems = facilityIds.length
    ? await db.select().from(projectItems).where(inArray(projectItems.projectId, facilityIds))
    : [];
  const allOpexItems = facilityIds.length
    ? await db.select().from(projectOpexItems).where(inArray(projectOpexItems.projectId, facilityIds))
    : [];
  const allRevenueItems = facilityIds.length
    ? await db.select().from(projectRevenueItems).where(inArray(projectRevenueItems.projectId, facilityIds))
    : [];
  const aaceRows = await db.select().from(aaceClasses);
  const aaceByNumber = new Map(aaceRows.map((a) => [a.classNumber, a]));

  const facilities = facilityRows.map((project) => ({
    project,
    items: toItemsLite(allItems.filter((it) => it.projectId === project.id)),
    opexItems: toOpexItemsLite(allOpexItems.filter((it) => it.projectId === project.id)),
    revenueItems: toRevenueItemsLite(allRevenueItems.filter((it) => it.projectId === project.id)),
    aace: aaceByNumber.get(project.aaceClass),
  }));

  const location = await resolveLocation(program.countryId, program.regionId);

  return { program, facilities, ...location };
}
