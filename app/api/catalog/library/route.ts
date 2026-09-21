import { NextResponse } from "next/server";
import { getComponentLibrary } from "@/lib/data";

export async function GET() {
  const { subItemsById, microItemsById } = await getComponentLibrary();
  return NextResponse.json({
    subItems: [...subItemsById.values()],
    microItems: [...microItemsById.values()],
  });
}
