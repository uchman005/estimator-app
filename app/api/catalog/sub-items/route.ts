import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subItems } from "@/db/schema";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireProgramRole } from "@/lib/auth/permissions";

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromRequest(req);
  const body = await req.json().catch(() => ({}));
  const programId = Number(body.programId);
  if (!programId) return NextResponse.json({ error: "programId is required." }, { status: 400 });

  const access = await requireProgramRole(user?.id ?? null, programId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const [row] = await db
    .insert(subItems)
    .values({ programId, name: body.name || "New sub-item", sourceNote: body.sourceNote ?? null })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
