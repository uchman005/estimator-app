import { db } from "@/db";
import { projects, programs, programCollaborators } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type ProjectRole = "owner" | "editor" | "viewer";

const RANK: Record<ProjectRole, number> = { viewer: 0, editor: 1, owner: 2 };

/** Returns the caller's role on a program, or null if they have no access at all. */
export async function getProgramRole(userId: number, programId: number): Promise<ProjectRole | null> {
  const [program] = await db.select({ ownerId: programs.ownerId }).from(programs).where(eq(programs.id, programId));
  if (!program) return null;
  if (program.ownerId === userId) return "owner";

  const [collab] = await db
    .select({ role: programCollaborators.role })
    .from(programCollaborators)
    .where(
      and(
        eq(programCollaborators.programId, programId),
        eq(programCollaborators.userId, userId),
        eq(programCollaborators.status, "accepted")
      )
    );
  return (collab?.role as ProjectRole) ?? null;
}

export type AccessResult = { ok: true; role: ProjectRole } | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Central gate for every program-scoped API route. Pass the minimum role the
 * action requires ('viewer' for reads, 'editor' for edits, 'owner' for
 * delete/collaborator-management) and get back either the caller's actual
 * role or a ready-to-return HTTP status + message.
 */
export async function requireProgramRole(userId: number | null, programId: number, minRole: ProjectRole): Promise<AccessResult> {
  if (!userId) return { ok: false, status: 401, error: "Not signed in." };
  const role = await getProgramRole(userId, programId);
  if (!role) return { ok: false, status: 404, error: "Program not found." }; // don't leak existence to non-collaborators
  if (RANK[role] < RANK[minRole]) {
    return { ok: false, status: 403, error: `This action requires ${minRole} access; you have ${role} access.` };
  }
  return { ok: true, role };
}

/**
 * Same gate, for a facility (a `projects` row). A facility has no
 * collaborators or owner of its own — access is entirely governed by its
 * parent program's collaborators, so this just resolves programId and
 * delegates to requireProgramRole().
 */
export async function requireFacilityRole(userId: number | null, projectId: number, minRole: ProjectRole): Promise<AccessResult> {
  if (!userId) return { ok: false, status: 401, error: "Not signed in." }; // checked before the lookup below, so an unauthenticated caller can't probe which project ids exist
  const [project] = await db.select({ programId: projects.programId }).from(projects).where(eq(projects.id, projectId));
  if (!project) return { ok: false, status: 404, error: "Project not found." };
  return requireProgramRole(userId, project.programId, minRole);
}
