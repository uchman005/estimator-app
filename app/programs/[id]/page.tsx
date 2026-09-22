import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import ProgramEditor from "./ProgramEditor";

export const dynamic = "force-dynamic";

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <ProgramEditor programId={Number(id)} currentUserEmail={user.email} />;
}
