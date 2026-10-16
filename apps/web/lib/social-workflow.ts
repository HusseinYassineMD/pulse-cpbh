import type { Post, PostStatus } from "./types";

/** Lead inbox: student submissions awaiting review. */
export const REVIEW_QUEUE_STATUSES: PostStatus[] = ["staged", "in_review"];

export function isReviewQueuePost(post: Post): boolean {
  return REVIEW_QUEUE_STATUSES.includes(post.status);
}

export function submittedBy(post: Post): string | null {
  const cfg = post.source_config;
  if (!cfg || typeof cfg !== "object") return null;
  const name = (cfg as { submitted_by?: string }).submitted_by;
  return name?.trim() || null;
}

export const WORKFLOW_STEPS = [
  { id: "stage", label: "Stage", desc: "Students submit drafts" },
  { id: "review", label: "Review", desc: "You edit & approve" },
  { id: "schedule", label: "Schedule", desc: "Queue across platforms" },
] as const;

/** 0–4 for post detail banner: Staged → Review → Approved → Scheduled → Published */
export function workflowStepIndex(post: Post): number {
  if (post.status === "staged" || post.status === "draft") return 0;
  if (post.status === "in_review" || post.status === "ready" || post.status === "generating") return 1;
  if (post.status === "approved") return 2;
  if (post.status === "scheduled" || post.status === "publishing") return 3;
  if (post.status === "published" || post.status === "partially_published") return 4;
  return 0;
}
