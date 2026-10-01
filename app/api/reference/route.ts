import { NextResponse } from "next/server";
import { getReferenceData } from "@/lib/data";

export async function GET() {
  const data = await getReferenceData();
  return NextResponse.json(data);
}
