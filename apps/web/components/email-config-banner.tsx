"use client";

import { useQuery } from "@tanstack/react-query";
import { MailWarning } from "lucide-react";
import { api } from "@/lib/api";

/** Shown on Review when the API cannot send lead notification emails. */
export function EmailConfigBanner() {
  const { data, isLoading } = useQuery({
    queryKey: ["notifications", "email-status"],
    queryFn: () => api.notifications.emailStatus(),
    staleTime: 60_000,
  });

  if (isLoading || !data || data.ready) return null;

  return (
    <div
      className="flex gap-3 text-sm text-amber-950 bg-amber-50 border border-amber-200/80 px-4 py-3 rounded-xl leading-relaxed"
      role="status"
    >
      <MailWarning className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" aria-hidden />
      <div>
        <p className="font-semibold">Email alerts are off</p>
        <p className="text-amber-900/90 mt-1">{data.hint}</p>
        <p className="text-xs text-amber-800/80 mt-2">
          {!data.review_lead_email_set
            ? "Set REVIEW_LEAD_EMAIL on pulse-cpbh-api (Render), then redeploy."
            : !data.resend_configured
              ? "Lead email is set — add RESEND_API_KEY on pulse-cpbh-api (from resend.com), Save, redeploy."
              : "Drafts still save here — check this page after students submit until mail is configured."}
        </p>
      </div>
    </div>
  );
}
