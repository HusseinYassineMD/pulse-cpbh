import { withBasePath } from "./base-path";
import type { PlanDeliverable, PlanPlatform, PlanSourceFile } from "./types";

export interface PlanTeamMember {
  name: string;
  email: string;
}

/** Fallback when API is offline — real roster comes from PLAN_TEAM in server .env. */
export const DEFAULT_PLAN_TEAM: PlanTeamMember[] = [
  { name: "Team Lead", email: "lead@example.com" },
  { name: "Editor", email: "editor@example.com" },
];

export const CATEGORY_SUGGESTIONS = [
  "Genetics",
  "Nutrition",
  "Exercise",
  "Mindfulness",
  "Sleep",
  "Social",
  "Heart-brain",
  "Newsletter",
];

/** @deprecated use CATEGORY_SUGGESTIONS */
export const THEME_SUGGESTIONS = CATEGORY_SUGGESTIONS;

export const DELIVERABLE_OPTIONS: { value: PlanDeliverable; label: string }[] = [
  { value: "patient_handout", label: "Patient handout" },
  { value: "post", label: "Post" },
  { value: "story", label: "Story" },
  { value: "caption", label: "Caption" },
  { value: "newsletter", label: "Newsletter" },
];

export const PLATFORM_OPTIONS: { value: PlanPlatform; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
];

export const PARKING_STATUSES = ["idea", "on_hold"] as const;
export const QUEUE_STATUSES = ["approved", "in_production"] as const;
export const SCHEDULE_STATUSES = ["scheduled"] as const;

export function isParkingStatus(status: string): boolean {
  return (PARKING_STATUSES as readonly string[]).includes(status);
}

export function isQueueStatus(status: string): boolean {
  return (QUEUE_STATUSES as readonly string[]).includes(status);
}

export function isBoardStatus(status: string): boolean {
  return isParkingStatus(status) || isQueueStatus(status);
}

export function deliverableLabel(value: PlanDeliverable | null | undefined): string {
  if (!value) return "—";
  return DELIVERABLE_OPTIONS.find((d) => d.value === value)?.label ?? value.replace(/_/g, " ");
}

export function platformLabels(platforms: PlanPlatform[] | undefined): string {
  if (!platforms?.length) return "—";
  return platforms
    .map((p) => PLATFORM_OPTIONS.find((o) => o.value === p)?.label ?? p)
    .join(", ");
}

export type AssignmentEmailIdea = {
  id?: string;
  title: string;
  theme?: string | null;
  deliverable?: PlanDeliverable | null;
  format?: string;
  platforms?: PlanPlatform[];
  target_date?: string | null;
  owner?: string | null;
  substack_url?: string | null;
  substack_publish_date?: string | null;
  source_files?: PlanSourceFile[];
  notes?: string | null;
  status: string;
};

export function planBoardUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${withBasePath("/plan")}`;
  }
  return withBasePath("/plan");
}

export function planIdeaUrl(ideaId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${withBasePath(`/plan?idea=${ideaId}`)}`;
  }
  return withBasePath(`/plan?idea=${ideaId}`);
}

export function assignmentEmailSubject(idea: AssignmentEmailIdea): string {
  return `[Pulse] Assigned: ${idea.title}`;
}

export function buildAssignmentEmailBody(idea: AssignmentEmailIdea, planUrl?: string): string {
  const target = idea.target_date || "TBD";
  const deliverable = idea.deliverable
    ? deliverableLabel(idea.deliverable)
    : idea.format || "—";
  const platforms = platformLabels(idea.platforms);
  const linkUrl = idea.id ? planIdeaUrl(idea.id) : (planUrl ?? planBoardUrl());
  const sourceLines =
    idea.source_files && idea.source_files.length > 0
      ? [
          "Source files:",
          ...idea.source_files.map((f) => `  • ${f.name}${f.url ? ` (${f.url})` : ""}`),
        ]
      : [];
  const substackLines =
    idea.substack_url || idea.substack_publish_date
      ? [
          `Substack link: ${idea.substack_url || "—"}`,
          `Substack publish date: ${idea.substack_publish_date || "TBD"}`,
        ]
      : [];
  return [
    "Hi,",
    "",
    "You have been assigned a content item in Pulse (USC CPBH).",
    "",
    `View assignment: ${linkUrl}`,
    "",
    `Topic: ${idea.title}`,
    `Category: ${idea.theme || "—"}`,
    `Deliverable: ${deliverable}`,
    `Platform: ${platforms}`,
    `Target date: ${target}`,
    `Assigned to: ${idea.owner || "—"}`,
    `Status: ${idea.status.replace(/_/g, " ")}`,
    ...substackLines,
    ...sourceLines,
    `Notes: ${idea.notes || "(none)"}`,
    "",
    "— Pulse · Center for Personalized Brain Health",
  ].join("\n");
}

/** USC / org mailboxes — Outlook Web compose works without SMTP setup. */
export function prefersOutlookCompose(email: string): boolean {
  const lower = email.toLowerCase();
  return lower.endsWith(".edu");
}

export function outlookComposeUrl(idea: AssignmentEmailIdea, assigneeEmail: string): string {
  const subject = assignmentEmailSubject(idea);
  const body = buildAssignmentEmailBody(idea);
  const params = new URLSearchParams({
    to: assigneeEmail,
    subject,
    body,
  });
  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
}

export function assignmentMailto(idea: AssignmentEmailIdea, assigneeEmail: string): string {
  const body = buildAssignmentEmailBody(idea);
  return `mailto:${encodeURIComponent(assigneeEmail)}?subject=${encodeURIComponent(assignmentEmailSubject(idea))}&body=${encodeURIComponent(body)}`;
}

export async function copyAssignmentEmail(idea: AssignmentEmailIdea): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(buildAssignmentEmailBody(idea));
    return true;
  } catch {
    return false;
  }
}

export function openAssignmentEmail(idea: AssignmentEmailIdea, assigneeEmail: string): void {
  const url = prefersOutlookCompose(assigneeEmail)
    ? outlookComposeUrl(idea, assigneeEmail)
    : assignmentMailto(idea, assigneeEmail);
  window.open(url, "_blank", "noopener,noreferrer");
  void copyAssignmentEmail(idea);
}

/** @deprecated use openAssignmentEmail */
export function openAssignmentMailto(idea: AssignmentEmailIdea, assigneeEmail: string): void {
  openAssignmentEmail(idea, assigneeEmail);
}
