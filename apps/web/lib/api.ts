import { useAuthStore } from "./auth-store";
import { isStaticMode } from "./base-path";
import type {
  CommandResult,
  ContentIdea,
  ContentFormat,
  DashboardResponse,
  IdeaStatus,
  PlanListResponse,
  Post,
  PostListResponse,
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

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.detail || response.statusText);
  }

  if (response.status === 204) {
    return undefined as T;
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

    approve: (id: string) => request<Post>(`/posts/${id}/approve`, { method: "POST" }),

    unapprove: (id: string) => request<Post>(`/posts/${id}/unapprove`, { method: "POST" }),

    updateVariant: (id: string, platform: string, caption: string) =>
      request(`/posts/${id}/variants/${platform}`, {
        method: "PATCH",
        body: JSON.stringify({ caption }),
      }),

    delete: (id: string) => request<void>(`/posts/${id}`, { method: "DELETE" }),
  },

  schedule: {
    list: () => request<ScheduleItem[]>("/schedule"),

    create: (postId: string, data: { scheduled_at: string; timezone: string; platform_targets: string[] }) =>
      request(`/posts/${postId}/schedule`, { method: "POST", body: JSON.stringify(data) }),

    cancel: (scheduleId: string) => request<void>(`/schedule/${scheduleId}`, { method: "DELETE" }),

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

    create: (data: {
      title: string;
      theme?: string | null;
      format?: ContentFormat;
      target_date?: string | null;
      owner?: string | null;
      status?: IdeaStatus;
      notes?: string | null;
    }) => request<ContentIdea>("/plan", { method: "POST", body: JSON.stringify(data) }),

    update: (
      id: string,
      data: Partial<{
        title: string;
        theme: string | null;
        format: ContentFormat;
        target_date: string | null;
        owner: string | null;
        status: IdeaStatus;
        notes: string | null;
      }>
    ) => request<ContentIdea>(`/plan/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

    delete: (id: string) => request<void>(`/plan/${id}`, { method: "DELETE" }),
  },
};

export const api = isStaticMode() ? staticApi : liveApi;
