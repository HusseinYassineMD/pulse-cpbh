import type { PlanDeliverable } from "./types";

export type PipelineStage = "source" | "highlight" | "output";

export interface PipelineItem {
  id: string;
  stage: PipelineStage;
  title: string;
  body: string;
  sort_order: number;
  source_id: string | null;
  highlight_id: string | null;
  output_type: PlanDeliverable | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineListResponse {
  items: PipelineItem[];
  total: number;
}

export const PIPELINE_STAGES: {
  id: PipelineStage;
  label: string;
  description: string;
  step: number;
}[] = [
  {
    id: "source",
    label: "Source content",
    description: "Paste articles, notes, or raw material",
    step: 1,
  },
  {
    id: "highlight",
    label: "Highlights",
    description: "AI summary or your own bullet points",
    step: 2,
  },
  {
    id: "output",
    label: "Outputs",
    description: "Generated posts, captions, stories & more",
    step: 3,
  },
];

export const OUTPUT_TYPE_OPTIONS: { value: PlanDeliverable; label: string }[] = [
  { value: "post", label: "Post" },
  { value: "caption", label: "Caption" },
  { value: "story", label: "Story" },
  { value: "newsletter", label: "Newsletter" },
  { value: "patient_handout", label: "Patient handout" },
];
