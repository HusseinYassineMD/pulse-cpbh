import { format, parseISO } from "date-fns";
import type { ScheduleItem } from "./schedule-types";

/** Buffer-style best-time slots for health/education social (heuristic). */
export const BEST_TIME_SLOTS = [
  { day: "Tuesday", time: "10:00 AM", score: 92, reason: "Strong weekday engagement for health content" },
  { day: "Thursday", time: "2:00 PM", score: 88, reason: "Afternoon scroll peak on LinkedIn & Instagram" },
  { day: "Wednesday", time: "9:00 AM", score: 85, reason: "Morning commute + inbox check window" },
  { day: "Friday", time: "11:00 AM", score: 80, reason: "Pre-weekend community sharing" },
];

export const BRAND_HASHTAGS = [
  "#BrainHealth",
  "#USCCPBH",
  "#AlzheimersPrevention",
  "#CognitiveHealth",
  "#Neuroscience",
  "#HealthyAging",
  "#USC",
];

export function postsByMonth(
  dates: string[]
): { month: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const iso of dates) {
    try {
      const key = format(parseISO(iso), "MMM yyyy");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    } catch {
      /* skip */
    }
  }
  return Array.from(counts.entries())
    .map(([month, count]) => ({ month, count }))
    .slice(-6);
}

export function platformMix(platforms: string[]): { name: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const p of platforms) {
    const key = p.charAt(0).toUpperCase() + p.slice(1);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
}

export function scheduleHeatHint(items: ScheduleItem[]): string {
  if (!items.length) return "Schedule a few posts to unlock timing insights.";
  const hours = items.map((i) => parseISO(i.scheduled_at).getHours());
  const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
  if (avg < 12) return "Your queue leans morning — great for education posts.";
  if (avg >= 17) return "Your queue leans evening — strong for community engagement.";
  return "Your queue is spread across the day — balanced reach.";
}

export function nextBestSlotLabel(): string {
  const slot = BEST_TIME_SLOTS[0];
  return `${slot.day} · ${slot.time}`;
}

export const HEATMAP_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Hour blocks shown on the heatmap (6 AM – 8 PM). */
export const HEATMAP_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;

const DAY_NAME_TO_INDEX: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

function parseTimeLabelHour(timeLabel: string): number {
  const match = timeLabel.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 10;
  let h = parseInt(match[1], 10);
  const pm = match[3].toUpperCase() === "PM";
  if (pm && h < 12) h += 12;
  if (!pm && h === 12) h = 0;
  return h;
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

/** Heuristic engagement grid for CPBH health content (Mon=0 … Sun=6). */
export function buildEngagementHeatmap(scheduledItems: ScheduleItem[] = []): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, (_, dayIdx) =>
    HEATMAP_HOURS.map((hour) => {
      let score = 28;
      const weekday = dayIdx < 5;
      if (weekday) {
        if (hour >= 9 && hour <= 11) score += 22;
        if (hour >= 13 && hour <= 15) score += 18;
        if (hour >= 7 && hour <= 8) score += 10;
      } else if (hour >= 10 && hour <= 13) {
        score += 14;
      }
      if (hour < 7 || hour > 20) score -= 12;
      return Math.max(12, Math.min(88, score));
    })
  );

  for (const slot of BEST_TIME_SLOTS) {
    const dayIdx = DAY_NAME_TO_INDEX[slot.day] ?? 1;
    const hour = parseTimeLabelHour(slot.time);
    const hourIdx = HEATMAP_HOURS.indexOf(hour as (typeof HEATMAP_HOURS)[number]);
    if (hourIdx < 0) continue;

    for (let d = -1; d <= 1; d += 1) {
      for (let h = -1; h <= 1; h += 1) {
        const di = dayIdx + d;
        const hi = hourIdx + h;
        if (di < 0 || di > 6 || hi < 0 || hi >= HEATMAP_HOURS.length) continue;
        const falloff = (Math.abs(d) + Math.abs(h)) * 7;
        grid[di][hi] = Math.max(grid[di][hi], slot.score - falloff);
      }
    }
    grid[dayIdx][hourIdx] = slot.score;
  }

  for (const item of scheduledItems) {
    if (item.status !== "pending") continue;
    try {
      const d = parseISO(item.scheduled_at);
      const dayIdx = (d.getDay() + 6) % 7;
      const hour = d.getHours();
      const hourIdx = HEATMAP_HOURS.indexOf(hour as (typeof HEATMAP_HOURS)[number]);
      if (hourIdx >= 0) {
        grid[dayIdx][hourIdx] = Math.min(98, grid[dayIdx][hourIdx] + 6);
      }
    } catch {
      /* skip */
    }
  }

  return grid;
}

export function heatmapScoreColor(score: number): string {
  if (score >= 85) return "bg-teal text-white";
  if (score >= 70) return "bg-teal/70 text-white";
  if (score >= 55) return "bg-teal/40 text-teal-950";
  if (score >= 40) return "bg-teal/20 text-foreground";
  return "bg-secondary/80 text-muted-foreground";
}

export function heatmapCellTitle(dayIdx: number, hour: number, score: number): string {
  return `${HEATMAP_DAYS[dayIdx]} ${formatHourLabel(hour)} · ${Math.round(score)}% engagement`;
}

/** Next occurrence of this weekday/hour as datetime-local value. */
export function localDatetimeFromHeatmapCell(dayIdx: number, hour: number): string {
  const now = new Date();
  const currentDayIdx = (now.getDay() + 6) % 7;
  let delta = dayIdx - currentDayIdx;
  if (delta < 0 || (delta === 0 && hour <= now.getHours())) delta += 7;
  const d = new Date(now);
  d.setDate(d.getDate() + delta);
  d.setHours(hour, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const CONTENT_IDEA_PROMPTS = [
  {
    title: "APOE4 & exercise myth-bust",
    theme: "Exercise",
    hook: "What APOE4 carriers should know about movement before symptoms appear.",
    deliverable: "post" as const,
  },
  {
    title: "Sleep & brain clearance",
    theme: "Sleep",
    hook: "How sleep supports glymphatic clearance — patient-friendly explainer.",
    deliverable: "story" as const,
  },
  {
    title: "MIND diet quick wins",
    theme: "Nutrition",
    hook: "Three grocery swaps that support cognitive health this week.",
    deliverable: "caption" as const,
  },
  {
    title: "Prevention clinic spotlight",
    theme: "Newsletter",
    hook: "Who should consider a personalized brain health evaluation at CPBH?",
    deliverable: "newsletter" as const,
  },
  {
    title: "Social connection & cognition",
    theme: "Social",
    hook: "Loneliness and dementia risk — actionable community tips.",
    deliverable: "post" as const,
  },
  {
    title: "Heart-brain axis primer",
    theme: "Heart-brain",
    hook: "Why vascular health matters for Alzheimer's prevention.",
    deliverable: "patient_handout" as const,
  },
];
