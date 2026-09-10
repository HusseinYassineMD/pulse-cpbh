import type { PlanDeliverable } from "./types";

export interface TrendItem {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string;
  published_at: string | null;
  theme: string;
  suggested_hook: string;
  deliverable: PlanDeliverable;
}

export interface TrendScanResponse {
  scanned_at: string;
  sources_checked: string[];
  items: TrendItem[];
}
