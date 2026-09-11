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
import type { PipelineItem, PipelineListResponse, PipelineStage } from "./pipeline-types";
import { OUTPUT_TYPE_OPTIONS } from "./pipeline-types";

export { STATIC_DATA_VERSION };

const PLAN_STORAGE_KEY = "pulse-plan-overrides";
const PIPELINE_STORAGE_KEY = "pulse-pipeline-items";
const STATIC_CRUD_KEY = "pulse-static-crud";

type StaticCrudState = {
  deletedPosts: string[];
  deletedStories: string[];
  accounts: SocialAccount[];
  publishAttempts: Record<string, PublishAttempt[]>;
};

type PlanOverrides = {
  plan: Record<string, ContentIdea>;
  schedule: ScheduleItem[];
  deleted?: string[];
};

/** In-memory only — never merge deleted posts from localStorage. */
const runtimePostPatches = new Map<string, Partial<Post>>();
const runtimeCreatedPosts = new Map<string, Post>();
const runtimeStoryPatches = new Map<string, Partial<Story>>();
const runtimeCreatedStories = new Map<string, Story>();

function loadCrudState(): StaticCrudState {
  if (typeof window === "undefined") {
    return { deletedPosts: [], deletedStories: [], accounts: [], publishAttempts: {} };
  }
  try {
    const raw = localStorage.getItem(STATIC_CRUD_KEY);
    if (!raw) return { deletedPosts: [], deletedStories: [], accounts: [], publishAttempts: {} };
    return JSON.parse(raw) as StaticCrudState;
  } catch {
    return { deletedPosts: [], deletedStories: [], accounts: [], publishAttempts: {} };
  }
}

function saveCrudState(state: StaticCrudState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STATIC_CRUD_KEY, JSON.stringify(state));
}

function markPostDeleted(id: string) {
  runtimeCreatedPosts.delete(id);
  runtimePostPatches.delete(id);
  const state = loadCrudState();
  state.deletedPosts = [...new Set([...state.deletedPosts, id])];
  saveCrudState(state);
}

function markStoryDeleted(id: string) {
  runtimeCreatedStories.delete(id);
  runtimeStoryPatches.delete(id);
  const state = loadCrudState();
  state.deletedStories = [...new Set([...state.deletedStories, id])];
  saveCrudState(state);
}

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
  const deleted = new Set(loadCrudState().deletedStories);
  const seed = await loadSeed();
  const created = Array.from(runtimeCreatedStories.values()).map(applyStoryPatches);
  return [...created, ...seed.stories.map(applyStoryPatches)].filter((s) => !deleted.has(s.id));
}

async function getPosts(): Promise<Post[]> {
  const deleted = new Set(loadCrudState().deletedPosts);
  const seed = await loadSeed();
  const created = Array.from(runtimeCreatedPosts.values()).map(applyPatches);
  return [...created, ...seed.posts.map(applyPatches)].filter((p) => !deleted.has(p.id));
}

async function getPlan(): Promise<ContentIdea[]> {
  const seed = await loadSeed();
  const overrides = loadPlanOverrides();
  const deleted = new Set(overrides.deleted ?? []);
  const byId = new Map<string, ContentIdea>();

  for (const item of seed.plan) {
    if (deleted.has(item.id)) continue;
    const patch = overrides.plan[item.id];
    byId.set(item.id, patch ? { ...item, ...patch } : item);
  }
  for (const [id, idea] of Object.entries(overrides.plan)) {
    if (!deleted.has(id) && !byId.has(id)) byId.set(id, idea);
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
}

function loadPipelineItems(): PipelineItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PIPELINE_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PipelineItem[];
  } catch {
    return [];
  }
}

function savePipelineItems(items: PipelineItem[]) {
  localStorage.setItem(PIPELINE_STORAGE_KEY, JSON.stringify(items));
}

function pipelineListResponse(): PipelineListResponse {
  const items = loadPipelineItems().sort((a, b) => {
    if (a.stage !== b.stage) return a.stage.localeCompare(b.stage);
    return a.sort_order - b.sort_order;
  });
  return { items, total: items.length };
}

