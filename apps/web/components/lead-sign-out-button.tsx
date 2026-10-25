"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";

type Props = {
  className?: string;
  variant?: "nav" | "chip" | "link";
};

export function LeadSignOutButton({ className = "", variant = "nav" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/team-access", { method: "DELETE" });
      router.replace("/ideate");
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={busy}
        className={
          className ||
          "inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        }
      >
        <LogOut className="w-4 h-4" aria-hidden />
        {busy ? "Signing out…" : "Sign out"}
      </button>
    );
  }

  if (variant === "chip") {
    return (
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={busy}
        className={
          className ||
          "text-[10px] font-semibold text-muted-foreground px-2 py-1 rounded-lg border border-border disabled:opacity-50"
        }
      >
        {busy ? "…" : "Sign out"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={busy}
      className={
        className ||
        "w-full flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors touch-manipulation disabled:opacity-50"
      }
    >
      <LogOut className="w-4 h-4 shrink-0" aria-hidden />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
