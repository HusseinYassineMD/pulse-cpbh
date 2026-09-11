"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calendar, Send } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PlatformBadges } from "@/components/ui/platform-badges";
import { BestTimeWidget } from "@/components/scheduling/best-time-widget";

const PLATFORMS = ["instagram", "facebook", "linkedin"] as const;

export function SchedulePanel({
  postId,
  availablePlatforms,
  onScheduled,
}: {
  postId: string;
  availablePlatforms: string[];
  onScheduled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [datetime, setDatetime] = useState("");
  const [selected, setSelected] = useState<string[]>([...availablePlatforms]);
  const [error, setError] = useState("");
  const [publishResult, setPublishResult] = useState<string | null>(null);

  const schedule = useMutation({
    mutationFn: () =>
      api.schedule.create(postId, {
        scheduled_at: new Date(datetime).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        platform_targets: selected,
      }),
    onSuccess: () => {
      setOpen(false);
      setError("");
      onScheduled?.();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Schedule failed"),
  });

  const publishNow = useMutation({
    mutationFn: () => api.schedule.publishNow(postId, selected),
    onSuccess: (attempts) => {
      const ok = attempts.filter((a) => a.status === "success").length;
      setPublishResult(`Published to ${ok}/${attempts.length} platform(s)`);
      onScheduled?.();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Publish failed"),
  });

  function togglePlatform(p: string) {
    setSelected((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  if (availablePlatforms.length === 0) return null;

  return (
    <div className="pulse-card p-5 space-y-4">
      <h2 className="font-semibold flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        Schedule & Publish
      </h2>

      {publishResult && (
        <p className="text-sm text-teal bg-teal-light p-3 rounded-lg font-medium">{publishResult}</p>
      )}
      {error && <p className="text-sm text-primary bg-primary/10 p-3 rounded-lg">{error}</p>}

      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Platforms</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.filter((p) => availablePlatforms.includes(p)).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => togglePlatform(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-all border-2 ${
                selected.includes(p)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-teal/40"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <PlatformBadges platforms={selected} />
        </div>
      </div>

      {selected.length === 0 && (
        <p className="text-xs text-muted-foreground">Select at least one platform below to schedule or publish.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Pick date & time
        </button>
        <button
          onClick={() => publishNow.mutate()}
          disabled={publishNow.isPending || selected.length === 0}
          title={selected.length === 0 ? "Select at least one platform" : undefined}
          className="inline-flex items-center gap-2 px-4 py-2.5 btn-primary text-sm disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {publishNow.isPending ? "Publishing..." : "Publish now"}
        </button>
      </div>

      {open && (
        <div className="pt-3 border-t border-border space-y-3">
          <BestTimeWidget onPickTime={(t) => setDatetime(t)} />
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="flex-1 px-3 py-2.5 min-h-[44px] border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background w-full"
          />
          <button
            onClick={() => schedule.mutate()}
            disabled={!datetime || selected.length === 0 || schedule.isPending}
            className="px-5 py-2.5 min-h-[44px] btn-primary text-sm disabled:opacity-50 w-full sm:w-auto"
          >
            {schedule.isPending ? "Saving..." : "Confirm"}
          </button>
        </div>
        </div>
      )}
    </div>
  );
}