function fallbackSummarize(sourceText: string): string {
  const lines = sourceText.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return "• Add source text, then summarize again.";
  return lines.slice(0, 8).map((line) => `• ${line.slice(0, 280)}`).join("\n");
}

function fallbackPipelineOutput(
  content: string,
  title: string,
  outputType: PlanDeliverable,
  fromHighlights: boolean
): string {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const snippet = lines.slice(0, 6).join("\n") || content.slice(0, 600);
  const prefix = title.trim() || "CPBH update";
  const tags = "\n\n#BrainHealth #USCCPBH";

  if (outputType === "caption") {
    const body = lines.slice(0, 2).join(" ").slice(0, 260) || snippet.slice(0, 260);
    return `${body}${tags}`;
  }
  if (outputType === "story") {
    const slides = lines.slice(0, 5).length ? lines.slice(0, 5) : [snippet.slice(0, 120)];
    return slides.map((line, i) => `Slide ${i + 1}: ${line.slice(0, 140)}`).join("\n\n");
  }
  if (outputType === "newsletter") {
    return `In this edition: ${prefix}\n\n${snippet}\n\nLearn more at USC CPBH.${tags}`;
  }
  if (outputType === "patient_handout") {
    const bullets = lines.slice(0, 6).length ? lines.slice(0, 6) : [snippet.slice(0, 200)];
    return `Key points for patients and families:\n${bullets.map((b) => `• ${b.slice(0, 240)}`).join("\n")}`;
  }
  const hook = fromHighlights ? `From our latest roundup: ${prefix}` : prefix;
  return `${hook}\n\n${snippet}${tags}`;
}

