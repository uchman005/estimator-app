import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { FacilitiesClient } from "./FacilitiesClient";

export const dynamic = "force-dynamic";

export default async function FacilitiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <FacilitiesClient currentUserEmail={user.email} />;
}
