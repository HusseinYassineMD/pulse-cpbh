export const RELEASE_VERSION = "2026.09.28";

export const RELEASE_LABEL = "September 2026";

/** One-liner for emails / Slack */
export const TEAM_HEADLINE =
  "Pulse update: multi-platform previews, content health scores, faster trend-to-post workflow, and more.";

export type ReleaseNote = {
  title: string;
  description: string;
  tag: string;
  /** Where in the app to try it */
  tryIt: string;
};

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    title: "Multi-platform preview",
    description: "Preview the same post as it will appear on Instagram, Facebook, and LinkedIn before you schedule.",
    tag: "Preview",
    tryIt: "Open any post → Media → Preview",
  },
  {
    title: "Content health score",
    description: "See a readiness score and checklist (slides, captions per platform, brand hashtags) before sign-off.",
    tag: "Quality",
    tryIt: "Post detail page, under the workflow banner",
  },
  {
    title: "Activity feed",
    description: "Track recent approvals, queued publishes, and completed posts in one timeline on Home.",
    tag: "Home",
    tryIt: "Home → Recent momentum",
  },
  {
    title: "Trend → Create Studio",
    description: "Turn a trending headline into a draft post in one click — no need to add to Plan first.",
    tag: "Ideas",
    tryIt: "Ideas → Scan trends → Create now",
  },
  {
    title: "Content gap finder",
    description: "See which days in the next week have no posts scheduled, with suggested best-time slots.",
    tag: "Schedule",
    tryIt: "Schedule page, top of the view",
  },
  {
    title: "Download images",
    description: "Download the current slide or all carousel images from posts, stories, and Create Studio.",
    tag: "Export",
    tryIt: "Post / story detail or Studio refine step",
  },
];

/** Bullet list for copy-paste into email or Slack */
export function teamUpdateBullets(): string[] {
  return RELEASE_NOTES.map((n) => `${n.title} — ${n.description} (${n.tryIt})`);
}

export function whatsNewStorageKey(): string {
  return `pulse-whats-new-${RELEASE_VERSION}`;
}
