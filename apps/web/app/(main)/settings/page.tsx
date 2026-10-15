"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Facebook, Instagram, Linkedin, Link2, Trash2, CheckCircle2, AlertCircle, Radio } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PlatformLabel } from "@/components/ui/platform-badges";

function SettingsPageContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [connecting, setConnecting] = useState<"meta" | "linkedin" | null>(null);

  const { data: accounts, isLoading, isError: accountsError } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.accounts.list(),
  });

  const { data: publishStatus } = useQuery({
    queryKey: ["publish-status"],
    queryFn: () => api.oauth.publishStatus(),
  });

  const disconnect = useMutation({
    mutationFn: (id: string) => api.accounts.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["publish-status"] });
    },
  });

  useEffect(() => {
    const oauth = searchParams.get("oauth");
    const ok = searchParams.get("ok");
    const err = searchParams.get("error");
    if (oauth === "meta" && ok) {
      setSuccess("Meta connected — Instagram and Facebook pages linked when available.");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    } else if (oauth === "linkedin" && ok) {
      setSuccess("LinkedIn organization connected.");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    } else if (err) {
      setError("Connection was cancelled or failed. Check app credentials in .env and try again.");
    }
  }, [searchParams, queryClient]);

  async function connectMeta() {
    setError("");
    setConnecting("meta");
    try {
      const { url } = await api.oauth.startMeta();
      window.location.href = url;
    } catch (e) {
      setConnecting(null);
      setError(e instanceof ApiError ? e.message : "Could not start Meta connection");
    }
  }

  async function connectLinkedIn() {
    setError("");
    setConnecting("linkedin");
    try {
      const { url } = await api.oauth.startLinkedIn();
      window.location.href = url;
    } catch (e) {
      setConnecting(null);
      setError(e instanceof ApiError ? e.message : "Could not start LinkedIn connection");
    }
  }

  const platformIcon = (p: string) => {
    if (p === "instagram") return Instagram;
    if (p === "facebook") return Facebook;
    return Linkedin;
  };

  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Publishing</p>
        <h1 className="text-3xl font-bold tracking-tight">Connected accounts</h1>
        <p className="text-muted-foreground mt-2">
          Authorize Pulse to publish on your behalf. Use <strong>Publish now</strong> on any approved post after
          connecting.
        </p>
      </div>

      {publishStatus && (
        <div
          className={`pulse-card p-5 space-y-3 border ${
            publishStatus.ready_for_live_publish ? "border-emerald-200 bg-emerald-50/40" : "border-border"
          }`}
        >
          <div className="flex items-start gap-3">
            <Radio
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                publishStatus.ready_for_live_publish ? "text-emerald-600" : "text-teal"
              }`}
            />
            <div className="text-sm space-y-2 min-w-0">
              <p className="font-semibold">
                {publishStatus.ready_for_live_publish
                  ? "Ready for live publishing"
                  : publishStatus.dry_run
                    ? "Dry-run mode (simulated publishes)"
                    : "Setup needed before live publish"}
              </p>
              {publishStatus.notes.map((note) => (
                <p key={note} className="text-muted-foreground leading-relaxed">
                  {note}
                </p>
              ))}
              <p className="text-xs text-muted-foreground font-mono break-all">
                Media URL base: {publishStatus.media_public_base}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="pulse-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          One-click connect
        </h2>
        <p className="text-sm text-muted-foreground">
          Sign in with the CPBH account that manages each channel. Pulse stores API tokens securely — not your
          password.
        </p>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        {success && (
          <p className="text-sm text-teal bg-teal/10 p-3 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={connectMeta}
            disabled={connecting !== null || publishStatus?.meta_configured === false}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium btn-primary disabled:opacity-50 flex-1"
          >
            <Instagram className="w-4 h-4" />
            {connecting === "meta" ? "Redirecting…" : "Connect Instagram & Facebook"}
          </button>
          <button
            type="button"
            onClick={connectLinkedIn}
            disabled={connecting !== null || publishStatus?.linkedin_configured === false}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium border border-border bg-white hover:bg-secondary disabled:opacity-50 flex-1"
          >
            <Linkedin className="w-4 h-4" />
            {connecting === "linkedin" ? "Redirecting…" : "Connect LinkedIn"}
          </button>
        </div>

        {(publishStatus?.meta_configured === false || publishStatus?.linkedin_configured === false) && (
          <div className="flex items-start gap-3 text-sm bg-secondary/50 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0" />
            <p className="text-muted-foreground leading-relaxed">
              Add Meta and LinkedIn app credentials to your local <code className="text-xs bg-white px-1 rounded">.env</code>{" "}
              (see <code className="text-xs bg-white px-1 rounded">.env.example</code>), restart the API, then use the
              buttons above.
            </p>
          </div>
        )}
      </div>

      <div className="pulse-card p-5 space-y-4">
        <h2 className="font-semibold">Active connections</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {accountsError && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Run <code className="text-xs bg-white/80 px-1 rounded">./start.sh api</code> locally for account linking and
            publishing.
          </p>
        )}
        {!isLoading && !accountsError && (!accounts || accounts.length === 0) && (
          <p className="text-sm text-muted-foreground">No accounts connected yet.</p>
        )}
        <div className="space-y-2">
          {accounts?.map((acct) => {
            const Icon = platformIcon(acct.platform);
            return (
              <div
                key={acct.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-secondary/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-5 h-5 text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{acct.account_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                      <PlatformLabel platform={acct.platform} />
                      <span className="font-mono truncate">{acct.account_id}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => disconnect.mutate(acct.id)}
                  disabled={disconnect.isPending}
                  className="p-2 text-muted-foreground hover:text-red-600 shrink-0"
                  title="Disconnect"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground p-4">Loading settings…</p>}>
      <SettingsPageContent />
    </Suspense>
  );
}
