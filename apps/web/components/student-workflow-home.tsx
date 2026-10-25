"use client";

import Link from "next/link";
import { Lightbulb, Send } from "lucide-react";

export function StudentWorkflowHome() {
  return (
    <div className="max-w-lg mx-auto py-6 sm:py-10 space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">CPBH social posts</h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          Draft captions from hot topics, then send your Canva link and sources to Tiffany for review.
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
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Team lead?{" "}
        <Link href="/team" className="text-teal font-medium hover:underline">
          Lead sign-in
        </Link>
      </p>
    </div>
  );
}
