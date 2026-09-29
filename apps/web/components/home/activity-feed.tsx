"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Activity, ArrowRight } from "lucide-react";
import { buildActivityFeed } from "@/lib/activity-feed";
import type { Post } from "@/lib/types";
import type { ScheduleItem } from "@/lib/schedule-types";

const TONE: Record<string, string> = {
  teal: "bg-teal/10 text-teal border-teal/20",
  blue: "bg-sky/10 text-sky border-sky/20",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  gold: "bg-amber-50 text-amber-800 border-amber-200",
};

type Props = {
  posts: Post[];
  schedule: ScheduleItem[];
};

export function ActivityFeed({ posts, schedule }: Props) {
  const events = buildActivityFeed(posts, schedule);

  if (events.length === 0) return null;

  return (
    <section className="space-y-4 animate-stagger">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-0.5">Live activity</p>
          <h2 className="font-bold text-xl flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal" />
            Recent momentum
          </h2>
        </div>
      </div>

      <div className="pulse-card divide-y divide-border/60 overflow-hidden">
        {events.map((event) => {
          const body = (
            <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors">
              <span
                className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border ${TONE[event.tone]}`}
              >
                {event.title}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{event.detail}</p>
                <p className="text-xs text-muted-foreground">{safeWhen(event.at)}</p>
              </div>
              {event.href && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />}
            </div>
          );

          return event.href ? (
            <Link key={event.id} href={event.href}>
              {body}
            </Link>
          ) : (
            <div key={event.id}>{body}</div>
          );
        })}
      </div>
    </section>
  );
}

function safeWhen(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d · h:mm a");
  } catch {
    return "Recently";
  }
}
