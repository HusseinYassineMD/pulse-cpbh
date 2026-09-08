"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Instagram, Link2, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [platform, setPlatform] = useState("instagram");
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.accounts.list(),
  });

  const connect = useMutation({
    mutationFn: () =>
      api.accounts.connect({
        platform,
        account_id: accountId.trim(),
        account_name: accountName.trim() || "Test account",
        access_token: accessToken.trim(),
      }),
    onSuccess: () => {
      setSuccess(`${platform} account connected.`);
      setError("");
      setAccessToken("");
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (err) => {
      setSuccess("");
      setError(err instanceof ApiError ? err.message : "Failed to connect account");
    },
  });

  const disconnect = useMutation({
    mutationFn: (id: string) => api.accounts.disconnect(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  return (
    <div className="max-w-2xl space-y-8 animate-fade-in">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Testing setup</p>
        <h1 className="text-3xl font-bold tracking-tight">Connect accounts</h1>
        <p className="text-muted-foreground mt-2">
          Link a test Instagram account here before touching CPBH&apos;s official pages.
        </p>
      </div>

      <div className="pulse-card p-5 space-y-3 bg-teal/5 border-teal/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-teal shrink-0 mt-0.5" />
          <div className="text-sm space-y-2">
            <p className="font-medium text-teal">For a real Instagram test publish:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Use an Instagram <strong>Business or Creator</strong> account linked to a Facebook Page</li>
              <li>Create a Meta Developer app and get a Page access token</li>
              <li>Expose your API with ngrok: <code className="text-xs bg-white/60 px-1 rounded">ngrok http 8010</code></li>
              <li>Set <code className="text-xs bg-white/60 px-1 rounded">API_URL</code> in <code className="text-xs bg-white/60 px-1 rounded">.env</code> to your ngrok URL</li>
              <li>Set <code className="text-xs bg-white/60 px-1 rounded">PUBLISH_DRY_RUN=false</code> and restart the API</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="pulse-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          Connect account
        </h2>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        {success && (
          <p className="text-sm text-teal bg-teal/10 p-3 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </p>
        )}

        <div className="grid gap-3">
          <label className="text-sm">
            <span className="text-muted-foreground">Platform</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="text-muted-foreground">Account ID (IG Business Account ID)</span>
            <input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="17841400000000000"
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background font-mono text-sm"
            />
          </label>

          <label className="text-sm">
            <span className="text-muted-foreground">Display name</span>
            <input
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="My test IG"
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
          </label>

          <label className="text-sm">
            <span className="text-muted-foreground">Access token</span>
            <textarea
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Paste Page access token from Meta Graph API Explorer"
              rows={3}
              className="mt-1 w-full px-3 py-2 border border-border rounded-lg bg-background font-mono text-xs"
            />
          </label>

          <button
            onClick={() => connect.mutate()}
            disabled={connect.isPending || !accountId.trim() || !accessToken.trim()}
            className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {connect.isPending ? "Connecting..." : "Connect account"}
          </button>
        </div>
      </div>

      <div className="pulse-card p-5 space-y-4">
        <h2 className="font-semibold">Connected accounts</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!isLoading && (!accounts || accounts.length === 0) && (
          <p className="text-sm text-muted-foreground">No accounts connected yet.</p>
        )}
        <div className="space-y-2">
          {accounts?.map((acct) => (
            <div
              key={acct.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-secondary/40"
            >
              <div className="flex items-center gap-3">
                <Instagram className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">{acct.account_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {acct.platform} · {acct.account_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => disconnect.mutate(acct.id)}
                disabled={disconnect.isPending}
                className="p-2 text-muted-foreground hover:text-red-600"
                title="Disconnect"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
