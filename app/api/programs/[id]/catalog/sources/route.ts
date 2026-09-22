import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { programs, programCollaborators } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireProgramRole } from "@/lib/auth/permissions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const targetProgramId = Number(id);
  const user = await getCurrentUserFromRequest(req);

  const access = await requireProgramRole(user?.id ?? null, targetProgramId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const owned = await db
    .select({ id: programs.id, name: programs.name })
    .from(programs)
    .where(and(eq(programs.ownerId, user!.id), eq(programs.isTemplate, false), ne(programs.id, targetProgramId)));

  const shared = await db
    .select({ id: programs.id, name: programs.name })
    .from(programCollaborators)
    .innerJoin(programs, eq(programCollaborators.programId, programs.id))
    .where(
      and(
        eq(programCollaborators.userId, user!.id),
        eq(programCollaborators.status, "accepted"),
        eq(programs.isTemplate, false),
        ne(programs.id, targetProgramId)
      )
    );

  const [template] = await db.select({ id: programs.id, name: programs.name }).from(programs).where(eq(programs.isTemplate, true));

  const seen = new Set<number>();
  const sources = [...(template ? [{ ...template, isTemplate: true }] : []), ...owned, ...shared]
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .map((p) => ({ id: p.id, name: p.name, isTemplate: "isTemplate" in p ? p.isTemplate : false }));

  return NextResponse.json(sources);
}
