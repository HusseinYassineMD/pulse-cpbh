import { isStaticMode, withBasePath } from "./base-path";
import { STATIC_DATA_VERSION } from "./static-config";
import type {
  CommandResult,
  ContentFormat,
  ContentIdea,
  DashboardResponse,
  IdeaStatus,
  PlanDeliverable,
  PlanListResponse,
  PlanPlatform,
  PlanSourceFile,
  PlanWriteResponse,
  Post,
  PostListResponse,
  Story,
  StoryListResponse,
  Template,
} from "./types";
import type { PublishAttempt, ScheduleItem, SocialAccount } from "./schedule-types";
import { DEFAULT_PLAN_TEAM } from "./plan-team";

export { STATIC_DATA_VERSION };

const PLAN_STORAGE_KEY = "pulse-plan-overrides";

type PlanOverrides = {
  plan: Record<string, ContentIdea>;
  schedule: ScheduleItem[];
};

/** In-memory only — never merge deleted posts from localStorage. */
const runtimePostPatches = new Map<string, Partial<Post>>();
const runtimeStoryPatches = new Map<string, Partial<Story>>();

function clearLegacyStorage() {
  if (typeof window === "undefined" || !isStaticMode()) return;
  [
    "pulse-static-overrides",
    "pulse-static-overrides-v2",
    "pulse-static-overrides-v3",
    "pulse-data-version",
  ].forEach((key) => localStorage.removeItem(key));
}

if (typeof window !== "undefined") {
  clearLegacyStorage();
}

function loadPlanOverrides(): PlanOverrides {
  if (typeof window === "undefined") {
    return { plan: {}, schedule: [] };
  }
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return { plan: {}, schedule: [] };
    return JSON.parse(raw) as PlanOverrides;
  } catch {
    return { plan: {}, schedule: [] };
  }
}

function savePlanOverrides(overrides: PlanOverrides) {
  localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(overrides));
}

function mediaPath(postId: string, s3Key: string) {
  return `/media/${postId}/${s3Key}`;
}

function normalizePost(post: Post): Post {
  return {
    ...post,
    media_assets: post.media_assets.map((a) => {
      const raw =
        a.url?.replace(/^\/pulse-cpbh(-demo)?/, "").replace(/^\/api\/media/, "/media") ||
        mediaPath(post.id, a.s3_key);
      const path = raw.startsWith("/media/") ? raw : mediaPath(post.id, a.s3_key);
      return { ...a, url: withBasePath(path) };
    }),
  };
}

function applyPatches(post: Post): Post {
  const patch = runtimePostPatches.get(post.id);
  return normalizePost(patch ? { ...post, ...patch } : post);
}

function normalizeStory(story: Story): Story {
  const raw =
    story.image_url
      ?.replace(/^\/pulse-cpbh(-demo)?/, "")
      .replace(/^\/api\/media\/stories/, "/media/stories") || `/media/stories/${story.id}/image.png`;
  const path = raw.startsWith("/media/stories/") ? raw : `/media/stories/${story.id}/image.png`;
  return {
    ...story,
    category: story.category ?? null,
    source_publish_date: story.source_publish_date ?? null,
    image_url: withBasePath(path),
  };
}

function applyStoryPatches(story: Story): Story {
  const patch = runtimeStoryPatches.get(story.id);
  return normalizeStory(patch ? { ...story, ...patch } : story);
}

let seedPromise: Promise<{ posts: Post[]; stories: Story[]; plan: ContentIdea[] }> | null = null;

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(withBasePath(path));
    if (!response.ok) return fallback;
    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

async function loadSeed() {
  if (!seedPromise) {
    seedPromise = Promise.all([
      fetchJson<{ items: Post[] }>("/data/posts.json", { items: [] }),
      fetchJson<{ items: Story[] }>("/data/stories.json", { items: [] }),
      fetchJson<{ items: ContentIdea[] }>("/data/plan.json", { items: [] }),
    ]).then(([posts, stories, plan]) => ({
      posts: posts.items.map(normalizePost),
      stories: stories.items.map(normalizeStory),
      plan: plan.items.map((item) => ({
        ...item,
        assignee_email: item.assignee_email ?? null,
        deliverable: item.deliverable ?? null,
        platforms: item.platforms ?? [],
        source_files: (item.source_files ?? []).map((f) => ({
          ...f,
          url: f.url ?? undefined,
        })),
        substack_url: item.substack_url ?? null,
        substack_publish_date: item.substack_publish_date ?? null,
        post_id: item.post_id ?? null,
      })),
    }));
  }
  return seedPromise;
}

