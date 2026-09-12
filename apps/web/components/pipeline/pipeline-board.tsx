"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { PipelineItem, PipelineStage } from "@/lib/pipeline-types";
import { PIPELINE_STAGES } from "@/lib/pipeline-types";
import type { PlanDeliverable } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PipelineCard } from "./pipeline-card";
import { PipelineItemModal } from "./pipeline-item-modal";
import { PipelineOutputModal, type OutputGenerateTarget } from "./pipeline-output-modal";

type ItemForm = {
  title: string;
  body: string;
  source_id: string | null;
  highlight_id: string | null;
  output_type: PlanDeliverable | null;
};

function columnDropHint(stage: PipelineStage, dragging?: PipelineItem): string | null {
  if (!dragging) return null;
  if (dragging.stage === stage) return "Drop to reorder";
  if (dragging.stage === "source" && stage === "highlight") return "Drop to summarize →";
  if (dragging.stage === "source" && stage === "output") return "Drop to create output →";
  if (dragging.stage === "highlight" && stage === "output") return "Drop to create output →";
  return null;
}

function Column({
  stage,
  label,
  description,
  step,
  items,
  draggingItem,
  children,
}: {
  stage: PipelineStage;
  label: string;
  description: string;
  step: number;
  items: PipelineItem[];
  draggingItem?: PipelineItem;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const hint = columnDropHint(stage, draggingItem);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-h-[280px] md:min-h-[420px] rounded-2xl border-2 transition-all duration-200 ${
        isOver && hint
          ? "border-teal bg-teal/10 shadow-md shadow-teal/10 scale-[1.01]"
          : isOver
            ? "border-teal/50 bg-teal/5"
            : draggingItem && hint
              ? "border-teal/30 bg-teal/[0.02]"
              : "border-border/70 bg-white/50"
      }`}
    >
      <div className="px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
            {step}
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm">{label}</h2>
            <p className="text-[11px] text-muted-foreground">{description}</p>
            {hint && draggingItem && (
              <p className="text-[10px] font-semibold text-teal mt-0.5">{hint}</p>
            )}
          </div>
          <span className="ml-auto text-xs tabular-nums text-muted-foreground bg-secondary px-2 py-0.5 rounded-full shrink-0">
            {items.length}
          </span>
        </div>
      </div>
      <div className="p-3 flex-1 space-y-2 min-h-[120px]">{children}</div>
    </div>
  );
}

export function PipelineBoard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalStage, setModalStage] = useState<PipelineStage | null>(null);
  const [editing, setEditing] = useState<PipelineItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [generatingFromId, setGeneratingFromId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PipelineItem | null>(null);
  const [outputTarget, setOutputTarget] = useState<OutputGenerateTarget | null>(null);
  const [flashHighlightId, setFlashHighlightId] = useState<string | null>(null);
  const [flashOutputId, setFlashOutputId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<PipelineStage>("source");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } })
  );

  const { data, isLoading } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => api.pipeline.list(),
  });

  const items = data?.items ?? [];

  const byStage = useMemo(
    () => ({
      source: items.filter((i) => i.stage === "source").sort((a, b) => a.sort_order - b.sort_order),
      highlight: items.filter((i) => i.stage === "highlight").sort((a, b) => a.sort_order - b.sort_order),
      output: items.filter((i) => i.stage === "output").sort((a, b) => a.sort_order - b.sort_order),
    }),
    [items]
  );

  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["pipeline"] });

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(""), 6000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  useEffect(() => {
    if (!flashHighlightId) return;
    const el = document.getElementById(`pipeline-card-${flashHighlightId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const t = window.setTimeout(() => setFlashHighlightId(null), 4000);
    return () => window.clearTimeout(t);
  }, [flashHighlightId, items]);

  useEffect(() => {
    if (!flashOutputId) return;
    const el = document.getElementById(`pipeline-card-${flashOutputId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const t = window.setTimeout(() => setFlashOutputId(null), 4000);
    return () => window.clearTimeout(t);
  }, [flashOutputId, items]);

  const create = useMutation({
    mutationFn: api.pipeline.create,
    onSuccess: () => {
      invalidate();
      setModalStage(null);
      setEditing(null);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not create"),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof api.pipeline.update>[1] }) =>
      api.pipeline.update(id, patch),
    onSuccess: () => {
      invalidate();
      setModalStage(null);
      setEditing(null);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not save"),
  });

  const remove = useMutation({
    mutationFn: api.pipeline.delete,
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
    },
  });

  const reorder = useMutation({
    mutationFn: ({ stage, ids }: { stage: PipelineStage; ids: string[] }) => api.pipeline.reorder(stage, ids),
    onSuccess: invalidate,
  });

  const summarize = useMutation({
    mutationFn: api.pipeline.summarize,
    onMutate: (id) => {
      setSummarizingId(id);
      setError("");
    },
    onSettled: () => setSummarizingId(null),
    onSuccess: (data) => {
      invalidate();
      setFlashHighlightId(data.highlight.id);
      setMobilePanel("highlight");
      setSuccessMessage("Highlights ready — check the middle column.");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Summarize failed"),
  });

  const generateOutput = useMutation({
    mutationFn: api.pipeline.generateOutput,
    onMutate: (vars) => {
      setGeneratingFromId(vars.highlight_id ?? vars.source_id ?? null);
      setError("");
    },
    onSettled: () => setGeneratingFromId(null),
    onSuccess: (data) => {
      invalidate();
      setOutputTarget(null);
      setFlashOutputId(data.output.id);
      setMobilePanel("output");
      setSuccessMessage("Output created — edit or copy from the right column.");
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not generate output"),
  });

  const saveAndSummarize = useMutation({
    mutationFn: async ({ form, sourceId }: { form: ItemForm; sourceId?: string }) => {
      if (!form.body.trim()) {
        throw new ApiError(400, "Add source content before summarizing");
      }
      let id = sourceId;
      if (id) {
        await api.pipeline.update(id, { title: form.title, body: form.body });
      } else {
        const created = await api.pipeline.create({
          stage: "source",
          title: form.title,
          body: form.body,
        });
        id = created.id;
      }
      return api.pipeline.summarize(id);
    },
    onSuccess: (data, vars) => {
      invalidate();
      setModalStage(null);
      setEditing(null);
      setFlashHighlightId(data.highlight.id);
      setMobilePanel("highlight");
      setSuccessMessage(
        vars.sourceId
          ? "Source saved and summarized — highlights are in the middle column."
          : "Source added and summarized — highlights are in the middle column."
      );
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Save & summarize failed"),
  });

  const openOutputModal = (target: OutputGenerateTarget) => {
    setError("");
    setOutputTarget(target);
  };

  const handleGenerateOutput = (outputType: PlanDeliverable) => {
    if (!outputTarget) return;
    generateOutput.mutate({
      output_type: outputType,
      source_id: outputTarget.kind === "source" ? outputTarget.item.id : outputTarget.item.source_id,
      highlight_id: outputTarget.kind === "highlight" ? outputTarget.item.id : null,
    });
  };

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeItem = itemMap.get(String(active.id));
    if (!activeItem) return;

    const overId = String(over.id);
    const targetStage = (["source", "highlight", "output"] as PipelineStage[]).includes(
      overId as PipelineStage
    )
      ? (overId as PipelineStage)
      : itemMap.get(overId)?.stage;

    if (!targetStage) return;

    if (targetStage === activeItem.stage) {
      const column = byStage[targetStage];
      const oldIndex = column.findIndex((i) => i.id === activeItem.id);
      if (oldIndex < 0) return;

      let overIndex = column.findIndex((i) => i.id === overId);
      if (overIndex < 0 && overId === targetStage) {
        overIndex = column.length - 1;
      }
      if (overIndex < 0 || oldIndex === overIndex) return;

      const next = [...column];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(overIndex, 0, moved);
      reorder.mutate({ stage: targetStage, ids: next.map((i) => i.id) });
      return;
    }

    if (activeItem.stage === "source" && targetStage === "highlight") {
      if (!activeItem.body?.trim()) {
        setError("Add source content before summarizing.");
        return;
      }
      summarize.mutate(activeItem.id);
      return;
    }

    if (activeItem.stage === "source" && targetStage === "output") {
      if (!activeItem.body?.trim()) {
        setError("Add source content before creating an output.");
        return;
      }
      openOutputModal({ kind: "source", item: activeItem });
      return;
    }

    if (activeItem.stage === "highlight" && targetStage === "output") {
      if (!activeItem.body?.trim()) {
        setError("Add highlight content before creating an output.");
        return;
      }
      openOutputModal({ kind: "highlight", item: activeItem });
    }
  };

  const openCreate = (stage: PipelineStage) => {
    setEditing(null);
    setModalStage(stage);
    setError("");
  };

  const openEdit = (item: PipelineItem) => {
    setEditing(item);
    setModalStage(item.stage);
    setError("");
  };

  const activeItem = activeId ? itemMap.get(activeId) : undefined;

  const renderStageColumn = (col: (typeof PIPELINE_STAGES)[number]) => (
    <Column
      key={col.id}
      stage={col.id}
      label={col.label}
      description={col.description}
      step={col.step}
      items={byStage[col.id]}
      draggingItem={activeItem}
    >
      <SortableContext items={byStage[col.id].map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {byStage[col.id].map((item) => (
          <div key={item.id} id={`pipeline-card-${item.id}`}>
            <PipelineCard
              item={item}
              linkedSource={item.source_id ? itemMap.get(item.source_id) : undefined}
              linkedHighlight={item.highlight_id ? itemMap.get(item.highlight_id) : undefined}
              flash={item.id === flashHighlightId || item.id === flashOutputId}
              onEdit={() => openEdit(item)}
              onDelete={() => setDeleteTarget(item)}
              onSummarize={
                item.stage === "source"
                  ? () => {
                      if (!item.body?.trim()) {
                        setError("Paste source content first, then click Summarize.");
                        return;
                      }
                      summarize.mutate(item.id);
                    }
                  : undefined
              }
              onCreateOutput={
                item.stage === "source"
                  ? () => openOutputModal({ kind: "source", item })
                  : item.stage === "highlight"
                    ? () => openOutputModal({ kind: "highlight", item })
                    : undefined
              }
              summarizing={summarizingId === item.id}
              generatingOutput={generatingFromId === item.id}
              onSendToStudio={
                item.stage === "output"
                  ? () =>
                      router.push(
                        `/studio?title=${encodeURIComponent(item.title || "Pipeline output")}&notes=${encodeURIComponent(item.body || "")}`
                      )
                  : undefined
              }
            />
          </div>
        ))}
      </SortableContext>
      <button
        type="button"
        onClick={() => openCreate(col.id)}
        className="w-full flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add {col.label.toLowerCase()}
      </button>
    </Column>
  );

  if (isLoading) {
    return (
      <>
        <div className="md:hidden pulse-card h-80 animate-pulse bg-gray-100 rounded-2xl" />
        <div className="hidden md:grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="pulse-card h-80 animate-pulse bg-gray-100" />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      {successMessage && (
        <p className="text-sm text-teal-900 bg-teal/10 border border-teal/25 px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMessage}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2 rounded-xl mb-4">{error}</p>
      )}

      {/* Mobile: one column at a time */}
      <div className="md:hidden space-y-3 mb-4">
        <label className="text-sm font-medium block">
          Step
          <div className="relative mt-1.5">
            <select
              value={mobilePanel}
              onChange={(e) => setMobilePanel(e.target.value as PipelineStage)}
              className="form-input appearance-none pr-9 min-h-[44px] w-full"
            >
              {PIPELINE_STAGES.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.step}. {col.label} ({byStage[col.id].length})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </label>
        <div className="flex gap-2">
          {PIPELINE_STAGES.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => setMobilePanel(col.id)}
              className={`flex-1 min-h-[40px] rounded-xl text-xs font-medium transition-colors ${
                mobilePanel === col.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {col.step}
            </button>
          ))}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="hidden md:grid md:grid-cols-3 gap-4 items-start">
          {PIPELINE_STAGES.map((col) => renderStageColumn(col))}
        </div>

        <div className="md:hidden -mx-4 px-4 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scroll-smooth">
          {PIPELINE_STAGES.map((col) => (
            <div key={col.id} className="min-w-[min(88vw,340px)] snap-center shrink-0">
              {renderStageColumn(col)}
            </div>
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1)" }}>
          {activeItem ? (
            <div className="pulse-card p-3 opacity-95 shadow-xl rotate-2 max-w-xs border-2 border-teal/40">
              <p className="font-semibold text-sm">{activeItem.title || "Untitled"}</p>
              <p className="text-[10px] text-teal font-medium mt-1 uppercase tracking-wide">
                {activeItem.stage === "source"
                  ? "Drag to Highlights to summarize"
                  : activeItem.stage === "highlight"
                    ? "Drag to Output to generate"
                    : "Drag to reorder"}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete pipeline item?"
        description={
          deleteTarget
            ? `"${deleteTarget.title || "Untitled"}" will be removed permanently. Linked items stay in other columns.`
            : ""
        }
        pending={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
      />

      {outputTarget && (
        <PipelineOutputModal
          open
          target={outputTarget}
          linkedSource={
            outputTarget.kind === "highlight" && outputTarget.item.source_id
              ? itemMap.get(outputTarget.item.source_id)
              : undefined
          }
          onClose={() => setOutputTarget(null)}
          onGenerate={handleGenerateOutput}
          generating={generateOutput.isPending}
        />
      )}

      {modalStage && (
        <PipelineItemModal
          open
          stage={modalStage}
          item={editing ?? undefined}
          sources={byStage.source}
          highlights={byStage.highlight}
          onClose={() => {
            setModalStage(null);
            setEditing(null);
          }}
          saving={create.isPending || update.isPending}
          savingAndSummarizing={saveAndSummarize.isPending}
          onSaveAndSummarize={
            modalStage === "source"
              ? (form) => {
                  saveAndSummarize.mutate({ form, sourceId: editing?.id });
                }
              : undefined
          }
          onSave={(form) => {
            if (editing) {
              update.mutate({
                id: editing.id,
                patch: {
                  title: form.title,
                  body: form.body,
                  source_id: form.source_id,
                  highlight_id: form.highlight_id,
                  output_type: form.output_type,
                },
              });
            } else {
              create.mutate({
                stage: modalStage,
                title: form.title,
                body: form.body,
                source_id: form.source_id,
                highlight_id: form.highlight_id,
                output_type: form.output_type,
              });
            }
          }}
        />
      )}
    </>
  );
}
