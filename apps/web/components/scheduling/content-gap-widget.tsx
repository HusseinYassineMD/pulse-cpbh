"use client";

import Link from "next/link";
import { CalendarOff, Sparkles } from "lucide-react";
import { findContentGaps } from "@/lib/content-gaps";
import type { ScheduleItem } from "@/lib/schedule-types";

export function ContentGapWidget({ items }: { items: ScheduleItem[] }) {
  const gaps = findContentGaps(items, 7);

  if (gaps.length === 0) {
    return (
      <div className="pulse-card p-4 border border-emerald-200/80 bg-emerald-50/50 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <p className="font-semibold text-sm text-emerald-900">Week is fully booked</p>
          <p className="text-xs text-emerald-800/80">Every day in the next 7 days has at least one scheduled post.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="pulse-card p-5 border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-white space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
          <CalendarOff className="w-5 h-5 text-amber-700" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-800 mb-1">Content gaps</p>
          <h2 className="font-bold text-lg">
            {gaps.length} open day{gaps.length === 1 ? "" : "s"} this week
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Fill empty slots with your best-performing times — keeps the feed consistent.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {gaps.slice(0, 6).map((gap) => (
          <div key={gap.label} className="rounded-xl border border-border/80 bg-white px-3 py-2.5">
            <p className="font-semibold text-sm">{gap.label}</p>
            <p className="text-xs text-teal font-medium mt-0.5">Suggested · {gap.suggestion}</p>
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{gap.reason}</p>
          </div>
        ))}
      </div>

      <Link href="/studio" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:underline">
        Create content for an open slot →
      </Link>
    </section>
  );
}
