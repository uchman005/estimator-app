import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { macroItems, macroItemSubItems, subItems, assemblies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireAssemblyRole } from "@/lib/auth/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const macroItemId = Number(id);
  const user = await getCurrentUserFromRequest(req);

  const [macro] = await db
    .select({ assemblyId: macroItems.assemblyId, programId: assemblies.programId })
    .from(macroItems)
    .innerJoin(assemblies, eq(macroItems.assemblyId, assemblies.id))
    .where(eq(macroItems.id, macroItemId));
  if (!macro) return NextResponse.json({ error: "Macro-item not found." }, { status: 404 });

  const access = await requireAssemblyRole(user?.id ?? null, macro.assemblyId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  if (!body.subItemId) return NextResponse.json({ error: "subItemId is required." }, { status: 400 });

  // A macro-item can only assemble a sub-item from the SAME program's library.
  const [subItem] = await db.select({ programId: subItems.programId }).from(subItems).where(eq(subItems.id, Number(body.subItemId)));
  if (!subItem) return NextResponse.json({ error: "Sub-item not found." }, { status: 404 });
  if (subItem.programId !== macro.programId) {
    return NextResponse.json({ error: "That sub-item belongs to a different program's catalog — import it first." }, { status: 400 });
  }

  const [row] = await db
    .insert(macroItemSubItems)
    .values({ macroItemId, subItemId: Number(body.subItemId), quantity: body.quantity != null ? Number(body.quantity) : 1 })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
