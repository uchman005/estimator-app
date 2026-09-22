import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subItemMicroItems, subItems, microItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUserFromRequest } from "@/lib/auth/session";
import { requireSubItemRole } from "@/lib/auth/permissions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const subItemId = Number(id);
  const user = await getCurrentUserFromRequest(req);
  const access = await requireSubItemRole(user?.id ?? null, subItemId, "editor");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const body = await req.json();
  if (!body.microItemId) return NextResponse.json({ error: "microItemId is required." }, { status: 400 });

  // A sub-item can only assemble a micro-item from the SAME program's library.
  const [subItem] = await db.select({ programId: subItems.programId }).from(subItems).where(eq(subItems.id, subItemId));
  const [microItem] = await db.select({ programId: microItems.programId }).from(microItems).where(eq(microItems.id, Number(body.microItemId)));
  if (!microItem) return NextResponse.json({ error: "Micro-item not found." }, { status: 404 });
  if (!subItem || microItem.programId !== subItem.programId) {
    return NextResponse.json({ error: "That micro-item belongs to a different program's catalog — import it first." }, { status: 400 });
  }

  const [row] = await db
    .insert(subItemMicroItems)
    .values({ subItemId, microItemId: Number(body.microItemId), quantity: body.quantity != null ? Number(body.quantity) : 1 })
    .returning();
  return NextResponse.json(row, { status: 201 });
}
