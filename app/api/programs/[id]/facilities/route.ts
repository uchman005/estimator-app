import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireProgramRole } from "@/lib/auth/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const programId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireProgramRole(user?.id ?? null, programId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json().catch(() => ({}));
  const phase = ["phase_1", "phase_2", "phase_3"].includes(body.phase) ? body.phase : "phase_1";
  const [row] = await db
    .insert(projects)
    .values({
      programId,
      phase,
      name: body.name || "Untitled facility",
      aaceClass: body.aaceClass ?? 5,
    })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
