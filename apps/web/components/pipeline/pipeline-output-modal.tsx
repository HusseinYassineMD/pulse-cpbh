"use client";

import { Sparkles } from "lucide-react";
import type { PipelineItem } from "@/lib/pipeline-types";
import { OUTPUT_TYPE_OPTIONS } from "@/lib/pipeline-types";
import type { PlanDeliverable } from "@/lib/types";
import { PlanModal } from "@/components/plan/plan-modal";
import { VisibleContent } from "@/components/ui/visible-content";

export type OutputGenerateTarget =
  | { kind: "source"; item: PipelineItem }
  | { kind: "highlight"; item: PipelineItem };

type Props = {
  open: boolean;
  target: OutputGenerateTarget;
  linkedSource?: PipelineItem;
  onClose: () => void;
  onGenerate: (outputType: PlanDeliverable) => void;
  generating?: boolean;
};

export function PipelineOutputModal({
  open,
  target,
  linkedSource,
  onClose,
  onGenerate,
  generating,
}: Props) {
  const fromLabel = target.kind === "source" ? "source content" : "highlights";
  const preview = target.item.body?.trim() || "(No content yet — add text before generating.)";
  const hasContent = !!target.item.body?.trim();

  return (
    <PlanModal
      open={open}
      onClose={onClose}
      title="Create output"
      footer={
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2.5 rounded-lg text-sm border border-border hover:bg-secondary disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="pipeline-output-form"
            disabled={generating || !hasContent}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {generating ? "Generating…" : "Generate output"}
          </button>
        </div>
      }
    >
      <form
        id="pipeline-output-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onGenerate((fd.get("output_type") as PlanDeliverable) || "post");
        }}
      >
        <div className="rounded-xl bg-teal/5 border border-teal/20 px-4 py-3 text-sm text-foreground/90">
          <p className="font-medium text-teal">From {fromLabel}</p>
          <p className="text-muted-foreground mt-0.5 break-words">{target.item.title || "Untitled"}</p>
          {target.kind === "highlight" && linkedSource && (
            <p className="text-xs text-muted-foreground mt-1">
              Linked source: {linkedSource.title || "Untitled"}
            </p>
          )}
        </div>

        <label className="block text-sm">
          <span className="text-muted-foreground">What do you want to create?</span>
          <select name="output_type" defaultValue="post" className="form-input mt-1 w-full">
            {OUTPUT_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <div className="text-sm">
          <span className="text-muted-foreground">Preview of input</span>
          <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-secondary/30 p-3">
            <VisibleContent text={preview} maxLines={12} />
          </div>
        </div>

        {!hasContent && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Add content to this {target.kind} first, then generate an output.
          </p>
        )}
      </form>
    </PlanModal>
  );
}
