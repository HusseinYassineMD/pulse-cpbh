import { isStaticMode, withBasePath } from "./base-path";
import { STATIC_DATA_VERSION } from "./static-config";
import type {
  CommandResult,
  ContentFormat,
  ContentIdea,
  DashboardResponse,
  IdeaStatus,
  PlanListResponse,
  Post,
  PostListResponse,
  Story,
  StoryListResponse,
  Template,
} from "./types";
import type { PublishAttempt, ScheduleItem, SocialAccount } from "./schedule-types";
import { DEFAULT_PLAN_TEAM, assignmentMailto } from "./plan-team";

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
  return { ...story, image_url: withBasePath(path) };
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
      help_text: `You typed: ${command}\n\nBrowse Posts to review the loaded carousels.`,
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

    update: async (id: string, data: { title?: string; source_url?: string | null }) => {
      runtimeStoryPatches.set(id, { ...runtimeStoryPatches.get(id), ...data });
      return staticApi.stories.get(id);
    },

    replaceImage: async () => {
      throw new Error("Adding stories requires the local Pulse app");
    },

    delete: async () => undefined,
  },

  schedule: {
    list: async (): Promise<ScheduleItem[]> => loadPlanOverrides().schedule,
    create: async () => {
      throw new Error("Scheduling requires the local Pulse API");
    },
    cancel: async () => undefined,
    publishNow: async (): Promise<PublishAttempt[]> => [],
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
      format?: ContentFormat;
      target_date?: string | null;
      owner?: string | null;
      assignee_email?: string | null;
      status?: IdeaStatus;
      notes?: string | null;
      notify_assignee?: boolean;
    }): Promise<ContentIdea> => {
      const now = new Date().toISOString();
      const idea: ContentIdea = {
        id: crypto.randomUUID(),
        title: data.title,
        theme: data.theme ?? null,
        format: data.format ?? "carousel",
        target_date: data.target_date ?? null,
        owner: data.owner ?? null,
        assignee_email: data.assignee_email ?? null,
        status: data.status ?? "idea",
        notes: data.notes ?? null,
        created_at: now,
        updated_at: now,
      };
      const overrides = loadPlanOverrides();
      overrides.plan[idea.id] = idea;
      savePlanOverrides(overrides);
      if (data.notify_assignee && data.assignee_email) {
        window.open(assignmentMailto(idea, data.assignee_email), "_blank");
      }
      return idea;
    },

    update: async (id: string, data: Partial<ContentIdea> & { notify_assignee?: boolean }): Promise<ContentIdea> => {
      const items = await getPlan();
      const existing = items.find((i) => i.id === id);
      if (!existing) throw new Error("Plan idea not found");
      const { notify_assignee, ...patch } = data;
      const updated = { ...existing, ...patch, updated_at: new Date().toISOString() };
      const overrides = loadPlanOverrides();
      overrides.plan[id] = updated;
      savePlanOverrides(overrides);
      if (notify_assignee && updated.assignee_email) {
        window.open(assignmentMailto(updated, updated.assignee_email), "_blank");
      }
      return updated;
    },

    notify: async (id: string) => {
      const items = await getPlan();
      const idea = items.find((i) => i.id === id);
      if (!idea?.assignee_email) throw new Error("No assignee email on this idea");
      window.open(assignmentMailto(idea, idea.assignee_email), "_blank");
      return { ok: true, message: "Opened email draft in your mail app" };
    },

    delete: async (id: string) => {
      const overrides = loadPlanOverrides();
      delete overrides.plan[id];
      savePlanOverrides(overrides);
    },
  },
};
