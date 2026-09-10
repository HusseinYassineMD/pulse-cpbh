"use client";

import { Clock, Sparkles } from "lucide-react";
import { BEST_TIME_SLOTS, nextBestSlotLabel } from "@/lib/insights";

type Props = {
  onPickTime?: (isoLocal: string) => void;
  compact?: boolean;
};

/** Suggest Buffer-style posting windows; optional callback sets datetime-local value. */
export function BestTimeWidget({ onPickTime, compact }: Props) {
  const applySlot = (dayName: string, timeLabel: string) => {
    if (!onPickTime) return;
    const dayMap: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    const targetDay = dayMap[dayName.split(" ")[0]] ?? 2;
    const now = new Date();
    const current = now.getDay();
    let delta = targetDay - current;
    if (delta <= 0) delta += 7;
    const d = new Date(now);
    d.setDate(d.getDate() + delta);
    const match = timeLabel.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const pm = match[3].toUpperCase() === "PM";
      if (pm && h < 12) h += 12;
      if (!pm && h === 12) h = 0;
      d.setHours(h, m, 0, 0);
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    onPickTime(local);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground pulse-card px-3 py-2">
        <Sparkles className="w-3.5 h-3.5 text-teal shrink-0" />
        <span>
          Best slot: <strong className="text-foreground font-medium">{nextBestSlotLabel()}</strong>
        </span>
      </div>
    );
  }

  return (
    <div className="pulse-card p-4 space-y-3 border border-teal/15 bg-teal/[0.03]">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-teal" />
        <h3 className="font-semibold text-sm">Best times to post</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Recommended windows for CPBH health content — tap to fill the scheduler.
      </p>
      <ul className="space-y-2">
        {BEST_TIME_SLOTS.map((slot) => (
          <li key={`${slot.day}-${slot.time}`}>
            <button
              type="button"
              disabled={!onPickTime}
              onClick={() => applySlot(slot.day, slot.time)}
              className="w-full text-left rounded-xl border border-border/80 bg-white/70 px-3 py-2.5 hover:border-teal/40 hover:bg-teal/5 transition-colors disabled:cursor-default disabled:hover:bg-white/70"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {slot.day} · {slot.time}
                </span>
                <span className="text-[10px] font-bold tabular-nums px-2 py-0.5 rounded-full bg-teal/15 text-teal">
                  {slot.score}%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{slot.reason}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
