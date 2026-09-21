import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { CatalogProvider } from "./CatalogProvider";

export const dynamic = "force-dynamic";

export default async function CatalogLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <CatalogProvider currentUserEmail={user.email}>{children}</CatalogProvider>;
}
