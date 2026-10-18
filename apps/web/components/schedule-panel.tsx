"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PlatformBadges } from "@/components/ui/platform-badges";
import { BestTimeWidget } from "@/components/scheduling/best-time-widget";
import { celebrate } from "@/lib/celebrate";

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
      celebrate();
      onScheduled?.();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Schedule failed"),
  });

  function togglePlatform(p: string) {
    setSelected((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  if (availablePlatforms.length === 0) return null;

  return (
    <div className="pulse-card p-5 space-y-4">
      <h2 className="font-semibold flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        Schedule
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Choose where to post, then pick a date and time. Posts go out on that schedule only — not instantly.
      </p>

      {error && <p className="text-sm text-primary bg-primary/10 p-3 rounded-lg">{error}</p>}

      <div>
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Where to post</p>
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
        <p className="text-xs text-muted-foreground">Select at least one platform to schedule.</p>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={selected.length === 0}
        className="inline-flex items-center gap-2 px-4 py-2.5 btn-primary text-sm disabled:opacity-50"
      >
        <Calendar className="w-4 h-4" />
        Set date & time
      </button>

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
            {schedule.isPending ? "Scheduling…" : "Add to schedule"}
          </button>
        </div>
        </div>
      )}
    </div>
  );
}
