import { NextRequest, NextResponse } from "next/server";
import { getComponentLibrary } from "@/lib/data";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireProgramRole } from "@/lib/auth/permissions";

export async function GET(req: NextRequest) {
  const programId = Number(req.nextUrl.searchParams.get("programId"));
  if (!programId) return NextResponse.json({ error: "programId is required." }, { status: 400 });

  const user = await getCurrentUserFromRequest(req);
  const access = await requireProgramRole(user?.id ?? null, programId, "viewer");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { subItemsById, microItemsById } = await getComponentLibrary(programId);
  return NextResponse.json({
    subItems: [...subItemsById.values()],
    microItems: [...microItemsById.values()],
  });
}
