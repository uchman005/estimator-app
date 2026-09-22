// Deep-copies catalog items (Main Items/assemblies, Sub-Items, Micro-Items)
// from one program's catalog into another. This is the ONLY place that
// copying happens — used both to bootstrap a brand-new program with a
// working starter catalog (cloneAllAssemblies from the template program) and
// to power the "import from another program" feature (any one of the three
// clone* functions, called for a single item).
//
// Deliberately simple: every clone always creates fresh rows in the target
// program, with no attempt to detect "this was already imported" and dedupe
// or update in place. Importing the same Main Item twice makes two
// independent copies. See mighty-squishing-kettle.md for why.
import { db } from "@/db";
import { eq } from "drizzle-orm";
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
} from "@/db/schema";

export async function cloneMicroItem(microItemId: number, targetProgramId: number): Promise<number> {
  const [source] = await db.select().from(microItems).where(eq(microItems.id, microItemId));
  if (!source) throw new Error(`Micro-item ${microItemId} not found`);

  const [copy] = await db
    .insert(microItems)
    .values({ programId: targetProgramId, name: source.name, unit: source.unit, sourceNote: source.sourceNote })
    .returning();

  const rates = await db.select().from(microItemRates).where(eq(microItemRates.microItemId, microItemId));
  if (rates.length) {
    await db.insert(microItemRates).values(rates.map((r) => ({ microItemId: copy.id, tier: r.tier, unitRateUsd: r.unitRateUsd })));
  }
  return copy.id;
}

export async function cloneSubItem(subItemId: number, targetProgramId: number): Promise<number> {
  const [source] = await db.select().from(subItems).where(eq(subItems.id, subItemId));
  if (!source) throw new Error(`Sub-item ${subItemId} not found`);

  const [copy] = await db
    .insert(subItems)
    .values({
      programId: targetProgramId,
      name: source.name,
      sourceNote: source.sourceNote,
      labourBasic: source.labourBasic,
      labourStandard: source.labourStandard,
      labourPremium: source.labourPremium,
    })
    .returning();

  const joins = await db.select().from(subItemMicroItems).where(eq(subItemMicroItems.subItemId, subItemId));
  for (const join of joins) {
    const newMicroItemId = await cloneMicroItem(join.microItemId, targetProgramId);
    await db.insert(subItemMicroItems).values({
      subItemId: copy.id,
      microItemId: newMicroItemId,
      quantity: join.quantity,
      sortOrder: join.sortOrder,
    });
  }
  return copy.id;
}

export async function cloneAssembly(assemblyId: number, targetProgramId: number): Promise<number> {
  const [source] = await db.select().from(assemblies).where(eq(assemblies.id, assemblyId));
  if (!source) throw new Error(`Assembly ${assemblyId} not found`);

  const [copy] = await db
    .insert(assemblies)
    .values({
      programId: targetProgramId,
      classNodeId: source.classNodeId,
      name: source.name,
      slug: source.slug,
      unit: source.unit,
      pricingMode: source.pricingMode,
      hasVariants: source.hasVariants,
      baseDurationMonths: source.baseDurationMonths,
      baseSize: source.baseSize,
      durationExponent: source.durationExponent,
      phase: source.phase,
      isCustom: source.isCustom,
    })
    .returning();

  if (source.pricingMode === "composite") {
    const macros = await db.select().from(macroItems).where(eq(macroItems.assemblyId, assemblyId));
    for (const macro of macros) {
      const [macroCopy] = await db
        .insert(macroItems)
        .values({
          assemblyId: copy.id,
          name: macro.name,
          sortOrder: macro.sortOrder,
          sourceNote: macro.sourceNote,
          labourBasic: macro.labourBasic,
          labourStandard: macro.labourStandard,
          labourPremium: macro.labourPremium,
        })
        .returning();

      const joins = await db.select().from(macroItemSubItems).where(eq(macroItemSubItems.macroItemId, macro.id));
      for (const join of joins) {
        const newSubItemId = await cloneSubItem(join.subItemId, targetProgramId);
        await db.insert(macroItemSubItems).values({
          macroItemId: macroCopy.id,
          subItemId: newSubItemId,
          quantity: join.quantity,
          sortOrder: join.sortOrder,
        });
      }
    }
  } else if (source.hasVariants) {
    const variants = await db.select().from(assemblyVariants).where(eq(assemblyVariants.assemblyId, assemblyId));
    if (variants.length) {
      await db.insert(assemblyVariants).values(
        variants.map((v) => ({
          assemblyId: copy.id,
          label: v.label,
          unitRateUsd: v.unitRateUsd,
          laborPct: v.laborPct,
          materialPct: v.materialPct,
          sourceNote: v.sourceNote,
        }))
      );
    }
  } else {
    const rates = await db.select().from(assemblyTierRates).where(eq(assemblyTierRates.assemblyId, assemblyId));
    if (rates.length) {
      await db.insert(assemblyTierRates).values(rates.map((r) => ({ assemblyId: copy.id, tier: r.tier, unitRateUsd: r.unitRateUsd })));
    }
  }

  return copy.id;
}

/** Clones every assembly in sourceProgramId into targetProgramId — used both
 * to bootstrap a new program's starter catalog from the template, and as the
 * "import everything" case of the general import feature. */
export async function cloneAllAssemblies(sourceProgramId: number, targetProgramId: number): Promise<number[]> {
  const sourceAssemblies = await db.select({ id: assemblies.id }).from(assemblies).where(eq(assemblies.programId, sourceProgramId));
  const newIds: number[] = [];
  for (const a of sourceAssemblies) {
    newIds.push(await cloneAssembly(a.id, targetProgramId));
  }
  return newIds;
}
