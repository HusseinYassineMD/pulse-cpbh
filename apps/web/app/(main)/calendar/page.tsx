"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, X, Clock, CheckCircle2, Radio } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { api } from "@/lib/api";
import { PlatformBadges } from "@/components/ui/platform-badges";
import { StatusBadge } from "@/components/ui/status-badge";

export default function CalendarPage() {
  const queryClient = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["schedule"],
    queryFn: () => api.schedule.list(),
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api.schedule.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const upcoming = items?.filter((i) => i.status === "pending") ?? [];
  const past = items?.filter((i) => i.status !== "pending") ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Publishing queue</p>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            Schedule
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-teal animate-pulse" />
            Auto-publishes every minute · dry-run mode
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="pulse-card-hover p-6 flex items-center gap-4 bg-gradient-to-br from-secondary/80 to-card">
          <div className="w-14 h-14 rounded-2xl bg-cyan/15 flex items-center justify-center">
            <Clock className="w-7 h-7 text-cyan" />
          </div>
          <div>
            <p className="text-4xl font-bold text-cyan tabular-nums">{upcoming.length}</p>
            <p className="text-sm text-muted-foreground font-medium">Upcoming posts</p>
          </div>
        </div>
        <div className="pulse-card-hover p-6 flex items-center gap-4 bg-gradient-to-br from-teal-light/80 to-card">
          <div className="w-14 h-14 rounded-2xl bg-teal/15 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-teal" />
          </div>
          <div>
            <p className="text-4xl font-bold text-teal tabular-nums">{past.length}</p>
            <p className="text-sm text-muted-foreground font-medium">Completed</p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="pulse-card h-20 animate-pulse bg-gray-100" />
          ))}
        </div>
      )}

      {!isLoading && upcoming.length === 0 && past.length === 0 && (
        <div className="pulse-card p-16 text-center">
          <Calendar className="w-12 h-12 mx-auto text-gray-200 mb-4" />
          <p className="text-muted-foreground">
            Nothing scheduled.{" "}
            <Link href="/posts" className="text-primary hover:underline font-semibold">
              Open a post
            </Link>
          </p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Upcoming</h2>
          {upcoming.map((item) => (
            <ScheduleRow key={item.id} item={item} onCancel={() => cancel.mutate(item.id)} />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">History</h2>
          {past.map((item) => (
            <ScheduleRow key={item.id} item={item} muted />
          ))}
        </section>
      )}
    </div>
  );
}

function ScheduleRow({
  item,
  onCancel,
  muted,
}: {
  item: import("@/lib/schedule-types").ScheduleItem;
  onCancel?: () => void;
  muted?: boolean;
}) {
  const dt = parseISO(item.scheduled_at);
  const overdue = isPast(dt) && item.status === "pending";

  return (
    <div className={`pulse-card-hover p-5 flex items-center gap-4 ${muted ? "opacity-75" : ""}`}>
      <div
        className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 font-bold text-sm leading-tight ${
          muted ? "bg-muted text-muted-foreground" : "bg-gradient-to-br from-teal to-cyan text-white shadow-md shadow-teal/15"
        }`}
      >
        <span className="text-[10px] uppercase opacity-80">{format(dt, "MMM")}</span>
        <span className="text-xl">{format(dt, "d")}</span>
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`/posts/${item.post_id}`}
          className="font-semibold hover:text-primary transition-colors block truncate"
        >
          {item.post_title}
        </Link>
        <p className="text-sm text-gray-400 mt-0.5">{format(dt, "EEEE · h:mm a")}</p>
        <div className="mt-2">
          <PlatformBadges platforms={item.platform_targets} size="md" />
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={overdue ? "pending" : item.status} />
        {overdue && (
          <span className="text-[10px] font-bold uppercase text-amber-600">overdue</span>
        )}
        {onCancel && item.status === "pending" && (
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
