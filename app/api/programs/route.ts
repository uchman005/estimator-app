import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { programs, programCollaborators, users, projects } from "@/db/schema";
import { desc, eq, and, inArray } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { getTemplateProgramId } from "@/lib/data";
import { cloneAllAssemblies } from "@/lib/catalogClone";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // The template program (see lib/catalogClone.ts) is importable-from by
  // anyone but never shows up in a dashboard/facility listing.
  const owned = await db
    .select()
    .from(programs)
    .where(and(eq(programs.ownerId, user.id), eq(programs.isTemplate, false)))
    .orderBy(desc(programs.updatedAt));

  const sharedRows = await db
    .select({ program: programs, role: programCollaborators.role, ownerEmail: users.email })
    .from(programCollaborators)
    .innerJoin(programs, eq(programCollaborators.programId, programs.id))
    .innerJoin(users, eq(programs.ownerId, users.id))
    .where(
      and(
        eq(programCollaborators.userId, user.id),
        eq(programCollaborators.status, "accepted"),
        eq(programs.isTemplate, false)
      )
    )
    .orderBy(desc(programs.updatedAt));

  // Lightweight facility summary (no cost/schedule computation) — enough for
  // list pages (the dashboard, /facilities) to show what's inside each
  // program without an N+1 round trip per program.
  const programIds = [...owned.map((p) => p.id), ...sharedRows.map((r) => r.program.id)];
  const facilityRows = programIds.length
    ? await db
        .select({ id: projects.id, programId: projects.programId, name: projects.name, phase: projects.phase })
        .from(projects)
        .where(inArray(projects.programId, programIds))
    : [];
  const facilitiesByProgram = new Map<number, typeof facilityRows>();
  for (const f of facilityRows) {
    const arr = facilitiesByProgram.get(f.programId) ?? [];
    arr.push(f);
    facilitiesByProgram.set(f.programId, arr);
  }

  return NextResponse.json({
    owned: owned.map((p) => ({ ...p, role: "owner" as const, facilities: facilitiesByProgram.get(p.id) ?? [] })),
    shared: sharedRows.map((r) => ({
      ...r.program,
      role: r.role,
      ownerEmail: r.ownerEmail,
      facilities: facilitiesByProgram.get(r.program.id) ?? [],
    })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const [row] = await db
    .insert(programs)
    .values({
      name: body.name || "Untitled program",
      ownerId: user.id,
      countryId: body.countryId || "ng",
      regionId: body.regionId ?? null,
    })
    .returning();

  // Every program starts with its own copy of the default starter catalog,
  // so the hospital generator and BOQ picker work immediately — see
  // lib/catalogClone.ts. Best-effort: a program with no catalog yet is
  // recoverable (import from the template manually), losing the program
  // itself to a catalog seeding error would not be.
  const templateProgramId = await getTemplateProgramId();
  if (templateProgramId) {
    try {
      await cloneAllAssemblies(templateProgramId, row.id);
    } catch (err) {
      console.error(`Failed to clone starter catalog into new program #${row.id}:`, err);
    }
  }

  return NextResponse.json(row, { status: 201 });
}
