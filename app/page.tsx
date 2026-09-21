import { db } from "@/db";
import { projects, projectCollaborators, users, countries } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell } from "@/components/AppShell";
import { FxStatusPanel } from "@/components/FxStatusPanel";
import NewProjectForm from "./NewProjectForm";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [countryRows, ownedRows, sharedRows] = await Promise.all([
    db.select().from(countries),
    db.select().from(projects).where(eq(projects.ownerId, user.id)).orderBy(desc(projects.updatedAt)),
    db
      .select({ project: projects, role: projectCollaborators.role, ownerEmail: users.email })
      .from(projectCollaborators)
      .innerJoin(projects, eq(projectCollaborators.projectId, projects.id))
      .innerJoin(users, eq(projects.ownerId, users.id))
      .where(and(eq(projectCollaborators.userId, user.id), eq(projectCollaborators.status, "accepted")))
      .orderBy(desc(projects.updatedAt)),
  ]);
  const countryName = (id: string) => countryRows.find((c) => c.id === id)?.name ?? id;

  return (
    <AppShell email={user.email}>
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-ink">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted">
            Parametric capital cost, schedule &amp; feasibility estimates classified under UniFormat II.
          </p>
        </div>

        <NewProjectForm countries={countryRows.map((c) => ({ id: c.id, name: c.name }))} />

        <div className="mt-5">
          <FxStatusPanel />
        </div>

        <h2 className="mb-3 mt-8 text-sm font-semibold tracking-wide text-blueprint">YOUR PROJECTS</h2>
        {ownedRows.length === 0 && <p className="text-sm text-muted">No projects yet — create one above.</p>}
        <div className="space-y-2">
          {ownedRows.map((p) => (
            <ProjectRow key={p.id} id={p.id} name={p.name} sub={`${countryName(p.countryId)} · AACE Class ${p.aaceClass} · ${p.deliveryStrategy}`} badge="Owner" />
          ))}
        </div>

        {sharedRows.length > 0 && (
          <>
            <h2 className="mb-3 mt-8 text-sm font-semibold tracking-wide text-blueprint">SHARED WITH YOU</h2>
            <div className="space-y-2">
              {sharedRows.map((r) => (
                <ProjectRow
                  key={r.project.id}
                  id={r.project.id}
                  name={r.project.name}
                  sub={`Shared by ${r.ownerEmail} · ${countryName(r.project.countryId)}`}
                  badge={r.role === "editor" ? "Editor" : "Viewer"}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function ProjectRow({ id, name, sub, badge }: { id: number; name: string; sub: string; badge: string }) {
  return (
    <Link href={`/projects/${id}`} className="block rounded-xl border border-border bg-surface px-4 py-3 shadow-sm transition-colors hover:border-blueprint">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-ink">{name}</div>
          <div className="mt-0.5 text-xs text-muted">{sub}</div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted">{badge}</span>
          <span className="font-mono text-xs text-muted">#{id}</span>
        </div>
      </div>
    </Link>
  );
}
