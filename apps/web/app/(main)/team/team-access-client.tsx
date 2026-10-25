"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, ClipboardCheck, Lock } from "lucide-react";
import Link from "next/link";
import { safeLeadReturnPath } from "@/lib/portal-config";
import { LeadSignOutButton } from "@/components/lead-sign-out-button";

type Props = {
  signedIn: boolean;
};

export function TeamAccessClient({ signedIn }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const blocked = searchParams.get("blocked") === "lead";
  const returnTo = safeLeadReturnPath(searchParams.get("next"));
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/team-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) {
        setError(data.detail || "Incorrect team code");
        return;
      }
      router.replace(returnTo);
      router.refresh();
    } catch {
      setError("Network error — try again.");
    } finally {
      setLoading(false);
    }
  }

  if (signedIn) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-teal/15 text-teal flex items-center justify-center mx-auto">
            <ClipboardCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold">Lead access active</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Review and Schedule are unlocked in this browser until you sign out or close the window.
          </p>
        </div>

        <div className="pulse-card p-5 space-y-3">
          <Link
            href="/review"
            className="btn-primary w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <ClipboardCheck className="w-4 h-4" aria-hidden />
            Open Review
          </Link>
          <Link
            href="/calendar"
            className="w-full py-3 rounded-xl font-semibold border border-border bg-white hover:bg-secondary flex items-center justify-center gap-2 transition-colors"
          >
            <Calendar className="w-4 h-4" aria-hidden />
            Open Schedule
          </Link>
        </div>

        <div className="flex flex-col items-center gap-3 text-sm">
          <LeadSignOutButton variant="link" />
          <Link href="/ideate" className="text-muted-foreground hover:text-teal">
            Back to Ideation
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-10 space-y-6 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-teal/15 text-teal flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold">Lead sign-in</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          CPBH leads only. Enter the team code to unlock Review and Schedule for this browser session.
        </p>
      </div>

      {blocked && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
          Sign in to continue to{" "}
          {returnTo === "/calendar" ? "Schedule" : returnTo === "/review" ? "Review" : "that page"}.
        </p>
      )}

      <form onSubmit={unlock} className="pulse-card p-5 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Team code</span>
          <input
            type="password"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="form-input mt-1.5 w-full text-base py-3"
            placeholder="From your CPBH lead"
          />
        </label>
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading || !pin.trim()}
          className="btn-primary w-full py-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? "Checking…" : "Sign in"}
        </button>
      </form>

      <p className="text-center text-sm">
        <Link href="/ideate" className="text-teal font-medium hover:underline">
          Continue as student → Ideation
        </Link>
      </p>
    </div>
  );
}
