"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Link2, Pencil, Sparkles, Trash2, ArrowRight } from "lucide-react";
import type { PipelineItem } from "@/lib/pipeline-types";
import { OUTPUT_TYPE_OPTIONS } from "@/lib/pipeline-types";
import { VisibleContent } from "@/components/ui/visible-content";

type Props = {
  item: PipelineItem;
  linkedSource?: PipelineItem;
  linkedHighlight?: PipelineItem;
  onEdit: () => void;
  onDelete: () => void;
  onSummarize?: () => void;
  onCreateOutput?: () => void;
  onSendToStudio?: () => void;
  summarizing?: boolean;
  generatingOutput?: boolean;
  flash?: boolean;
};

export function PipelineCard({
  item,
  linkedSource,
  linkedHighlight,
  onEdit,
  onDelete,
  onSummarize,
  onCreateOutput,
  onSendToStudio,
  summarizing,
  generatingOutput,
  flash,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const outputLabel = OUTPUT_TYPE_OPTIONS.find((o) => o.value === item.output_type)?.label;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`pulse-card p-3 flex flex-col gap-2 border bg-white shadow-sm transition-shadow ${
        flash ? "border-teal ring-2 ring-teal/30 shadow-md" : "border-border/80"
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 p-2.5 min-w-[44px] min-h-[44px] rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-grab active:cursor-grabbing touch-none hidden sm:flex items-center justify-center"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder or move"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm leading-snug break-words">{item.title || "Untitled"}</h3>
          {item.stage === "output" && outputLabel && (
            <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal/15 text-teal">
              {outputLabel}
            </span>
          )}
        </div>
      </div>

      {item.body && (
        <div className="pl-0 sm:pl-7">
          <VisibleContent text={item.body} maxLines={6} className="text-muted-foreground" />
        </div>
      )}

      {(linkedSource || linkedHighlight) && (
        <div className="pl-0 sm:pl-7 flex flex-wrap gap-1.5">
          {linkedSource && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              <Link2 className="w-3 h-3" />
              Source: {linkedSource.title || "Untitled"}
            </span>
          )}
          {linkedHighlight && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
              <Link2 className="w-3 h-3" />
              Highlights: {linkedHighlight.title || "Untitled"}
            </span>
          )}
        </div>
      )}

      <div className="pl-0 sm:pl-7 flex flex-wrap gap-1.5 pt-1">
        {item.stage === "source" && onSummarize && (
          <ActionBtn
            onClick={onSummarize}
            icon={Sparkles}
            label={summarizing ? "Summarizing…" : "Summarize"}
            primary
            disabled={summarizing || !item.body?.trim()}
            title={!item.body?.trim() ? "Add source content first" : "AI summary → Highlights column"}
          />
        )}
        {item.stage === "highlight" && onCreateOutput && (
          <ActionBtn
            onClick={onCreateOutput}
            icon={ArrowRight}
            label={generatingOutput ? "Generating…" : "Create output"}
            primary
            disabled={generatingOutput || !item.body?.trim()}
          />
        )}
        {item.stage === "source" && onCreateOutput && (
          <ActionBtn
            onClick={onCreateOutput}
            icon={ArrowRight}
            label={generatingOutput ? "Generating…" : "Create output"}
            disabled={generatingOutput || !item.body?.trim()}
            title="Skip highlights — generate post, caption, or story directly"
          />
        )}
        {item.stage === "output" && onSendToStudio && (
          <ActionBtn
            onClick={onSendToStudio}
            icon={Sparkles}
            label="Open in Studio"
            primary
            disabled={!item.body?.trim()}
          />
        )}
        <ActionBtn onClick={onEdit} icon={Pencil} label="Edit" />
        <ActionBtn onClick={onDelete} icon={Trash2} label="Delete" danger />
      </div>
    </article>
  );
}

function ActionBtn({
  onClick,
  icon: Icon,
  label,
  primary,
  danger,
  disabled,
  title,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
        primary
          ? "bg-teal/15 text-teal border border-teal/30"
          : danger
            ? "text-red-600 hover:bg-red-50"
            : "bg-secondary text-foreground hover:bg-secondary/80"
      }`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}
