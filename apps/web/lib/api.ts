import { useAuthStore } from "./auth-store";
import { isStaticMode } from "./base-path";
import type {
  CommandResult,
  ContentIdea,
  ContentFormat,
  DashboardResponse,
  IdeaStatus,
  PlanDeliverable,
  PlanListResponse,
  PlanNotification,
  PlanWriteResponse,
  PlanPlatform,
  PlanSourceFile,
  Post,
  PostListResponse,
  Story,
  StoryListResponse,
  Template,
  TokenResponse,
  User,
} from "./types";
import type { PublishAttempt, ScheduleItem, SocialAccount } from "./schedule-types";
import { staticApi } from "./static-api";

const serverApiBase = () => {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8010";
  const origin = raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw}`;
  return `${origin}/api/v1`;
};

const API_BASE = typeof window !== "undefined" ? "/api" : serverApiBase();

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.detail || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function uploadRequest<T>(path: string, formData: FormData, method = "POST"): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    body: formData,
    headers,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.detail || response.statusText);
  }

  return response.json();
}

export { ApiError };

const liveApi = {
  auth: {
    register: (data: { email: string; name: string; password: string }) =>
      request<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify(data) }),

    login: (data: { email: string; password: string }) =>
      request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),

    me: () => request<User>("/auth/me"),
  },

  dashboard: {
    get: () => request<DashboardResponse>("/dashboard"),
  },

  templates: {
    list: () => request<Template[]>("/templates"),
  },

  commands: {
    run: (command: string) =>
      request<CommandResult>("/commands/run", {
        method: "POST",
        body: JSON.stringify({ command }),
      }),
  },

  posts: {
    list: (params?: { status?: string; skip?: number; limit?: number }) => {
      const search = new URLSearchParams();
      if (params?.status) search.set("status", params.status);
      if (params?.skip) search.set("skip", String(params.skip));
      if (params?.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      return request<PostListResponse>(`/posts${qs ? `?${qs}` : ""}`);
    },

    create: (data: { title: string; post_creator_id?: string }) =>
      request<Post>("/posts", { method: "POST", body: JSON.stringify(data) }),

    get: (id: string) => request<Post>(`/posts/${id}`),

    generate: (id: string) => request<Post>(`/posts/${id}/generate`, { method: "POST" }),

    update: (id: string, data: { title?: string; status?: string }) =>
      request<Post>(`/posts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

    approve: (id: string) => request<Post>(`/posts/${id}/approve`, { method: "POST" }),

    unapprove: (id: string) => request<Post>(`/posts/${id}/unapprove`, { method: "POST" }),

    submitReview: (id: string) =>
      request<Post>(`/posts/${id}/submit-review`, { method: "POST" }),

    updateVariant: (id: string, platform: string, caption: string) =>
      request(`/posts/${id}/variants/${platform}`, {
        method: "PATCH",
        body: JSON.stringify({ caption }),
      }),

    delete: (id: string) => request<void>(`/posts/${id}`, { method: "DELETE" }),

    optimizeCaptions: (id: string, platforms?: string[]) =>
      request<
        {
          platform: string;
          original_caption: string;
          optimized_caption: string;
          hashtags: string[];
        }[]
      >(`/posts/${id}/ai/optimize-captions`, {
        method: "POST",
        body: JSON.stringify({ platforms: platforms ?? null }),
      }),

    chatRefine: (
      id: string,
      message: string,
      opts?: { platform?: string; history?: { role: "user" | "assistant"; content: string }[] }
    ) =>
      request<{ reply: string; captions: { platform: string; caption: string }[] }>(
        `/posts/${id}/ai/chat`,
        {
          method: "POST",
          body: JSON.stringify({
            message,
            platform: opts?.platform ?? null,
            history: opts?.history ?? [],
          }),
        }
      ),

    reviewCompliance: (id: string) =>
      request<{ passed: boolean; issues: string[]; suggestions: string[] }>(
        `/posts/${id}/ai/review-compliance`,
        { method: "POST" }
      ),

    publishAttempts: (id: string) =>
      request<
        {
          id: string;
          platform: string;
          status: string;
          platform_post_id: string | null;
          error_message: string | null;
          attempted_at: string;
        }[]
      >(`/posts/${id}/publish-attempts`),
  },

  studio: {
    create: (data: {
      title: string;
      source_text?: string;
      template_id?: string | null;
      plan_idea_id?: string | null;
    }) =>
      request<{ post: Post; message: string }>("/studio/create", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  stories: {
    list: (params?: { skip?: number; limit?: number }) => {
      const search = new URLSearchParams();
      if (params?.skip) search.set("skip", String(params.skip));
      if (params?.limit) search.set("limit", String(params.limit));
      const qs = search.toString();
      return request<StoryListResponse>(`/stories${qs ? `?${qs}` : ""}`);
    },

    get: (id: string) => request<Story>(`/stories/${id}`),

    create: (data: {
      title: string;
      source_url?: string;
      category?: string;
      source_publish_date?: string;
      image: File;
    }) => {
      const form = new FormData();
      form.append("title", data.title);
      if (data.source_url) form.append("source_url", data.source_url);
      if (data.category) form.append("category", data.category);
      if (data.source_publish_date) form.append("source_publish_date", data.source_publish_date);
      form.append("image", data.image);
      return uploadRequest<Story>("/stories", form);
    },

    update: (id: string, data: {
      title?: string;
      source_url?: string | null;
      category?: string | null;
      source_publish_date?: string | null;
    }) =>
      request<Story>(`/stories/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

    replaceImage: (id: string, image: File) => {
      const form = new FormData();
      form.append("image", image);
      return uploadRequest<Story>(`/stories/${id}/image`, form);
    },

    delete: (id: string) => request<void>(`/stories/${id}`, { method: "DELETE" }),
  },

  schedule: {
    list: () => request<ScheduleItem[]>("/schedule"),

    create: (postId: string, data: { scheduled_at: string; timezone: string; platform_targets: string[] }) =>
      request(`/posts/${postId}/schedule`, { method: "POST", body: JSON.stringify(data) }),

    cancel: (scheduleId: string) => request<void>(`/schedule/${scheduleId}`, { method: "DELETE" }),

    update: (
      scheduleId: string,
      data: { scheduled_at?: string; timezone?: string; platform_targets?: string[] }
    ) =>
      request<ScheduleItem>(`/schedule/${scheduleId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    publishNow: (postId: string, platforms?: string[]) =>
      request<PublishAttempt[]>(`/posts/${postId}/publish-now`, {
        method: "POST",
        body: JSON.stringify({ platforms: platforms || ["instagram", "facebook", "linkedin"] }),
      }),

    attempts: (postId: string) => request<PublishAttempt[]>(`/posts/${postId}/publish-attempts`),
  },

  accounts: {
    list: () => request<SocialAccount[]>("/accounts"),

    connect: (data: { platform: string; account_id: string; account_name: string; access_token: string }) =>
      request<SocialAccount>("/accounts", { method: "POST", body: JSON.stringify(data) }),

    disconnect: (id: string) => request<void>(`/accounts/${id}`, { method: "DELETE" }),
  },

  plan: {
    list: (params?: { status?: IdeaStatus; theme?: string }) => {
      const search = new URLSearchParams();
      if (params?.status) search.set("status", params.status);
      if (params?.theme) search.set("theme", params.theme);
      const qs = search.toString();
      return request<PlanListResponse>(`/plan${qs ? `?${qs}` : ""}`);
    },

    team: () => request<{ name: string; email: string }[]>("/plan/team"),

    create: (data: {
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
    }) => request<PlanWriteResponse>("/plan", { method: "POST", body: JSON.stringify(data) }),

    update: (
      id: string,
      data: Partial<{
        title: string;
        theme: string | null;
        deliverable: PlanDeliverable;
        format: ContentFormat;
        platforms: PlanPlatform[];
        target_date: string | null;
        owner: string | null;
        assignee_email: string | null;
        status: IdeaStatus;
        notes: string | null;
        substack_url: string | null;
        substack_publish_date: string | null;
        notify_assignee: boolean;
      }>
    ) => request<PlanWriteResponse>(`/plan/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

    uploadSource: (id: string, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return uploadRequest<ContentIdea>(`/plan/${id}/sources`, formData);
    },

    deleteSource: (id: string, filename: string) =>
      request<ContentIdea>(`/plan/${id}/sources/${encodeURIComponent(filename)}`, { method: "DELETE" }),

    sendToSchedule: (id: string) =>
      request<{
        idea: ContentIdea;
        post_id: string;
        schedule_id: string;
        scheduled_at: string;
      }>(`/plan/${id}/send-to-schedule`, { method: "POST" }),

    notify: (id: string) =>
      request<PlanNotification>(`/plan/${id}/notify`, { method: "POST" }),

    delete: (id: string) => request<void>(`/plan/${id}`, { method: "DELETE" }),
  },

  pipeline: {
    list: () =>
      request<import("./pipeline-types").PipelineListResponse>("/pipeline"),

    create: (data: {
      stage: import("./pipeline-types").PipelineStage;
      title?: string;
      body?: string;
      source_id?: string | null;
      highlight_id?: string | null;
      output_type?: PlanDeliverable | null;
    }) => request<import("./pipeline-types").PipelineItem>("/pipeline", { method: "POST", body: JSON.stringify(data) }),

    update: (
      id: string,
      data: Partial<{
        title: string;
        body: string;
        stage: import("./pipeline-types").PipelineStage;
        source_id: string | null;
        highlight_id: string | null;
        output_type: PlanDeliverable | null;
        sort_order: number;
      }>
    ) =>
      request<import("./pipeline-types").PipelineItem>(`/pipeline/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    reorder: (stage: import("./pipeline-types").PipelineStage, ids: string[]) =>
      request<import("./pipeline-types").PipelineListResponse>(`/pipeline/reorder/${stage}`, {
        method: "POST",
        body: JSON.stringify({ ids }),
      }),

    summarize: (sourceId: string) =>
      request<{ highlight: import("./pipeline-types").PipelineItem }>(
        `/pipeline/${sourceId}/summarize`,
        { method: "POST" }
      ),

    generateOutput: (data: {
      output_type: PlanDeliverable;
      source_id?: string | null;
      highlight_id?: string | null;
    }) =>
      request<{ output: import("./pipeline-types").PipelineItem }>("/pipeline/generate-output", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    delete: (id: string) => request<void>(`/pipeline/${id}`, { method: "DELETE" }),
  },

  trends: {
    scan: (params?: { limit?: number }) => {
      const qs = params?.limit ? `?limit=${params.limit}` : "";
      return request<import("./trends-types").TrendScanResponse>(`/trends/scan${qs}`);
    },
  },
};

function resolveApi() {
  return isStaticMode() ? staticApi : liveApi;
}

type Api = typeof liveApi;

export const api: Api = new Proxy({} as Api, {
  get(_target, prop: string | symbol) {
    const impl = resolveApi() as Record<string | symbol, unknown>;
    const value = impl[prop];
    if (typeof value === "object" && value !== null) {
      return new Proxy(value, {
        get(_nested, method) {
          const current = (resolveApi() as Record<string | symbol, unknown>)[prop] as Record<
            string | symbol,
            unknown
          >;
          const fn = current[method as string];
          return typeof fn === "function" ? fn.bind(current) : fn;
        },
      });
    }
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(impl);
    }
    return value;
  },
});
