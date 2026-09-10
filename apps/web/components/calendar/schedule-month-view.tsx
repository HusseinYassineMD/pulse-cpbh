"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ScheduleItem } from "@/lib/schedule-types";

type Props = {
  items: ScheduleItem[];
};

export function ScheduleMonthView({ items }: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const pending = useMemo(() => items.filter((i) => i.status === "pending"), [items]);

  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of pending) {
      try {
        const key = format(parseISO(item.scheduled_at), "yyyy-MM-dd");
        const list = map.get(key) ?? [];
        list.push(item);
        map.set(key, list);
      } catch {
        /* skip */
      }
    }
    return map;
  }, [pending]);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="pulse-card p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-lg">{format(cursor, "MMMM yyyy")}</h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl border border-border hover:bg-secondary"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 mx-auto" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(() => startOfMonth(new Date()))}
            className="px-3 py-2 text-xs font-medium rounded-xl border border-border hover:bg-secondary"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl border border-border hover:bg-secondary"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 mx-auto" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px text-center text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayItems = byDay.get(key) ?? [];
          const inMonth = isSameMonth(day, cursor);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={key}
              className={`min-h-[72px] sm:min-h-[88px] rounded-xl border p-1.5 sm:p-2 text-left transition-colors ${
                inMonth ? "bg-white/60 border-border/70" : "bg-secondary/30 border-transparent opacity-50"
              } ${isToday ? "ring-2 ring-teal/40 border-teal/30" : ""}`}
            >
              <span
                className={`text-xs font-semibold tabular-nums ${
                  isToday ? "text-teal" : inMonth ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {format(day, "d")}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayItems.slice(0, 2).map((item) => (
                  <Link
                    key={item.id}
                    href={`/posts/${item.post_id}`}
                    className="block text-[9px] sm:text-[10px] leading-tight truncate px-1 py-0.5 rounded bg-teal/15 text-teal font-medium hover:bg-teal/25"
                    title={item.post_title}
                  >
                    {format(parseISO(item.scheduled_at), "h:mm a")} · {item.post_title}
                  </Link>
                ))}
                {dayItems.length > 2 && (
                  <p className="text-[9px] text-muted-foreground px-1">+{dayItems.length - 2} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        {pending.length} upcoming post{pending.length === 1 ? "" : "s"} this month view · click a slot to open the post
      </p>
    </div>
  );
}
