"use client";

import Link from "next/link";
import { Calendar, ClipboardCheck, Lightbulb, Send } from "lucide-react";

export function WorkflowHome() {
  return (
    <div className="max-w-lg mx-auto py-6 sm:py-10 space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">CPBH social posts</h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Ideate → send draft → lead reviews &amp; schedules. Nothing goes live until Tiffany approves a time and platform.
        </p>
      </div>

      <div className="space-y-3">
        <Link
          href="/ideate"
          className="pulse-card block p-6 sm:p-7 hover:border-primary/20 transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 1</p>
              <p className="text-lg font-bold mt-0.5">Ideation</p>
              <p className="text-sm text-muted-foreground mt-1">Hot topics and caption drafts from your notes.</p>
            </div>
          </div>
        </Link>

        <Link
          href="/submit"
          className="pulse-card block p-6 sm:p-7 border-2 border-teal/25 bg-teal/[0.04] hover:border-teal/40 transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal text-white flex items-center justify-center shrink-0">
              <Send className="w-6 h-6" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal">Step 2</p>
              <p className="text-lg font-bold mt-0.5">Send a draft</p>
              <p className="text-sm text-muted-foreground mt-1">Caption, Canva/Drive link, sources — get a ticket ID.</p>
            </div>
          </div>
        </Link>

        <Link
          href="/review"
          className="pulse-card block p-6 sm:p-7 hover:border-primary/20 transition-colors"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step 3 · Lead</p>
              <p className="text-lg font-bold mt-0.5">Review &amp; schedule</p>
              <p className="text-sm text-muted-foreground mt-1">Approve with time &amp; platforms, or delete.</p>
            </div>
          </div>
        </Link>

        <Link
          href="/calendar"
          className="flex items-center justify-center gap-2 py-3 text-sm font-medium text-muted-foreground hover:text-primary"
        >
          <Calendar className="w-4 h-4" />
          See scheduled posts
        </Link>
      </div>
    </div>
  );
}
