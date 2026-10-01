import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { programs, programCollaborators, users, projects } from "@/db/schema";
import { desc, eq, and, inArray } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const owned = await db.select().from(programs).where(eq(programs.ownerId, user.id)).orderBy(desc(programs.updatedAt));

  const sharedRows = await db
    .select({ program: programs, role: programCollaborators.role, ownerEmail: users.email })
    .from(programCollaborators)
    .innerJoin(programs, eq(programCollaborators.programId, programs.id))
    .innerJoin(users, eq(programs.ownerId, users.id))
    .where(and(eq(programCollaborators.userId, user.id), eq(programCollaborators.status, "accepted")))
    .orderBy(desc(programs.updatedAt));

  // Lightweight facility summary (no cost/schedule computation) — enough for
  // list pages (the dashboard, /facilities) to show what's inside each
  // program without an N+1 round trip per program.
  const programIds = [...owned.map((p) => p.id), ...sharedRows.map((r) => r.program.id)];
  const facilityRows = programIds.length
    ? await db
        .select({ id: projects.id, programId: projects.programId, name: projects.name, facilityType: projects.facilityType, isIncluded: projects.isIncluded })
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
      fundedUsd: Number(body.fundedUsd) || 0,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
