import { cookies } from "next/headers";
import { Suspense } from "react";
import { LEAD_ACCESS_COOKIE } from "@/lib/portal-config";
import { TeamAccessClient } from "./team-access-client";

export default async function TeamAccessPage() {
  const cookieStore = await cookies();
  const signedIn = cookieStore.get(LEAD_ACCESS_COOKIE)?.value === "1";

  return (
    <Suspense fallback={<p className="text-center text-sm text-muted-foreground py-10">Loading…</p>}>
      <TeamAccessClient signedIn={signedIn} />
    </Suspense>
  );
}
