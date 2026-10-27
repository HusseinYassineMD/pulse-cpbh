"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, CheckCircle2, Radio, Trash2 } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { api, ApiError } from "@/lib/api";
import { PlatformBadges } from "@/components/ui/platform-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ScheduleItem } from "@/lib/schedule-types";
import { postPageHref } from "@/lib/post-url";
import type { Post } from "@/lib/types";
import { ScheduleMonthView } from "@/components/calendar/schedule-month-view";
import { BestTimeHeatmap } from "@/components/scheduling/best-time-heatmap";
import { BestTimeWidget } from "@/components/scheduling/best-time-widget";
import { ContentGapWidget } from "@/components/scheduling/content-gap-widget";
import { ModalSheet } from "@/components/ui/modal-sheet";
import { isSimpleUi } from "@/lib/simple-ui";

type ScheduleView = "queue" | "calendar";

function CalendarPageInner() {
  const searchParams = useSearchParams();
  const highlightPostId = searchParams.get("post")?.trim() || "";
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [removeTarget, setRemoveTarget] = useState<ScheduleItem | null>(null);
  const [view, setView] = useState<ScheduleView>("queue");
  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduleItem | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState("");
  const simple = isSimpleUi();

  const { data: items, isLoading } = useQuery({
    queryKey: ["schedule"],
    queryFn: () => api.schedule.list(),
  });

  const { data: approvedData, isLoading: approvedLoading } = useQuery({
    queryKey: ["posts", "approved-for-schedule"],
    queryFn: () => api.posts.list({ status: "approved", limit: 50 }),
    enabled: !simple,
  });
  const needsTime: Post[] = simple ? [] : (approvedData?.items ?? []);

  useEffect(() => {
    if (!highlightPostId || needsTime.length === 0) return;
    const t = window.setTimeout(() => {
      document.getElementById(`schedule-pick-${highlightPostId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 200);
    return () => window.clearTimeout(t);
  }, [highlightPostId, needsTime.length]);

  const cancel = useMutation({
    mutationFn: ({ id, revert }: { id: string; revert: boolean }) =>
      api.schedule.cancel(id).then(() => ({ revert })),
    onSuccess: ({ revert }) => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setRemoveTarget(null);
      setMsg(
        revert
          ? "Removed from schedule — item is back in Plan work queue"
          : "Removed from history"
      );
      setError("");
      setTimeout(() => setMsg(""), 5000);
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      setRemoveTarget(null);
      setError(err instanceof ApiError ? err.message : "Could not remove from schedule");
      setTimeout(() => setError(""), 5000);
    },
  });

  const reschedule = useMutation({
    mutationFn: ({ id, scheduled_at }: { id: string; scheduled_at: string }) =>
      api.schedule.update(id, { scheduled_at }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      setRescheduleTarget(null);
      setRescheduleAt("");
      setMsg("Schedule updated");
      setTimeout(() => setMsg(""), 4000);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Could not reschedule");
      setTimeout(() => setError(""), 5000);
    },
  });

  const upcoming = items?.filter((i) => i.status === "pending") ?? [];
  const past = items?.filter((i) => i.status !== "pending") ?? [];

  function confirmRemove(item: ScheduleItem) {
    cancel.mutate({ id: item.id, revert: item.status === "pending" });
  }

  function handleHeatmapPick(local: string) {
    setRescheduleAt(local);
    const first = upcoming[0];
    if (first) {
      setRescheduleTarget(first);
      setMsg(`Reschedule “${first.post_title}” to your picked slot`);
      setTimeout(() => setMsg(""), 4000);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Publishing queue</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Calendar className="w-8 h-8 text-primary" />
            Schedule
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-teal animate-pulse" />
            Approve in Review → pick a date here → then it appears in Upcoming
          </p>
        </div>
      </div>

      {msg && (
        <p className="text-sm px-4 py-2.5 rounded-xl border text-teal-700 bg-teal-50 border-teal-200">
          {msg}
        </p>
      )}
      {error && (
        <p className="text-sm px-4 py-2.5 rounded-xl border text-red-700 bg-red-50 border-red-200">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-border p-1 bg-secondary/50">
          <button
            type="button"
            onClick={() => setView("queue")}
            className={`px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-colors ${
              view === "queue" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            Queue
          </button>
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={`px-4 py-2 min-h-[40px] rounded-lg text-sm font-medium transition-colors ${
              view === "calendar" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground"
            }`}
          >
            Calendar
          </button>
        </div>
        <BestTimeWidget compact />
      </div>

      {items && <ContentGapWidget items={items} />}

      {view === "calendar" && items && <ScheduleMonthView items={items} />}

      <BestTimeHeatmap
        scheduleItems={items ?? []}
        onPickTime={upcoming.length > 0 ? handleHeatmapPick : undefined}
      />

      {view === "queue" && (
      <>
      {!simple && !approvedLoading && needsTime.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-teal uppercase tracking-widest">Pick a date (approved)</h2>
          {needsTime.map((post) => (
            <Link
              key={post.id}
              id={post.id === highlightPostId ? `schedule-pick-${post.id}` : undefined}
              href={postPageHref(post.id, "schedule")}
              className={`pulse-card block p-5 transition-colors ${
                post.id === highlightPostId ? "border-2 border-teal/40 bg-teal/[0.04]" : "hover:border-teal/25"
              }`}
            >
              <p className="font-semibold truncate">{post.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {post.variants[0]?.caption || "No caption"}
              </p>
              <p className="text-xs text-teal font-medium mt-2">Choose platforms & time →</p>
            </Link>
          ))}
        </section>
      )}

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

      {!isLoading && !approvedLoading && upcoming.length === 0 && past.length === 0 && needsTime.length === 0 && (
        <div className="pulse-card p-16 text-center">
          <Calendar className="w-12 h-12 mx-auto text-gray-200 mb-4" />
          <p className="text-muted-foreground">
            Nothing scheduled yet. In{" "}
            <Link href="/review" className="text-primary hover:underline font-semibold">
              Review
            </Link>
            , use <strong>Approve &amp; schedule</strong> to set platforms and date (lead only).
          </p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Upcoming</h2>
          {upcoming.map((item) => (
            <ScheduleRow
              key={item.id}
              item={item}
              onRemove={() => setRemoveTarget(item)}
              onReschedule={() => {
                setRescheduleTarget(item);
                setRescheduleAt(format(parseISO(item.scheduled_at), "yyyy-MM-dd'T'HH:mm"));
              }}
            />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">History</h2>
          {past.map((item) => (
            <ScheduleRow
              key={item.id}
              item={item}
              muted
              onRemove={() => setRemoveTarget(item)}
            />
          ))}
        </section>
      )}
      </>
      )}

      <ModalSheet
        open={!!rescheduleTarget}
        title="Reschedule"
        onClose={() => {
          setRescheduleTarget(null);
          setRescheduleAt("");
        }}
      >
        {rescheduleTarget && (
          <>
            <p className="text-sm text-muted-foreground">{rescheduleTarget.post_title}</p>
            <input
              type="datetime-local"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm"
            />
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setRescheduleTarget(null);
                  setRescheduleAt("");
                }}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-secondary min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rescheduleAt || reschedule.isPending}
                onClick={() =>
                  reschedule.mutate({
                    id: rescheduleTarget.id,
                    scheduled_at: new Date(rescheduleAt).toISOString(),
                  })
                }
                className="px-4 py-2.5 rounded-lg text-sm font-medium btn-primary disabled:opacity-50 min-h-[44px]"
              >
                {reschedule.isPending ? "Saving…" : "Save new time"}
              </button>
            </div>
          </>
        )}
      </ModalSheet>

      <ModalSheet
        open={!!removeTarget}
        title={
          removeTarget?.status === "pending" ? "Remove from schedule?" : "Remove from history?"
        }
        onClose={() => setRemoveTarget(null)}
      >
        {removeTarget && (
          <>
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{removeTarget.post_title}</strong>
              {removeTarget.status === "pending" ? (
                <>
                  {" "}
                  will be removed from Schedule and returned to the <strong>Plan work queue</strong> so you can
                  edit and send again.
                </>
              ) : (
                <> will be cleared from your history list.</>
              )}
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-secondary min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmRemove(removeTarget)}
                disabled={cancel.isPending}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 min-h-[44px]"
              >
                {cancel.isPending ? "Removing…" : "Yes, remove"}
              </button>
            </div>
          </>
        )}
      </ModalSheet>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground p-6">Loading schedule…</p>}>
      <CalendarPageInner />
    </Suspense>
  );
}

function ScheduleRow({
  item,
  onRemove,
  onReschedule,
  muted,
}: {
  item: ScheduleItem;
  onRemove?: () => void;
  onReschedule?: () => void;
  muted?: boolean;
}) {
  const dt = parseISO(item.scheduled_at);
  const overdue = isPast(dt) && item.status === "pending";

  return (
    <div className={`pulse-card-hover p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${muted ? "opacity-75" : ""}`}>
      <div className="flex items-center gap-4 flex-1 min-w-0">
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
            className="font-semibold block break-words leading-snug hover:text-primary transition-colors"
          >
            {item.post_title}
          </Link>
          {item.content_idea_id && (
            <p className="text-[11px] text-primary/80 mt-0.5">From Plan board</p>
          )}
          <p className="text-sm text-gray-400 mt-0.5">{format(dt, "EEEE · h:mm a")}</p>
          <div className="mt-2">
            <PlatformBadges platforms={item.platform_targets} size="md" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <StatusBadge status={overdue ? "pending" : item.status} />
        {overdue && (
          <span className="text-[10px] font-bold uppercase text-amber-600">overdue</span>
        )}
        {onReschedule && item.status === "pending" && (
          <button
            type="button"
            onClick={onReschedule}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border hover:bg-secondary min-h-[40px]"
          >
            <Clock className="w-3.5 h-3.5" />
            Reschedule
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 min-h-[40px]"
            title={item.status === "pending" ? "Remove and revert to Plan" : "Remove from history"}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
