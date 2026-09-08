import { withBasePath } from "./base-path";
import type {
  CommandResult,
  ContentFormat,
  ContentIdea,
  DashboardResponse,
  IdeaStatus,
  PlanListResponse,
  Post,
  PostListResponse,
  Template,
} from "./types";
import type { PublishAttempt, ScheduleItem, SocialAccount } from "./schedule-types";

const STORAGE_KEY = "pulse-static-overrides";

type Overrides = {
  posts: Record<string, Post>;
  plan: Record<string, ContentIdea>;
  schedule: ScheduleItem[];
};

function loadOverrides(): Overrides {
  if (typeof window === "undefined") {
    return { posts: {}, plan: {}, schedule: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { posts: {}, plan: {}, schedule: [] };
    return JSON.parse(raw) as Overrides;
  } catch {
    return { posts: {}, plan: {}, schedule: [] };
  }
}

function saveOverrides(overrides: Overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

function normalizePost(post: Post): Post {
  return {
    ...post,
    media_assets: post.media_assets.map((a) => ({
      ...a,
      url: withBasePath(a.url?.replace(/^\/pulse-cpbh(-demo)?/, "") || `/media/${post.id}/${a.s3_key}`),
    })),
  };
}

let seedPromise: Promise<{ posts: Post[]; plan: ContentIdea[] }> | null = null;

async function loadSeed() {
  if (!seedPromise) {
    seedPromise = Promise.all([
      fetch(withBasePath("/data/posts.json")).then((r) => r.json()),
      fetch(withBasePath("/data/plan.json")).then((r) => r.json()),
    ]).then(([posts, plan]) => ({
      posts: (posts.items as Post[]).map(normalizePost),
      plan: plan.items as ContentIdea[],
    }));
  }
  return seedPromise;
}

async function getPosts(): Promise<Post[]> {
  const seed = await loadSeed();
  const overrides = loadOverrides();
  const merged = seed.posts.map((p) => normalizePost(overrides.posts[p.id] || p));
  for (const p of Object.values(overrides.posts)) {
    if (!merged.find((m) => m.id === p.id)) merged.unshift(normalizePost(p));
  }
  return merged;
}

async function getPlan(): Promise<ContentIdea[]> {
  const seed = await loadSeed();
  const overrides = loadOverrides();
  const merged = seed.plan.map((i) => overrides.plan[i.id] || i);
  for (const i of Object.values(overrides.plan)) {
    if (!merged.find((m) => m.id === i.id)) merged.unshift(i);
  }
  return merged;
}

function updatePost(post: Post) {
  const overrides = loadOverrides();
  overrides.posts[post.id] = post;
  saveOverrides(overrides);
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
      const post = await staticApi.posts.get(id);
      const updated = { ...post, status: "approved" as const };
      updatePost(updated);
      return updated;
    },

    unapprove: async (id: string): Promise<Post> => {
      const post = await staticApi.posts.get(id);
      const updated = { ...post, status: "in_review" as const };
      updatePost(updated);
      return updated;
    },

    updateVariant: async (id: string, platform: string, caption: string) => {
      const post = await staticApi.posts.get(id);
      const updated = {
        ...post,
        variants: post.variants.map((v) => (v.platform === platform ? { ...v, caption } : v)),
      };
      updatePost(updated);
      return updated.variants.find((v) => v.platform === platform)!;
    },

    generate: async (id: string) => staticApi.posts.get(id),
    create: async () => {
      throw new Error("Creating posts requires the local Pulse API");
    },
    delete: async () => undefined,
  },

  schedule: {
    list: async (): Promise<ScheduleItem[]> => loadOverrides().schedule,
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

    create: async (data: {
      title: string;
      theme?: string | null;
      format?: ContentFormat;
      target_date?: string | null;
      owner?: string | null;
      status?: IdeaStatus;
      notes?: string | null;
    }): Promise<ContentIdea> => {
      const now = new Date().toISOString();
      const idea: ContentIdea = {
        id: crypto.randomUUID(),
        title: data.title,
        theme: data.theme ?? null,
        format: data.format ?? "carousel",
        target_date: data.target_date ?? null,
        owner: data.owner ?? null,
        status: data.status ?? "idea",
        notes: data.notes ?? null,
        created_at: now,
        updated_at: now,
      };
      const overrides = loadOverrides();
      overrides.plan[idea.id] = idea;
      saveOverrides(overrides);
      return idea;
    },

    update: async (id: string, data: Partial<ContentIdea>): Promise<ContentIdea> => {
      const items = await getPlan();
      const existing = items.find((i) => i.id === id);
      if (!existing) throw new Error("Plan idea not found");
      const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
      const overrides = loadOverrides();
      overrides.plan[id] = updated;
      saveOverrides(overrides);
      return updated;
    },

    delete: async (id: string) => {
      const overrides = loadOverrides();
      delete overrides.plan[id];
      saveOverrides(overrides);
    },
  },
};
