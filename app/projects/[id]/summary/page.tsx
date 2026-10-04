import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import FacilitySummaryView from "./FacilitySummaryView";

export const dynamic = "force-dynamic";

export default async function FacilitySummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <FacilitySummaryView projectId={Number(id)} currentUserEmail={user.email} />;
}
