import type { Post } from "@/lib/types";
import type { ScheduleItem } from "@/lib/schedule-types";

export type ActivityEvent = {
  id: string;
  at: string;
  title: string;
  detail: string;
  href?: string;
  tone: "teal" | "blue" | "green" | "gold";
};

const POST_STATUS_LABEL: Record<string, { title: string; tone: ActivityEvent["tone"] }> = {
  published: { title: "Published", tone: "green" },
  scheduled: { title: "Scheduled", tone: "blue" },
  approved: { title: "Approved", tone: "teal" },
  ready: { title: "Ready for review", tone: "gold" },
  in_review: { title: "In review", tone: "gold" },
};

export function buildActivityFeed(posts: Post[], schedule: ScheduleItem[], limit = 8): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  for (const post of posts) {
    const meta = POST_STATUS_LABEL[post.status];
    if (!meta) continue;
    events.push({
      id: `post-${post.id}-${post.updated_at}`,
      at: post.updated_at,
      title: meta.title,
      detail: post.title,
      href: `/posts/${post.id}`,
      tone: meta.tone,
    });
  }

  for (const item of schedule) {
    if (item.status === "pending") {
      events.push({
        id: `sched-${item.id}`,
        at: item.scheduled_at,
        title: "Queued to publish",
        detail: item.post_title,
        href: item.post_id ? `/posts/${item.post_id}` : undefined,
        tone: "blue",
      });
    } else if (item.status === "completed") {
      events.push({
        id: `pub-${item.id}`,
        at: item.scheduled_at,
        title: "Went live",
        detail: item.post_title,
        href: item.post_id ? `/posts/${item.post_id}` : undefined,
        tone: "green",
      });
    }
  }

  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
