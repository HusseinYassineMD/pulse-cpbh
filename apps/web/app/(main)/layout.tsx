import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { LEAD_ACCESS_COOKIE } from "@/lib/portal-config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const hasLeadAccess = cookieStore.get(LEAD_ACCESS_COOKIE)?.value === "1";
  return <AppShell portal={hasLeadAccess ? "lead" : "student"}>{children}</AppShell>;
}
