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
