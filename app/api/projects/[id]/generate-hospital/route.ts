import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assemblies, assemblyVariants, projectItems, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateHospitalProgram, type Tier } from "@/lib/calc/engine";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireFacilityRole } from "@/lib/auth/permissions";

const GEN_TAG = "hospital-generator";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const projectId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireFacilityRole(user?.id ?? null, projectId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  const beds = Math.max(1, Number(body.beds) || 1);
  const tier = (body.tier as Tier) || "standard";
  const floors = Math.max(1, Number(body.floors) || 1);
  const floorToFloorM = Number(body.floorToFloorM) || 4.0;
  const windowToWallRatio = (Number(body.windowToWallRatioPct) || 30) / 100;

  const result = generateHospitalProgram({ beds, tier, floors, floorToFloorM, windowToWallRatio });

  await db.delete(projectItems).where(and(eq(projectItems.projectId, projectId), eq(projectItems.genTag, GEN_TAG)));

  const [project] = await db.select({ programId: projects.programId }).from(projects).where(eq(projects.id, projectId));
  const allAssemblies = await db.select().from(assemblies).where(eq(assemblies.programId, project.programId));
  const bySlug = new Map(allAssemblies.map((a) => [a.slug, a]));

  for (const line of result.lines) {
    const assembly = bySlug.get(line.assemblyCode);
    if (!assembly) continue;

    let variantId: number | null = null;
    if (assembly.hasVariants && line.variantIndex != null) {
      const variants = await db.select().from(assemblyVariants).where(eq(assemblyVariants.assemblyId, assembly.id));
      variantId = variants[line.variantIndex]?.id ?? variants[0]?.id ?? null;
    }

    await db.insert(projectItems).values({
      projectId,
      assemblyId: assembly.id,
      quantity: line.quantity,
      tier: assembly.hasVariants ? null : line.tier ?? tier,
      variantId,
      isAddon: false,
      isIncluded: true,
      genTag: GEN_TAG,
    });
  }

  return NextResponse.json({ ok: true, info: result.info });
}
