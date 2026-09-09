import type { ContentIdea, Post, PostSourceConfig, Story } from "./types";

export type BoardItemMeta = {
  category: string | null;
  sourceDate: string | null;
  sourceUrl: string | null;
};

export type CategoryBreakdown = {
  name: string;
  posts: number;
  stories: number;
  plan: number;
  total: number;
};

export type BoardMetrics = {
  totalContent: number;
  postCount: number;
  storyCount: number;
  publishedCount: number;
  readyCount: number;
  categoryCount: number;
  withSourceDate: number;
  categories: CategoryBreakdown[];
};

function categoryKey(raw: string | null | undefined): string {
  const trimmed = raw?.trim();
  return trimmed || "Uncategorized";
}

function planLookupMaps(planItems: ContentIdea[]) {
  const byId = new Map<string, ContentIdea>();
  const byPostId = new Map<string, ContentIdea>();
  for (const idea of planItems) {
    byId.set(idea.id, idea);
    if (idea.post_id) byPostId.set(idea.post_id, idea);
  }
  return { byId, byPostId };
}

export function postBoardMeta(post: Post, planItems: ContentIdea[]): BoardItemMeta {
  const config = (post.source_config ?? {}) as PostSourceConfig;
  const { byId, byPostId } = planLookupMaps(planItems);
  const linked =
    (config.content_idea_id ? byId.get(config.content_idea_id) : undefined) ??
    byPostId.get(post.id);

  return {
    category: config.theme ?? linked?.theme ?? null,
    sourceDate: config.substack_publish_date ?? linked?.substack_publish_date ?? null,
    sourceUrl: config.substack_url ?? linked?.substack_url ?? null,
  };
}

export function storyBoardMeta(story: Story): BoardItemMeta {
  return {
    category: story.category ?? null,
    sourceDate: story.source_publish_date ?? null,
    sourceUrl: story.source_url ?? null,
  };
}

export function computeBoardMetrics(
  posts: Post[],
  stories: Story[],
  planItems: ContentIdea[]
): BoardMetrics {
  const buckets = new Map<string, CategoryBreakdown>();

  const bump = (raw: string | null | undefined, kind: "posts" | "stories" | "plan") => {
    const name = categoryKey(raw);
    const row = buckets.get(name) ?? { name, posts: 0, stories: 0, plan: 0, total: 0 };
    row[kind] += 1;
    row.total += 1;
    buckets.set(name, row);
  };

  for (const post of posts) {
    bump(postBoardMeta(post, planItems).category, "posts");
  }
  for (const story of stories) {
    bump(storyBoardMeta(story).category, "stories");
  }
  for (const idea of planItems) {
    if (["idea", "on_hold", "approved", "in_production"].includes(idea.status)) {
      bump(idea.theme, "plan");
    }
  }

  const categories = [...buckets.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const publishedCount = posts.filter((p) =>
    ["published", "partially_published"].includes(p.status)
  ).length;
  const readyCount = posts.filter((p) =>
    ["ready", "approved", "scheduled"].includes(p.status)
  ).length;

  let withSourceDate = 0;
  for (const post of posts) {
    if (postBoardMeta(post, planItems).sourceDate) withSourceDate += 1;
  }
  for (const story of stories) {
    if (storyBoardMeta(story).sourceDate) withSourceDate += 1;
  }

  return {
    totalContent: posts.length + stories.length,
    postCount: posts.length,
    storyCount: stories.length,
    publishedCount,
    readyCount,
    categoryCount: categories.filter((c) => c.name !== "Uncategorized").length,
    withSourceDate,
    categories,
  };
}

export function formatBoardDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
