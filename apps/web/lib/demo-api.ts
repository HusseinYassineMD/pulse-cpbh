import type {
  CommandResult,
  DashboardResponse,
  Post,
  PostListResponse,
  Template,
  TokenResponse,
  User,
} from "./types";
import type { PublishAttempt, ScheduleItem, SocialAccount } from "./schedule-types";
import {
  DEMO_TEMPLATES,
  DEMO_USER,
  buildDashboard,
  createDemoStore,
  type DemoStore,
} from "./demo-data";
import { assetPath } from "./base-path";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function delay(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cloneStore(store: DemoStore): DemoStore {
  return JSON.parse(JSON.stringify(store)) as DemoStore;
}

let store: DemoStore = createDemoStore();

function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function findPost(id: string) {
  const post = store.posts.find((p) => p.id === id);
  if (!post) throw new ApiError(404, "Post not found");
  return post;
}

async function request<T>(fn: () => T | Promise<T>): Promise<T> {
  await delay(150);
  return fn();
}

export const demoApi = {
  auth: {
    register: (data: { email: string; name: string; password: string }) =>
      request<TokenResponse>(() => ({
        access_token: "demo-token",
        refresh_token: "demo-refresh",
        token_type: "bearer",
      })),

    login: (_data: { email: string; password: string }) =>
      request<TokenResponse>(() => ({
        access_token: "demo-token",
        refresh_token: "demo-refresh",
        token_type: "bearer",
      })),

    me: () => request<User>(() => DEMO_USER),
  },

  dashboard: {
    get: () => request<DashboardResponse>(() => buildDashboard(store.posts)),
  },

  templates: {
    list: () => request<Template[]>(() => DEMO_TEMPLATES),
  },

  commands: {
    run: (command: string) =>
      request<CommandResult>(() => ({
        message: `Demo mode: "${command}" would create a post when connected to the live API.`,
        help_text: "Try browsing the 15 sample posts, schedule view, and post detail pages.",
        post: null,
      })),
  },

  posts: {
    list: (params?: { status?: string; skip?: number; limit?: number }) =>
      request<PostListResponse>(() => {
        let items = [...store.posts];
        if (params?.status) items = items.filter((p) => p.status === params.status);
        items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const skip = params?.skip ?? 0;
        const limit = params?.limit ?? 50;
        const slice = items.slice(skip, skip + limit);
        return { items: slice, total: items.length };
      }),

    create: (data: { title: string; post_creator_id?: string }) =>
      request<Post>(() => {
        const now = new Date().toISOString();
        const post: Post = {
          id: nextId("post"),
          title: data.title,
          status: "draft",
          post_creator_id: data.post_creator_id ?? null,
          source_config: { demo: true, type: "carousel" },
          created_at: now,
          updated_at: now,
          variants: [],
          media_assets: [],
        };
        store.posts.unshift(post);
        return post;
      }),

    get: (id: string) => request<Post>(() => ({ ...findPost(id) })),

    generate: (id: string) =>
      request<Post>(() => {
        const post = findPost(id);
        post.status = "ready";
        post.media_assets = [
          {
            id: nextId("media"),
            s3_key: "slide_01.png",
            mime_type: "image/svg+xml",
            sort_order: 0,
            alt_text: post.title,
            url: assetPath("/demo/slide-teal.svg"),
          },
        ];
        post.variants = [
          {
            id: nextId("variant"),
            platform: "instagram",
            caption: `Generated demo caption for ${post.title}.`,
            ai_suggested_caption: null,
            hashtags: null,
            approval_status: "approved",
          },
        ];
        post.updated_at = new Date().toISOString();
        return { ...post };
      }),

    approve: (id: string) =>
      request<Post>(() => {
        const post = findPost(id);
        post.status = "approved";
        post.updated_at = new Date().toISOString();
        return { ...post };
      }),

    updateVariant: (id: string, platform: string, caption: string) =>
      request(() => {
        const post = findPost(id);
        const variant = post.variants.find((v) => v.platform === platform);
        if (!variant) throw new ApiError(404, "Variant not found");
        variant.caption = caption;
        post.updated_at = new Date().toISOString();
        return { ...variant };
      }),

    delete: (id: string) =>
      request<void>(() => {
        store.posts = store.posts.filter((p) => p.id !== id);
        store.schedule = store.schedule.filter((s) => s.post_id !== id);
      }),
  },

  schedule: {
    list: () => request<ScheduleItem[]>(() => [...store.schedule]),

    create: (postId: string, data: { scheduled_at: string; timezone: string; platform_targets: string[] }) =>
      request(() => {
        const post = findPost(postId);
        const item: ScheduleItem = {
          id: nextId("sched"),
          post_id: postId,
          post_title: post.title,
          scheduled_at: data.scheduled_at,
          timezone: data.timezone,
          status: "pending",
          platform_targets: data.platform_targets,
        };
        store.schedule.push(item);
        post.status = "scheduled";
        post.updated_at = new Date().toISOString();
        return item;
      }),

    cancel: (scheduleId: string) =>
      request<void>(() => {
        store.schedule = store.schedule.filter((s) => s.id !== scheduleId);
      }),

    publishNow: (postId: string, platforms?: string[]) =>
      request<PublishAttempt[]>(() => {
        const targets = platforms || ["instagram", "facebook", "linkedin"];
        const post = findPost(postId);
        post.status = "published";
        post.updated_at = new Date().toISOString();
        return targets.map((platform) => ({
          id: nextId("pa"),
          platform,
          status: "success",
          platform_post_id: `demo_${platform}`,
          error_message: null,
          attempted_at: new Date().toISOString(),
        }));
      }),

    attempts: (postId: string) =>
      request<PublishAttempt[]>(() => store.publishAttempts[postId] ?? []),
  },

  accounts: {
    list: () => request<SocialAccount[]>(() => []),

    connect: (data: { platform: string; account_id: string; account_name: string; access_token: string }) =>
      request<SocialAccount>(() => ({
        id: nextId("acct"),
        platform: data.platform,
        account_id: data.account_id,
        account_name: data.account_name,
        connected: true,
      })),

    disconnect: (_id: string) => request<void>(() => undefined),
  },
};

export function resetDemoStore() {
  store = cloneStore(createDemoStore());
}

export { ApiError as DemoApiError };
