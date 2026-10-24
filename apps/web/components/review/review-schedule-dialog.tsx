"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Calendar, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { celebrate } from "@/lib/celebrate";
import { SUBMIT_PLATFORMS } from "@/lib/submit-platforms";

type Props = {
  postId: string;
  defaultPlatforms: string[];
  open: boolean;
  onClose: () => void;
  onDone: () => void;
};

export function ReviewScheduleDialog({ postId, defaultPlatforms, open, onClose, onDone }: Props) {
  const [datetime, setDatetime] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(
    defaultPlatforms.length ? defaultPlatforms : ["instagram", "facebook", "linkedin"]
  );
  const [error, setError] = useState("");

  const run = useMutation({
    mutationFn: async () => {
      if (!datetime) throw new ApiError(400, "Pick a date and time.");
      if (platforms.length === 0) throw new ApiError(400, "Pick at least one platform.");
      await api.posts.approve(postId);
      await api.schedule.create(postId, {
        scheduled_at: new Date(datetime).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        platform_targets: platforms,
      });
    },
    onSuccess: () => {
      celebrate();
      onDone();
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not schedule"),
  });

  if (!open) return null;

  function togglePlatform(id: string) {
    setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-xl p-5 space-y-4 animate-fade-in">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal" />
              Approve &amp; schedule
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Stephanie picks platforms and time — the post moves to Schedule immediately.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Platforms</p>
          <div className="flex flex-wrap gap-2">
            {SUBMIT_PLATFORMS.map(({ id, label }) => {
              const on = platforms.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => togglePlatform(id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border-2 ${
                    on ? "border-teal bg-teal/10 text-teal" : "border-border text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium">Date &amp; time</span>
          <input
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            className="form-input mt-1.5 w-full"
          />
        </label>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium">
            Cancel
          </button>
          <button
            type="button"
            disabled={run.isPending}
            onClick={() => run.mutate()}
            className="flex-1 py-3 rounded-xl btn-primary text-sm font-semibold"
          >
            {run.isPending ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