function nextPipelineSort(items: PipelineItem[], stage: PipelineStage): number {
  const inStage = items.filter((i) => i.stage === stage);
  const top = inStage.reduce((max, i) => Math.max(max, i.sort_order), -1);
  return top + 1;
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
  auth: {
    login: async () => ({
      access_token: "static-demo-token",
      refresh_token: "static-demo-refresh",
      token_type: "bearer",
    }),
    register: async () => ({
      access_token: "static-demo-token",
      refresh_token: "static-demo-refresh",
      token_type: "bearer",
    }),
    me: async () => ({
      id: "static-user",
      email: "demo@usc.edu",
      name: "CPBH Demo",
      role: "admin" as const,
      created_at: new Date().toISOString(),
    }),
  },

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

    update: async (id: string, data: { title?: string; status?: string }): Promise<Post> => {
      patchPost(id, data as Partial<Post>);
      return staticApi.posts.get(id);
    },

    submitReview: async (id: string): Promise<Post> => {
      patchPost(id, { status: "in_review" });
      return staticApi.posts.get(id);
    },

    approve: async (id: string): Promise<Post> => {
      patchPost(id, { status: "approved" });
      return staticApi.posts.get(id);
    },

    unapprove: async (id: string): Promise<Post> => {
      patchPost(id, { status: "in_review" });
      return staticApi.posts.get(id);
    },

    reviewCompliance: async (id: string) => {
      const post = await staticApi.posts.get(id);
      const text = post.variants.map((v) => v.caption).join("\n");
      const issues: string[] = [];
      if (!text.includes("#BrainHealth")) issues.push("Missing #BrainHealth hashtag");
      if (text.toLowerCase().includes("cure")) issues.push("Avoid unsubstantiated cure claims");
      return {
        passed: issues.length === 0,
        issues,
        suggestions: issues.length ? ["Add #BrainHealth #USCCPBH and use prevention-focused language"] : [],
      };
    },

    publishAttempts: async (id: string) => loadCrudState().publishAttempts[id] ?? [],

    updateVariant: async (id: string, platform: string, caption: string) => {
      const post = await staticApi.posts.get(id);
      const variants = post.variants.map((v) => (v.platform === platform ? { ...v, caption } : v));
      patchPost(id, { variants });
      return (await staticApi.posts.get(id)).variants.find((v) => v.platform === platform)!;
    },

    generate: async (id: string) => staticApi.posts.get(id),
    optimizeCaptions: async (id: string) => {
      const post = await staticApi.posts.get(id);
      return post.variants.map((v) => ({
        platform: v.platform,
        original_caption: v.caption,
        optimized_caption: v.caption,
        hashtags: ["#BrainHealth", "#USCCPBH", "#AlzheimersPrevention"],
      }));
    },

    chatRefine: async (
      id: string,
      message: string,
      _opts?: { platform?: string; history?: { role: "user" | "assistant"; content: string }[] }
    ) => {
      const post = await staticApi.posts.get(id);
      const lower = message.toLowerCase();
      const variants = post.variants.map((v) => {
        let caption = v.caption;
        if (lower.includes("short")) caption = caption.slice(0, 280);
        if (lower.includes("hashtag") && !caption.includes("#BrainHealth")) {
          caption += "\n\n#BrainHealth #USCCPBH";
        }
        if (lower.includes("cta") || lower.includes("clinic")) {
          caption += "\n\nLearn more at USC CPBH.";
        }
        if (lower.includes("friendly") || lower.includes("warm")) {
          caption = caption.replace(/\.$/, "") + " We're here to support your brain health journey.";
        }
        if (lower.includes("linkedin") || lower.includes("professional")) {
          caption = caption.replace(/!/g, ".");
        }
        return { ...v, caption };
      });
      patchPost(id, { variants });
      return {
        reply: "Updated captions locally (demo mode). Full AI chat on localhost.",
        captions: variants.map((v) => ({ platform: v.platform, caption: v.caption })),
      };
    },
    create: async (data: { title: string; post_creator_id?: string }): Promise<Post> => {
      const id = `post-${Date.now()}`;
      const now = new Date().toISOString();
      const post: Post = {
        id,
        title: data.title,
        status: "draft",
        post_creator_id: data.post_creator_id ?? null,
        source_config: { type: "post" },
        created_at: now,
        updated_at: now,
        media_assets: [],
        variants: [],
      };
      runtimeCreatedPosts.set(id, post);
      return applyPatches(post);
    },
    delete: async (id: string) => {
      markPostDeleted(id);
      const overrides = loadPlanOverrides();
      overrides.schedule = (overrides.schedule ?? []).filter((s) => s.post_id !== id);
      savePlanOverrides(overrides);
    },
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

    create: async (data: {
      title: string;
      source_url?: string;
      category?: string;
      source_publish_date?: string;
      image: File;
    }): Promise<Story> => {
      const id = `story-${Date.now()}`;
      const now = new Date().toISOString();
      const imageUrl = URL.createObjectURL(data.image);
      const story: Story = {
        id,
        title: data.title,
        source_url: data.source_url ?? null,
        category: data.category ?? null,
        source_publish_date: data.source_publish_date ?? null,
        image_url: imageUrl,
        created_at: now,
        updated_at: now,
      };
      runtimeCreatedStories.set(id, story);
      return applyStoryPatches(story);
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

    replaceImage: async (id: string, image: File): Promise<Story> => {
      const imageUrl = URL.createObjectURL(image);
      runtimeStoryPatches.set(id, { image_url: imageUrl, updated_at: new Date().toISOString() });
      return staticApi.stories.get(id);
    },

    delete: async (id: string) => {
      markStoryDeleted(id);
    },
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
    create: async (
      postId: string,
      data: { scheduled_at: string; timezone: string; platform_targets: string[] }
    ): Promise<ScheduleItem> => {
      const post = await staticApi.posts.get(postId);
      patchPost(postId, { status: "scheduled" });
      const overrides = loadPlanOverrides();
      const item: ScheduleItem = {
        id: `sch-${Date.now()}`,
        post_id: postId,
        post_title: post.title,
        content_type: "post",
        scheduled_at: data.scheduled_at,
        timezone: data.timezone,
        status: "pending",
        platform_targets: data.platform_targets,
      };
      overrides.schedule = [...(overrides.schedule ?? []), item];
      savePlanOverrides(overrides);
      return item;
    },
    update: async (
      scheduleId: string,
      data: { scheduled_at?: string; timezone?: string; platform_targets?: string[] }
    ): Promise<ScheduleItem> => {
      const overrides = loadPlanOverrides();
      const items = overrides.schedule ?? [];
      const idx = items.findIndex((s) => s.id === scheduleId);
      if (idx < 0) throw new Error("Schedule entry not found");
      items[idx] = { ...items[idx], ...data };
      overrides.schedule = items;
      savePlanOverrides(overrides);
      return items[idx];
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
      patchPost(postId, { status: "published" });
      const overrides = loadPlanOverrides();
      const state = loadCrudState();
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
      const attempts = targets.map((platform, i) => ({
        id: `dry-${Date.now()}-${i}`,
        platform,
        status: "success",
        platform_post_id: `dry-run-${postId}`,
        error_message: null,
        attempted_at: new Date().toISOString(),
      }));
      state.publishAttempts[postId] = [...attempts, ...(state.publishAttempts[postId] ?? [])];
      saveCrudState(state);
      return attempts;
    },
    attempts: async (): Promise<PublishAttempt[]> => [],
  },

  accounts: {
    list: async (): Promise<SocialAccount[]> => loadCrudState().accounts,
    connect: async (data: { platform: string; account_id: string; account_name: string; access_token: string }) => {
      const state = loadCrudState();
      const account: SocialAccount = {
        id: `acct-${Date.now()}`,
        platform: data.platform,
        account_id: data.account_id,
        account_name: data.account_name,
        connected: true,
      };
      state.accounts = [...state.accounts.filter((a) => a.platform !== data.platform), account];
      saveCrudState(state);
      return account;
    },
    disconnect: async (id: string) => {
      const state = loadCrudState();
      state.accounts = state.accounts.filter((a) => a.id !== id);
      saveCrudState(state);
    },
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
      overrides.deleted = [...new Set([...(overrides.deleted ?? []), id])];
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
    list: async () => pipelineListResponse(),

    create: async (data: {
      stage: PipelineStage;
      title?: string;
      body?: string;
      source_id?: string | null;
      highlight_id?: string | null;
      output_type?: PlanDeliverable | null;
    }) => {
      const items = loadPipelineItems();
      const now = new Date().toISOString();
      const stage = data.stage;
      const item: PipelineItem = {
        id: crypto.randomUUID(),
        stage,
        title:
          data.title?.trim() ||
          (stage === "source" ? "New source" : stage === "highlight" ? "New highlights" : "New output"),
        body: data.body ?? "",
        sort_order: nextPipelineSort(items, stage),
        source_id: data.source_id ?? null,
        highlight_id: data.highlight_id ?? null,
        output_type: stage === "output" ? data.output_type ?? "post" : null,
        created_at: now,
        updated_at: now,
      };
      items.push(item);
      savePipelineItems(items);
      return item;
    },

    update: async (
      id: string,
      data: Partial<{
        title: string;
        body: string;
        stage: PipelineStage;
        source_id: string | null;
        highlight_id: string | null;
        output_type: PlanDeliverable | null;
        sort_order: number;
      }>
    ) => {
      const items = loadPipelineItems();
      const idx = items.findIndex((i) => i.id === id);
      if (idx < 0) throw new Error("Pipeline item not found");
      const next = { ...items[idx], ...data, updated_at: new Date().toISOString() };
      if (next.stage !== "output") next.output_type = null;
      items[idx] = next;
      savePipelineItems(items);
      return next;
    },

    reorder: async (stage: PipelineStage, ids: string[]) => {
      const items = loadPipelineItems();
      ids.forEach((itemId, index) => {
        const idx = items.findIndex((i) => i.id === itemId);
        if (idx >= 0 && items[idx].stage === stage) {
          items[idx] = { ...items[idx], sort_order: index };
        }
      });
      savePipelineItems(items);
      return pipelineListResponse();
    },

    summarize: async (sourceId: string) => {
      const items = loadPipelineItems();
      const source = items.find((i) => i.id === sourceId);
      if (!source || source.stage !== "source") throw new Error("Only source items can be summarized");
      if (!source.body.trim()) throw new Error("Source has no content to summarize");
      const now = new Date().toISOString();
      const highlight: PipelineItem = {
        id: crypto.randomUUID(),
        stage: "highlight",
        title: `Highlights: ${source.title || "Source"}`,
        body: fallbackSummarize(source.body),
        sort_order: nextPipelineSort(items, "highlight"),
        source_id: source.id,
        highlight_id: null,
        output_type: null,
        created_at: now,
        updated_at: now,
      };
      items.push(highlight);
      savePipelineItems(items);
      return { highlight };
    },

    generateOutput: async (data: {
      output_type: PlanDeliverable;
      source_id?: string | null;
      highlight_id?: string | null;
    }) => {
      const items = loadPipelineItems();
      let content = "";
      let title = "";
      let fromHighlights = false;
      let sourceId = data.source_id ?? null;
      let highlightId = data.highlight_id ?? null;

      if (data.highlight_id) {
        const highlight = items.find((i) => i.id === data.highlight_id);
        if (!highlight || highlight.stage !== "highlight") {
          throw new Error("highlight_id must reference a highlight");
        }
        content = highlight.body;
        title = highlight.title || "Highlights";
        fromHighlights = true;
        sourceId = highlight.source_id ?? sourceId;
        highlightId = highlight.id;
      }
      if (data.source_id) {
        const source = items.find((i) => i.id === data.source_id);
        if (!source || source.stage !== "source") throw new Error("source_id must reference a source");
        sourceId = source.id;
        if (!content.trim()) {
          content = source.body;
          title = source.title || "Source";
          fromHighlights = false;
        }
      }
      if (!content.trim()) throw new Error("No content available to generate from");

      const typeLabel =
        OUTPUT_TYPE_OPTIONS.find((o) => o.value === data.output_type)?.label ?? "Output";
      const draft = fallbackPipelineOutput(content, title, data.output_type, fromHighlights);
      const now = new Date().toISOString();
      const output: PipelineItem = {
        id: crypto.randomUUID(),
        stage: "output",
        title: `${typeLabel}: ${title || "Untitled"}`,
        body: draft,
        sort_order: nextPipelineSort(items, "output"),
        source_id: sourceId,
        highlight_id: highlightId,
        output_type: data.output_type,
        created_at: now,
        updated_at: now,
      };
      items.push(output);
      savePipelineItems(items);
      return { output };
    },

    delete: async (id: string) => {
      const items = loadPipelineItems().filter((i) => i.id !== id);
      savePipelineItems(items);
    },
  },

  studio: {
    create: async (data: {
      title: string;
      source_text?: string;
      template_id?: string | null;
      plan_idea_id?: string | null;
    }) => {
      const id = `studio-${Date.now()}`;
      const snippet = (data.source_text || "").trim().slice(0, 600);
      const base = snippet ? `${data.title}\n\n${snippet}` : data.title;
      const now = new Date().toISOString();
      const post: Post = {
        id,
        title: data.title,
        status: "ready",
        post_creator_id: data.template_id ?? null,
        source_config: {
          type: "post",
          studio_source: true,
          source_text: data.source_text || "",
          content_idea_id: data.plan_idea_id ?? undefined,
        },
        created_at: now,
        updated_at: now,
        media_assets: [],
        variants: [
          {
            id: `${id}-ig`,
            platform: "instagram",
            caption: base.slice(0, 280),
            hashtags: ["#BrainHealth", "#USCCPBH"],
            ai_suggested_caption: null,
            approval_status: "pending",
          },
          {
            id: `${id}-fb`,
            platform: "facebook",
            caption: base.slice(0, 600),
            hashtags: ["#BrainHealth", "#USCCPBH"],
            ai_suggested_caption: null,
            approval_status: "pending",
          },
          {
            id: `${id}-li`,
            platform: "linkedin",
            caption: base.slice(0, 1200),
            hashtags: ["#BrainHealth", "#USCCPBH"],
            ai_suggested_caption: null,
            approval_status: "pending",
          },
        ],
      };
      runtimeCreatedPosts.set(id, post);
      return {
        post: applyPatches(post),
        message: data.template_id
          ? "Demo carousel + captions from your source (run localhost for real slides)."
          : "Demo captions from your pasted content (run localhost for AI generation).",
      };
    },
  },

  trends: {
    scan: async (params?: { limit?: number; force?: boolean }) => {
      const { scanBrainHealthTrends } = await import("./trends-scan");
      return scanBrainHealthTrends(params?.limit ?? 12, { force: params?.force });
    },
  },
};
