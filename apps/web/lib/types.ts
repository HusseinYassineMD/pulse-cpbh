export type UserRole = "admin" | "editor" | "reviewer" | "viewer";

export type PostStatus =
  | "draft"
  | "generating"
  | "ready"
  | "in_review"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "partially_published"
  | "failed";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface Post {
  id: string;
  title: string;
  status: PostStatus;
  post_creator_id: string | null;
  source_config?: { type?: string; command?: string } | null;
  created_at: string;
  updated_at: string;
  variants: PostVariant[];
  media_assets: MediaAsset[];
}

export interface CommandResult {
  message: string;
  help_text: string | null;
  post: Post | null;
}

export interface PostVariant {
  id: string;
  platform: string;
  caption: string;
  ai_suggested_caption: string | null;
  hashtags: string[] | null;
  approval_status: string;
}

export interface MediaAsset {
  id: string;
  s3_key: string;
  mime_type: string;
  sort_order: number;
  alt_text: string | null;
  url: string | null;
}

export interface Template {
  post_creator_id: string;
  title: string;
  slide_count: number;
  platforms: string[];
}

export interface PostListResponse {
  items: Post[];
  total: number;
}

export interface DashboardStats {
  scheduled: number;
  published: number;
  in_review: number;
  drafts: number;
  total: number;
}

export interface RecentPost {
  id: string;
  title: string;
  status: PostStatus;
  created_at: string;
  platform_count: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recent_posts: RecentPost[];
}
