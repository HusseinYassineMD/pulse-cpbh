import { addDays, format, isSameDay, parseISO, startOfDay } from "date-fns";
import { BEST_TIME_SLOTS } from "@/lib/insights";
import type { ScheduleItem } from "@/lib/schedule-types";

export type ContentGap = {
  date: Date;
  label: string;
  suggestion: string;
  reason: string;
};

export function findContentGaps(items: ScheduleItem[], horizonDays = 7): ContentGap[] {
  const today = startOfDay(new Date());
  const pending = items.filter((i) => i.status === "pending");
  const gaps: ContentGap[] = [];

  for (let offset = 0; offset < horizonDays; offset += 1) {
    const day = addDays(today, offset);
    const hasSlot = pending.some((item) => {
      try {
        return isSameDay(parseISO(item.scheduled_at), day);
      } catch {
        return false;
      }
    });
    if (hasSlot) continue;

    const dayName = format(day, "EEEE");
    const slot = BEST_TIME_SLOTS.find((s) => s.day === dayName) ?? BEST_TIME_SLOTS[0];
    gaps.push({
      date: day,
      label: format(day, "EEE, MMM d"),
      suggestion: `${slot.time}`,
      reason: slot.reason,
    });
  }

  return gaps;
}
