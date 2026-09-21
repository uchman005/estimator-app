import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, projectCollaborators, users } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const owned = await db.select().from(projects).where(eq(projects.ownerId, user.id)).orderBy(desc(projects.updatedAt));

  const sharedRows = await db
    .select({ project: projects, role: projectCollaborators.role, ownerEmail: users.email })
    .from(projectCollaborators)
    .innerJoin(projects, eq(projectCollaborators.projectId, projects.id))
    .innerJoin(users, eq(projects.ownerId, users.id))
    .where(and(eq(projectCollaborators.userId, user.id), eq(projectCollaborators.status, "accepted")))
    .orderBy(desc(projects.updatedAt));

  return NextResponse.json({
    owned: owned.map((p) => ({ ...p, role: "owner" as const })),
    shared: sharedRows.map((r) => ({ ...r.project, role: r.role, ownerEmail: r.ownerEmail })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const [row] = await db
    .insert(projects)
    .values({
      name: body.name || "Untitled project",
      ownerId: user.id,
      countryId: body.countryId || "ng",
      regionId: body.regionId ?? null,
      aaceClass: body.aaceClass ?? 5,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
