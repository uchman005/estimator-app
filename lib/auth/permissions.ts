import { db } from "@/db";
import { projects, projectCollaborators } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type ProjectRole = "owner" | "editor" | "viewer";

const RANK: Record<ProjectRole, number> = { viewer: 0, editor: 1, owner: 2 };

/** Returns the caller's role on a project, or null if they have no access at all. */
export async function getProjectRole(userId: number, projectId: number): Promise<ProjectRole | null> {
  const [project] = await db.select({ ownerId: projects.ownerId }).from(projects).where(eq(projects.id, projectId));
  if (!project) return null;
  if (project.ownerId === userId) return "owner";

  const [collab] = await db
    .select({ role: projectCollaborators.role })
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, projectId),
        eq(projectCollaborators.userId, userId),
        eq(projectCollaborators.status, "accepted")
      )
    );
  return (collab?.role as ProjectRole) ?? null;
}

export type AccessResult = { ok: true; role: ProjectRole } | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Central gate for every project-scoped API route. Pass the minimum role the
 * action requires ('viewer' for reads, 'editor' for edits, 'owner' for
 * delete/collaborator-management) and get back either the caller's actual
 * role or a ready-to-return HTTP status + message.
 */
export async function requireProjectRole(userId: number | null, projectId: number, minRole: ProjectRole): Promise<AccessResult> {
  if (!userId) return { ok: false, status: 401, error: "Not signed in." };
  const role = await getProjectRole(userId, projectId);
  if (!role) return { ok: false, status: 404, error: "Project not found." }; // don't leak existence to non-collaborators
  if (RANK[role] < RANK[minRole]) {
    return { ok: false, status: 403, error: `This action requires ${minRole} access; you have ${role} access.` };
  }
  return { ok: true, role };
}
