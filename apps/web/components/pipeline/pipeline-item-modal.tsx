"use client";

import type { PipelineItem, PipelineStage } from "@/lib/pipeline-types";
import { OUTPUT_TYPE_OPTIONS } from "@/lib/pipeline-types";
import type { PlanDeliverable } from "@/lib/types";
import { PlanModal } from "@/components/plan/plan-modal";

type Props = {
  open: boolean;
  stage: PipelineStage;
  item?: PipelineItem;
  sources: PipelineItem[];
  highlights: PipelineItem[];
  onClose: () => void;
  onSave: (data: {
    title: string;
    body: string;
    source_id: string | null;
    highlight_id: string | null;
    output_type: PlanDeliverable | null;
  }) => void;
  onSaveAndSummarize?: (data: {
    title: string;
    body: string;
    source_id: string | null;
    highlight_id: string | null;
    output_type: PlanDeliverable | null;
  }) => void;
  saving?: boolean;
  savingAndSummarizing?: boolean;
};

export function PipelineItemModal({
  open,
  stage,
  item,
  sources,
  highlights,
  onClose,
  onSave,
  onSaveAndSummarize,
  saving,
  savingAndSummarizing,
}: Props) {
  const title = item?.title ?? "";
  const body = item?.body ?? "";

  return (
    <PlanModal
      open={open}
      onClose={onClose}
      title={
        item
          ? `Edit ${stage}`
          : stage === "source"
            ? "Add source content"
            : stage === "highlight"
              ? "Add highlights"
              : "Add output"
      }
      footer={
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || savingAndSummarizing}
            className="px-4 py-2.5 rounded-lg text-sm border border-border hover:bg-secondary disabled:opacity-60"
          >
            Cancel
          </button>
          {stage === "source" && onSaveAndSummarize && (
            <button
              type="button"
              disabled={saving || savingAndSummarizing}
              onClick={() => {
                const form = document.getElementById("pipeline-item-form") as HTMLFormElement | null;
                if (!form) return;
                const fd = new FormData(form);
                onSaveAndSummarize({
                  title: String(fd.get("title") || ""),
                  body: String(fd.get("body") || ""),
                  source_id: (fd.get("source_id") as string) || null,
                  highlight_id: (fd.get("highlight_id") as string) || null,
                  output_type: (fd.get("output_type") as PlanDeliverable) || null,
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-teal/15 text-teal border border-teal/30 hover:bg-teal/25 disabled:opacity-50"
            >
              {savingAndSummarizing ? "Summarizing…" : "Save & summarize"}
            </button>
          )}
          <button
            type="submit"
            form="pipeline-item-form"
            disabled={saving || savingAndSummarizing}
            className="btn-primary px-5 py-2.5 rounded-lg text-sm disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      <form
        id="pipeline-item-form"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          onSave({
            title: String(fd.get("title") || ""),
            body: String(fd.get("body") || ""),
            source_id: (fd.get("source_id") as string) || null,
            highlight_id: (fd.get("highlight_id") as string) || null,
            output_type: (fd.get("output_type") as PlanDeliverable) || null,
          });
        }}
      >
        <label className="block text-sm">
          <span className="text-muted-foreground">Title</span>
          <input
            name="title"
            defaultValue={title}
            className="form-input mt-1 w-full"
            placeholder={stage === "source" ? "e.g. Substack article draft" : "Short label"}
          />
        </label>

        {stage === "highlight" && (
          <label className="block text-sm">
            <span className="text-muted-foreground">Linked source (optional)</span>
            <select name="source_id" defaultValue={item?.source_id ?? ""} className="form-input mt-1 w-full">
              <option value="">None — paste highlights manually</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title || "Untitled source"}
                </option>
              ))}
            </select>
          </label>
        )}

        {stage === "output" && (
          <>
            <label className="block text-sm">
              <span className="text-muted-foreground">Output type</span>
              <select
                name="output_type"
                defaultValue={item?.output_type ?? "post"}
                className="form-input mt-1 w-full"
              >
                {OUTPUT_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">From highlights (usual flow)</span>
              <select name="highlight_id" defaultValue={item?.highlight_id ?? ""} className="form-input mt-1 w-full">
                <option value="">Skip — link source only</option>
                {highlights.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.title || "Untitled highlights"}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">From source (shortcut 1→3)</span>
              <select name="source_id" defaultValue={item?.source_id ?? ""} className="form-input mt-1 w-full">
                <option value="">None</option>
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title || "Untitled source"}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <label className="block text-sm">
          <span className="text-muted-foreground">
            {stage === "source"
              ? "Paste source content"
              : stage === "highlight"
                ? "Highlights / summary"
                : "Draft copy or notes"}
          </span>
          <textarea
            name="body"
            defaultValue={body}
            rows={stage === "source" ? 12 : 8}
            className="form-input mt-1 w-full font-mono text-sm"
            placeholder={
              stage === "source"
                ? "Paste article text, study notes, newsletter draft…"
                : "Bullet points, draft caption, etc."
            }
          />
        </label>
      </form>
    </PlanModal>
  );
}
