import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assemblies, subItems, microItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireProgramRole, requireImportSourceAccess } from "@/lib/auth/permissions";
import { cloneAssembly, cloneSubItem, cloneMicroItem } from "@/lib/catalogClone";

const CLONERS = {
  assembly: cloneAssembly,
  subItem: cloneSubItem,
  microItem: cloneMicroItem,
} as const;

const TABLES = { assembly: assemblies, subItem: subItems, microItem: microItems } as const;

/** What can be imported from a source program: just enough to render a
 * picker (id + name), not the full computed shape — the picker isn't
 * pricing anything, just letting you choose what to copy in. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const targetProgramId = Number(id);
  const user = await getCurrentUserFromRequest(req);

  const access = await requireProgramRole(user?.id ?? null, targetProgramId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const sourceProgramId = Number(req.nextUrl.searchParams.get("sourceProgramId"));
  const kind = req.nextUrl.searchParams.get("kind") as keyof typeof TABLES;
  if (!sourceProgramId || !TABLES[kind]) {
    return NextResponse.json({ error: "sourceProgramId and a valid kind are required." }, { status: 400 });
  }

  const sourceAccess = await requireImportSourceAccess(user?.id ?? null, sourceProgramId);
  if (!sourceAccess.ok) return NextResponse.json({ error: sourceAccess.error }, { status: sourceAccess.status });

  const table = TABLES[kind];
  const rows = await db.select({ id: table.id, name: table.name }).from(table).where(eq(table.programId, sourceProgramId));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const targetProgramId = Number(id);
  const user = await getCurrentUserFromRequest(req);

  const access = await requireProgramRole(user?.id ?? null, targetProgramId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const sourceProgramId = Number(body.sourceProgramId);
  const kind = body.kind as keyof typeof CLONERS;
  const itemId = Number(body.itemId);
  if (!sourceProgramId || !itemId || !CLONERS[kind]) {
    return NextResponse.json({ error: "sourceProgramId, itemId and a valid kind are required." }, { status: 400 });
  }

  const sourceAccess = await requireImportSourceAccess(user?.id ?? null, sourceProgramId);
  if (!sourceAccess.ok) return NextResponse.json({ error: sourceAccess.error }, { status: sourceAccess.status });

  const newId = await CLONERS[kind](itemId, targetProgramId);
  return NextResponse.json({ ok: true, id: newId }, { status: 201 });
}
