import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import ProjectEditor from "./ProjectEditor";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { id } = await params;
  return <ProjectEditor projectId={Number(id)} currentUserEmail={user.email} />;
}
