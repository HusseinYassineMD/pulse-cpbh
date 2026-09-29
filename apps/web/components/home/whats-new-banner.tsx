"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { RELEASE_LABEL, RELEASE_NOTES, whatsNewStorageKey } from "@/lib/release-notes";

export function WhatsNewBanner() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOpen(localStorage.getItem(whatsNewStorageKey()) !== "dismissed");
  }, []);

  function dismiss() {
    localStorage.setItem(whatsNewStorageKey(), "dismissed");
    setOpen(false);
  }

  if (!mounted || !open) return null;

  return (
    <section className="pulse-card overflow-hidden border border-teal/25 bg-gradient-to-br from-teal/[0.06] via-white to-cyan/[0.04] animate-fade-in">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-teal/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-teal" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal mb-1">
                What&apos;s new · {RELEASE_LABEL}
              </p>
              <h2 className="font-bold text-lg leading-snug">Team update — {RELEASE_NOTES.length} improvements</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Planning, preview, and publishing updates for CPBH social workflow. Open the app to try each item below.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0"
            aria-label="Dismiss what's new"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {RELEASE_NOTES.map((note) => (
            <div key={note.title} className="rounded-xl border border-border/80 bg-white/80 px-4 py-3">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal/10 text-teal mb-2">
                {note.tag}
              </span>
              <p className="font-semibold text-sm">{note.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{note.description}</p>
              <p className="text-[11px] text-teal/90 mt-2 font-medium">{note.tryIt}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-border/60">
          <Link
            href="/ideas"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:underline"
          >
            Try trend → Studio
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            See content gaps
            <ChevronRight className="w-4 h-4" />
          </Link>
          <button type="button" onClick={dismiss} className="text-sm text-muted-foreground hover:text-foreground ml-auto">
            Got it
          </button>
        </div>
      </div>
    </section>
  );
}
