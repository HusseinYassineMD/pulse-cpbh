export interface PlanTeamMember {
  name: string;
  email: string;
}

/** Default roster — override via PLAN_TEAM on the API in production. */
export const DEFAULT_PLAN_TEAM: PlanTeamMember[] = [
  { name: "CPBH Team", email: "cpbh@usc.edu" },
  { name: "Hussein Yassine", email: "hy@usc.edu" },
  { name: "Aishwarya Jagadish", email: "aish@usc.edu" },
];

export const THEME_SUGGESTIONS = [
  "Genetics",
  "Nutrition",
  "Exercise",
  "Mindfulness",
  "Sleep",
  "Social",
  "Heart-brain",
  "Newsletter",
];

export const PARKING_STATUSES = ["idea", "on_hold"] as const;
export const QUEUE_STATUSES = ["approved", "in_production", "scheduled"] as const;

export function isParkingStatus(status: string): boolean {
  return (PARKING_STATUSES as readonly string[]).includes(status);
}

export function isQueueStatus(status: string): boolean {
  return (QUEUE_STATUSES as readonly string[]).includes(status);
}

export function assignmentMailto(idea: {
  title: string;
  theme?: string | null;
  format: string;
  target_date?: string | null;
  notes?: string | null;
  status: string;
}, assigneeEmail: string): string {
  const target = idea.target_date || "TBD";
  const body = [
    "Hi,",
    "",
    "You have been assigned a content item in Pulse (USC CPBH).",
    "",
    `Title: ${idea.title}`,
    `Theme: ${idea.theme || "—"}`,
    `Format: ${idea.format}`,
    `Target date: ${target}`,
    `Status: ${idea.status.replace(/_/g, " ")}`,
    `Notes: ${idea.notes || "(none)"}`,
    "",
    "Open the plan board to view details.",
  ].join("\n");
  return `mailto:${encodeURIComponent(assigneeEmail)}?subject=${encodeURIComponent(`[Pulse] Assigned: ${idea.title}`)}&body=${encodeURIComponent(body)}`;
}
