export type ScheduleStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface ScheduleItem {
  id: string;
  post_id: string;
  post_title: string;
  content_type?: string;
  content_idea_id?: string | null;
  scheduled_at: string;
  timezone: string;
  status: ScheduleStatus;
  platform_targets: string[];
}

export interface PublishAttempt {
  id: string;
  platform: string;
  status: string;
  platform_post_id: string | null;
  error_message: string | null;
  attempted_at: string;
}

export interface SocialAccount {
  id: string;
  platform: string;
  account_id: string;
  account_name: string;
  connected: boolean;
}
