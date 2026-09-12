"use client";

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  BEST_TIME_SLOTS,
  HEATMAP_DAYS,
  HEATMAP_HOURS,
  buildEngagementHeatmap,
  heatmapCellTitle,
  heatmapScoreColor,
  localDatetimeFromHeatmapCell,
} from "@/lib/insights";
import type { ScheduleItem } from "@/lib/schedule-types";

type Props = {
  scheduleItems?: ScheduleItem[];
  onPickTime?: (isoLocal: string) => void;
};

function formatHourShort(hour: number): string {
  if (hour === 12) return "12p";
  if (hour > 12) return `${hour - 12}p`;
  return `${hour}a`;
}

export function BestTimeHeatmap({ scheduleItems = [], onPickTime }: Props) {
  const grid = useMemo(() => buildEngagementHeatmap(scheduleItems), [scheduleItems]);
  const [picked, setPicked] = useState<string | null>(null);

  const topSlot = BEST_TIME_SLOTS[0];

  return (
    <div className="pulse-card p-4 sm:p-5 space-y-4 border border-teal/15 bg-teal/[0.03]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal shrink-0" />
            <h3 className="font-semibold text-sm">Weekly engagement heatmap</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-xl">
            Darker teal = stronger windows for CPBH health content. Top pick:{" "}
            <strong className="text-foreground font-medium">
              {topSlot.day} {topSlot.time}
            </strong>
            {onPickTime ? " — tap a cell to pre-fill reschedule." : "."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-secondary/80 border border-border/60" /> Low
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-teal/40" /> Good
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-teal" /> Best
          </span>
        </div>
      </div>

      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="min-w-[520px]">
          <div
            className="grid gap-0.5 mb-0.5"
            style={{ gridTemplateColumns: `2.5rem repeat(${HEATMAP_HOURS.length}, minmax(0, 1fr))` }}
          >
            <div />
            {HEATMAP_HOURS.map((hour) => (
              <div
                key={hour}
                className="text-[9px] sm:text-[10px] text-muted-foreground text-center font-medium tabular-nums"
              >
                {hour % 3 === 0 ? formatHourShort(hour) : ""}
              </div>
            ))}
          </div>

          {HEATMAP_DAYS.map((day, dayIdx) => (
            <div
              key={day}
              className="grid gap-0.5 mb-0.5"
              style={{ gridTemplateColumns: `2.5rem repeat(${HEATMAP_HOURS.length}, minmax(0, 1fr))` }}
            >
              <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground flex items-center pr-1">
                {day}
              </div>
              {HEATMAP_HOURS.map((hour, hourIdx) => {
                const score = grid[dayIdx][hourIdx];
                const title = heatmapCellTitle(dayIdx, hour, score);
                const isTop = score >= 88;
                return (
                  <button
                    key={`${day}-${hour}`}
                    type="button"
                    disabled={!onPickTime}
                    title={title}
                    aria-label={title}
                    onClick={() => {
                      if (!onPickTime) return;
                      const local = localDatetimeFromHeatmapCell(dayIdx, hour);
                      onPickTime(local);
                      setPicked(`${day} ${formatHourShort(hour)}`);
                      window.setTimeout(() => setPicked(null), 2500);
                    }}
                    className={`aspect-square min-h-[22px] rounded-md transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring ${heatmapScoreColor(score)} ${
                      isTop ? "ring-1 ring-teal/50 shadow-sm" : ""
                    } ${onPickTime ? "cursor-pointer" : "cursor-default"}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {picked && (
        <p className="text-xs text-teal font-medium">Selected {picked} — applied to reschedule picker below.</p>
      )}
    </div>
  );
}
