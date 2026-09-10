import type { Post, PostStatus } from "./types";

/** Posts that still need a human step before publishing. */
export const ACTIONABLE_STATUSES: PostStatus[] = ["ready", "in_review", "approved"];

export function isActionablePost(post: Post): boolean {
  return ACTIONABLE_STATUSES.includes(post.status);
}

export function postWorkflowStep(post: Post): number {
  const order: PostStatus[] = ["draft", "generating", "ready", "in_review", "approved", "scheduled", "published"];
  const idx = order.indexOf(post.status);
  if (idx >= 0) return idx;
  if (post.status === "partially_published") return order.indexOf("published");
  return 0;
}

export type PostNextStep =
  | { kind: "approve"; label: string; hint: string }
  | { kind: "schedule"; label: string; hint: string; href: string }
  | { kind: "calendar"; label: string; hint: string; href: string }
  | { kind: "studio"; label: string; hint: string; href: string }
  | { kind: "view"; label: string; hint: string; href: string };

export function getPostNextStep(post: Post): PostNextStep {
  if (["ready", "in_review"].includes(post.status)) {
    return {
      kind: "approve",
      label: "Approve",
      hint: "Sign off so you can schedule",
    };
  }
  if (post.status === "approved") {
    return {
      kind: "schedule",
      label: "Schedule",
      hint: "Pick a time and platforms",
      href: `/posts/${post.id}#schedule`,
    };
  }
  if (post.status === "scheduled") {
    return {
      kind: "calendar",
      label: "View in calendar",
      hint: "See when this goes live",
      href: "/calendar",
    };
  }
  if (post.status === "draft" || post.status === "generating") {
    return {
      kind: "studio",
      label: "Finish in Create",
      hint: "Generate or refine content",
      href: "/studio",
    };
  }
  return {
    kind: "view",
    label: "Open post",
    hint: "Review details",
    href: `/posts/${post.id}`,
  };
}
