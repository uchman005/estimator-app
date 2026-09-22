import { db } from "@/db";
import { eq, inArray } from "drizzle-orm";
import {
  assemblies,
  assemblyTierRates,
  assemblyVariants,
  macroItems,
  macroItemSubItems,
  subItems,
  subItemMicroItems,
  microItems,
  microItemRates,
  classNodes,
  countries,
  regions,
  currencies,
  fxRates,
  aaceClasses,
  programs,
  projects,
  projectItems,
} from "@/db/schema";
import type { AssemblyLite, ProjectItemLite, Tier, MacroItemLite, SubItemLite, MicroItemLite } from "@/lib/calc/engine";

/** The full reusable library for ONE program — every sub-item and micro-item
 * that program's catalog owns, fully assembled with their own
 * components/rates, independent of which (if any) macro-item currently
 * assembles them in. Used both to build AssemblyLite.macroItems and to power
 * the standalone Sub-Items/Micro-Items Library management panels, which need
 * to browse and edit these without going through any one assembly. */
export async function getComponentLibrary(programId: number) {
  const microItemRows = await db.select().from(microItems).where(eq(microItems.programId, programId));
  const microItemIds = microItemRows.map((m) => m.id);
  const microRateRows = microItemIds.length
    ? await db.select().from(microItemRates).where(inArray(microItemRates.microItemId, microItemIds))
    : [];

  const microItemsById = new Map<number, MicroItemLite>();
  for (const m of microItemRows) {
    const rates: Partial<Record<Tier, number>> = {};
    microRateRows
      .filter((mr) => mr.microItemId === m.id)
      .forEach((mr) => {
        rates[mr.tier as Tier] = mr.unitRateUsd;
      });
    microItemsById.set(m.id, { id: m.id, name: m.name, unit: m.unit, rates });
  }

  const subItemRows = await db.select().from(subItems).where(eq(subItems.programId, programId));
  const subItemIds = subItemRows.map((s) => s.id);
  const subMicroJoinRows = subItemIds.length
    ? await db.select().from(subItemMicroItems).where(inArray(subItemMicroItems.subItemId, subItemIds))
    : [];

  const subItemsById = new Map<number, SubItemLite>();
  for (const s of subItemRows) {
    const components = subMicroJoinRows
      .filter((j) => j.subItemId === s.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((j) => {
        const microItem = microItemsById.get(j.microItemId);
        return microItem ? { joinId: j.id, quantity: j.quantity, microItem } : null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
    subItemsById.set(s.id, {
      id: s.id,
      name: s.name,
      components,
      labour: { basic: s.labourBasic, standard: s.labourStandard, premium: s.labourPremium },
    });
  }

  return { microItemsById, subItemsById, microItemRows, subItemRows };
}

export async function getAllAssembliesLite(programId: number): Promise<AssemblyLite[]> {
  const rows = await db
    .select({
      id: assemblies.id,
      name: assemblies.name,
      unit: assemblies.unit,
      pricingMode: assemblies.pricingMode,
      hasVariants: assemblies.hasVariants,
      baseDurationMonths: assemblies.baseDurationMonths,
      baseSize: assemblies.baseSize,
      durationExponent: assemblies.durationExponent,
      phase: assemblies.phase,
      isCustom: assemblies.isCustom,
      classCode: classNodes.code,
      className: classNodes.name,
    })
    .from(assemblies)
    .leftJoin(classNodes, eq(assemblies.classNodeId, classNodes.id))
    .where(eq(assemblies.programId, programId));

  const ids = rows.map((r) => r.id);
  const tierRows = ids.length
    ? await db.select().from(assemblyTierRates).where(inArray(assemblyTierRates.assemblyId, ids))
    : [];
  const variantRows = ids.length
    ? await db.select().from(assemblyVariants).where(inArray(assemblyVariants.assemblyId, ids))
    : [];
  const macroItemRows = ids.length ? await db.select().from(macroItems).where(inArray(macroItems.assemblyId, ids)) : [];
  const macroItemIds = macroItemRows.map((s) => s.id);
  const macroSubJoinRows = macroItemIds.length
    ? await db.select().from(macroItemSubItems).where(inArray(macroItemSubItems.macroItemId, macroItemIds))
    : [];

  const { subItemsById } = await getComponentLibrary(programId);

  return rows.map((r) => {
    const tierRates: Partial<Record<Tier, number>> = {};
    tierRows
      .filter((t) => t.assemblyId === r.id)
      .forEach((t) => {
        tierRates[t.tier as Tier] = t.unitRateUsd;
      });
    const variants = variantRows
      .filter((v) => v.assemblyId === r.id)
      .map((v) => ({ id: v.id, label: v.label, unitRateUsd: v.unitRateUsd, laborPct: v.laborPct, materialPct: v.materialPct }));

    const macroItemsForAssembly: MacroItemLite[] = macroItemRows
      .filter((ma) => ma.assemblyId === r.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((ma) => {
        const components = macroSubJoinRows
          .filter((j) => j.macroItemId === ma.id)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((j) => {
            const subItem = subItemsById.get(j.subItemId);
            return subItem ? { joinId: j.id, quantity: j.quantity, subItem } : null;
          })
          .filter((c): c is NonNullable<typeof c> => c !== null);
        return {
          id: ma.id,
          name: ma.name,
          components,
          labour: { basic: ma.labourBasic, standard: ma.labourStandard, premium: ma.labourPremium },
        };
      });

    return {
      id: r.id,
      name: r.name,
      unit: r.unit,
      pricingMode: r.pricingMode as AssemblyLite["pricingMode"],
      hasVariants: !!r.hasVariants,
      baseDurationMonths: r.baseDurationMonths,
      baseSize: r.baseSize,
      durationExponent: r.durationExponent,
      phase: r.phase as AssemblyLite["phase"],
      classCode: r.classCode ?? "Z",
      className: r.className ?? "Unclassified",
      tierRates,
      variants,
      macroItems: macroItemsForAssembly,
    };
  });
}

export async function getReferenceData(programId: number) {
  const [countryRows, regionRows, currencyRows, fxRows, aaceRows, assemblyList] = await Promise.all([
    db.select().from(countries),
    db.select().from(regions),
    db.select().from(currencies),
    db.select().from(fxRates),
    db.select().from(aaceClasses),
    getAllAssembliesLite(programId),
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
    assemblies: assemblyList,
  };
}

/** The one seeded "Default Starter Catalog" program (see db/seed.ts,
 * lib/catalogClone.ts) — every new program's catalog is cloned from it, and
 * anyone can import from it regardless of ownership. */
export async function getTemplateProgramId(): Promise<number | null> {
  const [row] = await db.select({ id: programs.id }).from(programs).where(eq(programs.isTemplate, true));
  return row?.id ?? null;
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

function toItemsLite(items: (typeof projectItems.$inferSelect)[], assemblyById: Map<number, AssemblyLite>): (ProjectItemLite & { id: number })[] {
  return items.map((it) => ({
    id: it.id,
    assembly: it.assemblyId != null ? assemblyById.get(it.assemblyId) ?? null : null,
    customLabel: it.customLabel,
    customUnit: it.customUnit,
    customUnifCode: it.customUnifCode,
    quantity: it.quantity,
    tier: it.tier as Tier | null,
    variantId: it.variantId,
    rateOverrideUsd: it.rateOverrideUsd,
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
  const assemblyList = await getAllAssembliesLite(project.programId);
  const assemblyById = new Map(assemblyList.map((a) => [a.id, a]));
  const itemsLite = toItemsLite(items, assemblyById);

  const location = await resolveLocation(program.countryId, program.regionId);
  const [aaceRow] = await db.select().from(aaceClasses).where(eq(aaceClasses.classNumber, project.aaceClass));

  return {
    project,
    program,
    items: itemsLite,
    ...location,
    aace: aaceRow,
  };
}

/** A program and every facility inside it, each with its own raw items
 * (uncomputed — the caller runs computeCost/computeSchedule per facility and
 * computeProgramCapex/computeFeasibility across all of them, same division
 * of labour as the single-facility route: data.ts assembles rows, the route
 * does the math). */
export async function getProgramFull(programId: number) {
  const [program] = await db.select().from(programs).where(eq(programs.id, programId));
  if (!program) return null;

  const facilityRows = await db.select().from(projects).where(eq(projects.programId, programId));
  const facilityIds = facilityRows.map((p) => p.id);
  const allItems = facilityIds.length
    ? await db.select().from(projectItems).where(inArray(projectItems.projectId, facilityIds))
    : [];
  const assemblyList = await getAllAssembliesLite(programId);
  const assemblyById = new Map(assemblyList.map((a) => [a.id, a]));
  const aaceRows = await db.select().from(aaceClasses);
  const aaceByNumber = new Map(aaceRows.map((a) => [a.classNumber, a]));

  const facilities = facilityRows.map((project) => ({
    project,
    items: toItemsLite(
      allItems.filter((it) => it.projectId === project.id),
      assemblyById
    ),
    aace: aaceByNumber.get(project.aaceClass),
  }));

  const location = await resolveLocation(program.countryId, program.regionId);

  return { program, facilities, ...location };
}