async function getStories(): Promise<Story[]> {
  const seed = await loadSeed();
  return seed.stories.map(applyStoryPatches);
}

async function getPosts(): Promise<Post[]> {
  const seed = await loadSeed();
  return seed.posts.map(applyPatches);
}

async function getPlan(): Promise<ContentIdea[]> {
  const seed = await loadSeed();
  const overrides = loadPlanOverrides();
  return seed.plan.map((i) => overrides.plan[i.id] || i);
}

function patchPost(id: string, patch: Partial<Post>) {
  runtimePostPatches.set(id, { ...runtimePostPatches.get(id), ...patch });
}

function dashboardFrom(posts: Post[]): DashboardResponse {
  const stats = {
    total: posts.length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => ["published", "partially_published"].includes(p.status)).length,
    in_review: posts.filter((p) => p.status === "in_review").length,
    drafts: posts.filter((p) => ["draft", "ready", "approved", "generating"].includes(p.status)).length,
  };
  return {
    stats,
    recent_posts: posts.slice(0, 5).map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      created_at: p.created_at,
      platform_count: p.variants.length,
    })),
  };
}

export const staticApi = {
  dashboard: {
    get: async (): Promise<DashboardResponse> => dashboardFrom(await getPosts()),
  },

  templates: {
    list: async (): Promise<Template[]> => [
      { post_creator_id: "exercise-apoe4", title: "Exercise, Sitting, and APOE4", slide_count: 4, platforms: ["instagram", "facebook", "linkedin"] },
      { post_creator_id: "protein-maxing", title: "Protein Maxing", slide_count: 4, platforms: ["instagram", "facebook", "linkedin"] },
    ],
  },

  commands: {
    run: async (command: string): Promise<CommandResult> => ({
      message: "Generation runs on the local app — this GitHub demo shows saved posts.",
      help_text: `You typed: ${command}\n\nBrowse the Board to review posts and stories.`,
      post: null,
    }),
  },

  posts: {
    list: async (params?: { status?: string; skip?: number; limit?: number }): Promise<PostListResponse> => {
      let items = await getPosts();
      if (params?.status) items = items.filter((p) => p.status === params.status);
      const skip = params?.skip || 0;
      const limit = params?.limit || 20;
      return { items: items.slice(skip, skip + limit), total: items.length };
    },

    get: async (id: string): Promise<Post> => {
      const post = (await getPosts()).find((p) => p.id === id);
      if (!post) throw new Error("Post not found");
      return post;
    },

    approve: async (id: string): Promise<Post> => {
      patchPost(id, { status: "approved" });
      return staticApi.posts.get(id);
    },

    unapprove: async (id: string): Promise<Post> => {
      patchPost(id, { status: "in_review" });
      return staticApi.posts.get(id);
    },

    updateVariant: async (id: string, platform: string, caption: string) => {
      const post = await staticApi.posts.get(id);
      const variants = post.variants.map((v) => (v.platform === platform ? { ...v, caption } : v));
      patchPost(id, { variants });
      return (await staticApi.posts.get(id)).variants.find((v) => v.platform === platform)!;
    },

    generate: async (id: string) => staticApi.posts.get(id),
    create: async () => {
      throw new Error("Creating posts requires the local Pulse API");
    },
    delete: async () => undefined,
  },

  stories: {
    list: async (params?: { skip?: number; limit?: number }): Promise<StoryListResponse> => {
      let items = await getStories();
      const skip = params?.skip || 0;
      const limit = params?.limit || 50;
      return { items: items.slice(skip, skip + limit), total: items.length };
    },

    get: async (id: string): Promise<Story> => {
      const story = (await getStories()).find((s) => s.id === id);
      if (!story) throw new Error("Story not found");
      return story;
    },

    create: async () => {
      throw new Error("Adding stories requires the local Pulse app");
    },

    update: async (
      id: string,
      data: {
        title?: string;
        source_url?: string | null;
        category?: string | null;
        source_publish_date?: string | null;
      }
    ) => {
      runtimeStoryPatches.set(id, { ...runtimeStoryPatches.get(id), ...data });
      return staticApi.stories.get(id);
    },

    replaceImage: async () => {
      throw new Error("Adding stories requires the local Pulse app");
    },

    delete: async () => undefined,
  },

  schedule: {
    list: async (): Promise<ScheduleItem[]> => {
      const overrides = loadPlanOverrides();
      const dbItems = overrides.schedule ?? [];
      const planItems = (await getPlan())
        .filter((i) => i.status === "scheduled")
        .map((idea) => {
          const existing = dbItems.find((s) => s.content_idea_id === idea.id);
          if (existing) return existing;
          const when = idea.target_date
            ? `${idea.target_date}T09:00:00-08:00`
            : new Date(Date.now() + 3600000).toISOString();
          return {
            id: `plan-${idea.id}`,
            post_id: idea.post_id ?? idea.id,
            post_title: idea.title,
            content_type: idea.deliverable ?? "post",
            content_idea_id: idea.id,
            scheduled_at: when,
            timezone: "America/Los_Angeles",
            status: "pending" as const,
            platform_targets: idea.platforms.length ? idea.platforms : ["instagram", "facebook", "linkedin"],
          };
        });
      const merged = [...dbItems];
      for (const item of planItems) {
        if (!merged.some((m) => m.content_idea_id === item.content_idea_id)) {
          merged.push(item);
        }
      }
      return merged.sort(
        (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      );
    },
    create: async () => {
      throw new Error("Scheduling requires the local Pulse API");
    },
    cancel: async (scheduleId: string) => {
      const overrides = loadPlanOverrides();
      const item = overrides.schedule?.find((s) => s.id === scheduleId);
      const ideaId =
        item?.content_idea_id ?? (scheduleId.startsWith("plan-") ? scheduleId.slice("plan-".length) : null);
      const revert = item?.status === "pending";
      if (ideaId && overrides.plan[ideaId] && revert) {
        overrides.plan[ideaId] = {
          ...overrides.plan[ideaId],
          status: "approved",
          post_id: null,
          updated_at: new Date().toISOString(),
        };
      }
      overrides.schedule = (overrides.schedule ?? []).filter((s) => s.id !== scheduleId);
      savePlanOverrides(overrides);
    },
    publishNow: async (postId: string, platforms?: string[]): Promise<PublishAttempt[]> => {
      const overrides = loadPlanOverrides();
      const scheduleItem = overrides.schedule?.find((s) => s.post_id === postId);
      const ideaId = scheduleItem?.content_idea_id;
      if (ideaId && overrides.plan[ideaId]) {
        overrides.plan[ideaId] = {
          ...overrides.plan[ideaId],
          status: "published",
          updated_at: new Date().toISOString(),
        };
      } else {
        const idea = (await getPlan()).find((i) => i.id === postId || i.post_id === postId);
        if (idea) {
          overrides.plan[idea.id] = { ...idea, status: "published", updated_at: new Date().toISOString() };
        }
      }
      if (scheduleItem) {
        overrides.schedule = overrides.schedule.map((s) =>
          s.post_id === postId ? { ...s, status: "completed" as const } : s
        );
      }
      savePlanOverrides(overrides);
      const targets = platforms ?? ["instagram", "facebook", "linkedin"];
      return targets.map((platform, i) => ({
        id: `dry-${Date.now()}-${i}`,
        platform,
        status: "success",
        platform_post_id: `dry-run-${postId}`,
        error_message: "Dry-run publish from Schedule",
        attempted_at: new Date().toISOString(),
      }));
    },
    attempts: async (): Promise<PublishAttempt[]> => [],
  },

  accounts: {
    list: async (): Promise<SocialAccount[]> => [],
    connect: async () => {
      throw new Error("Connect accounts on the local Pulse app");
    },
    disconnect: async () => undefined,
  },

  plan: {
    list: async (params?: { status?: IdeaStatus; theme?: string }): Promise<PlanListResponse> => {
      let items = await getPlan();
      if (params?.status) items = items.filter((i) => i.status === params.status);
      if (params?.theme) items = items.filter((i) => i.theme === params.theme);
      return { items, total: items.length };
    },

    team: async () => DEFAULT_PLAN_TEAM,

    create: async (data: {
      title: string;
      theme?: string | null;
      deliverable?: PlanDeliverable;
      format?: ContentFormat;
      platforms?: PlanPlatform[];
      target_date?: string | null;
      owner?: string | null;
      assignee_email?: string | null;
      status?: IdeaStatus;
      notes?: string | null;
      substack_url?: string | null;
      substack_publish_date?: string | null;
      notify_assignee?: boolean;
    }): Promise<PlanWriteResponse> => {
      const now = new Date().toISOString();
      const idea: ContentIdea = {
        id: crypto.randomUUID(),
        title: data.title,
        theme: data.theme ?? null,
        deliverable: data.deliverable ?? "post",
        format: data.format ?? "carousel",
        platforms: data.platforms ?? [],
        source_files: [],
        substack_url: data.substack_url ?? null,
        substack_publish_date: data.substack_publish_date ?? null,
        post_id: null,
        target_date: data.target_date ?? null,
        owner: data.owner ?? null,
        assignee_email: data.assignee_email ?? null,
        status: "idea",
        notes: data.notes ?? null,
        created_at: now,
        updated_at: now,
      };
      const overrides = loadPlanOverrides();
      overrides.plan[idea.id] = idea;
      savePlanOverrides(overrides);
      const notification =
        data.notify_assignee && data.assignee_email
          ? { ok: true, message: "Opening email draft in your mail app…", use_mailto: true }
          : null;
      return { ...idea, notification };
    },

    update: async (id: string, data: Partial<ContentIdea> & { notify_assignee?: boolean }): Promise<PlanWriteResponse> => {
      const items = await getPlan();
      const existing = items.find((i) => i.id === id);
      if (!existing) throw new Error("Plan idea not found");
      const { notify_assignee, ...patch } = data;
      const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
      const overrides = loadPlanOverrides();
      overrides.plan[id] = updated;
      savePlanOverrides(overrides);
      const notification =
        notify_assignee && updated.assignee_email
          ? { ok: true, message: "Opening email draft in your mail app…", use_mailto: true }
          : null;
      return { ...updated, notification };
    },

    notify: async (id: string) => {
      const items = await getPlan();
      const idea = items.find((i) => i.id === id);
      if (!idea?.assignee_email) throw new Error("No assignee email on this idea");
      return { ok: true, message: "Opening email draft in your mail app…", use_mailto: true };
    },

    delete: async (id: string) => {
      const overrides = loadPlanOverrides();
      delete overrides.plan[id];
      savePlanOverrides(overrides);
    },

    uploadSource: async (id: string, file: File): Promise<ContentIdea> => {
      const items = await getPlan();
      const existing = items.find((i) => i.id === id);
      if (!existing) throw new Error("Plan idea not found");
      const entry: PlanSourceFile = {
        name: file.name,
        filename: `${Date.now()}_${file.name.replace(/\s+/g, "_")}`,
      };
      const updated: ContentIdea = {
        ...existing,
        source_files: [...existing.source_files, entry],
        updated_at: new Date().toISOString(),
      };
      const overrides = loadPlanOverrides();
      overrides.plan[id] = updated;
      savePlanOverrides(overrides);
      return updated;
    },

    deleteSource: async (id: string, filename: string): Promise<ContentIdea> => {
      const items = await getPlan();
      const existing = items.find((i) => i.id === id);
      if (!existing) throw new Error("Plan idea not found");
      const updated: ContentIdea = {
        ...existing,
        source_files: existing.source_files.filter((f) => f.filename !== filename),
        updated_at: new Date().toISOString(),
      };
      const overrides = loadPlanOverrides();
      overrides.plan[id] = updated;
      savePlanOverrides(overrides);
      return updated;
    },

    sendToSchedule: async (id: string) => {
      const items = await getPlan();
      const existing = items.find((i) => i.id === id);
      if (!existing) throw new Error("Plan idea not found");
      if (!["approved", "in_production", "scheduled"].includes(existing.status)) {
        throw new Error("Only approved or in-production ideas can be sent to schedule");
      }
      const postId = existing.post_id ?? crypto.randomUUID();
      const scheduleId = crypto.randomUUID();
      const when = existing.target_date
        ? `${existing.target_date}T09:00:00-08:00`
        : new Date(Date.now() + 3600000).toISOString();
      const updated: ContentIdea = {
        ...existing,
        status: "scheduled",
        post_id: postId,
        updated_at: new Date().toISOString(),
      };
      const scheduleItem: ScheduleItem = {
        id: scheduleId,
        post_id: postId,
        post_title: existing.title,
        content_type: existing.deliverable ?? "post",
        content_idea_id: existing.id,
        scheduled_at: when,
        timezone: "America/Los_Angeles",
        status: "pending",
        platform_targets: existing.platforms.length
          ? existing.platforms
          : ["instagram", "facebook", "linkedin"],
      };
      const overrides = loadPlanOverrides();
      overrides.plan[id] = updated;
      overrides.schedule = [...(overrides.schedule ?? []).filter((s) => s.content_idea_id !== id), scheduleItem];
      savePlanOverrides(overrides);
      return { idea: updated, post_id: postId, schedule_id: scheduleId, scheduled_at: when };
    },
  },

  pipeline: {
    list: async () => ({ items: [], total: 0 }),
    create: async () => {
      throw new Error("Pipeline requires the live API");
    },
    update: async () => {
      throw new Error("Pipeline requires the live API");
    },
    reorder: async () => ({ items: [], total: 0 }),
    summarize: async () => {
      throw new Error("Pipeline requires the live API");
    },
    generateOutput: async () => {
      throw new Error("Pipeline requires the live API");
    },
    delete: async () => undefined,
  },
};
