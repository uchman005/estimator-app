import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import ProgramSummaryView from "./ProgramSummaryView";

export const dynamic = "force-dynamic";

export default async function ProgramSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <ProgramSummaryView programId={Number(id)} currentUserEmail={user.email} />;
}
