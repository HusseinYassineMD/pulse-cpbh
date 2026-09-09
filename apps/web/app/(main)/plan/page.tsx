"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronDown,
  LayoutGrid,
  Lightbulb,
  List,
  Mail,
  Plus,
  ClipboardList,
  ListTodo,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PlanEmailFallback } from "@/components/plan/plan-email-fallback";
import { PlanIdeaCard } from "@/components/plan/plan-idea-card";
import {
  PlanIdeaForm,
  emptyPlanForm,
  ideaToForm,
  type PlanFormState,
} from "@/components/plan/plan-idea-form";
import { PlanModal } from "@/components/plan/plan-modal";
import {
  DEFAULT_PLAN_TEAM,
  isBoardStatus,
  isParkingStatus,
  isQueueStatus,
} from "@/lib/plan-team";
import { rememberCategory, seedCategoriesFromIdeas } from "@/lib/plan-categories";
import type { ContentIdea, IdeaStatus, PlanNotification } from "@/lib/types";

type EmailFallbackState = {
  idea: ContentIdea;
  assigneeEmail: string;
};

function showEmailComposer(
  idea: ContentIdea,
  setEmailFallback: (state: EmailFallbackState | null) => void
) {
  if (!idea.assignee_email) return;
  setEmailFallback({ idea, assigneeEmail: idea.assignee_email });
}

function applyPlanNotification(
  idea: ContentIdea,
  notification: PlanNotification | null | undefined,
  setNotifyMsg: (msg: string) => void,
  setEmailFallback: (state: EmailFallbackState | null) => void
) {
  if (!notification) return;
  if (notification.ok) {
    setEmailFallback(null);
    setNotifyMsg(notification.message);
    setTimeout(() => setNotifyMsg(""), 8000);
    return;
  }
  if (idea.assignee_email) {
    showEmailComposer(idea, setEmailFallback);
    return;
  }
  setNotifyMsg(notification.message);
  setTimeout(() => setNotifyMsg(""), 8000);
}

type ViewMode = "board" | "list";
type BoardPanel = "parking" | "queue";
type ModalMode = "create" | "edit" | null;

const STATUS_OPTIONS: { value: IdeaStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "idea", label: "Idea" },
  { value: "approved", label: "Approved" },
  { value: "in_production", label: "In production" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
  { value: "on_hold", label: "On hold" },
];

function assigneeFromForm(form: PlanFormState, team: { name: string; email: string }[]) {
  if (form.assigneeKey === "__custom__") {
    const email = form.customEmail.trim();
    return { owner: email ? email.split("@")[0] : null, assignee_email: email || null };
  }
  if (!form.assigneeKey) return { owner: null, assignee_email: null };
  const member = team.find((m) => m.email === form.assigneeKey);
  return { owner: member?.name ?? null, assignee_email: form.assigneeKey };
}

function formHasAssignee(form: PlanFormState): boolean {
  if (!form.assigneeKey) return false;
  if (form.assigneeKey === "__custom__") return !!form.customEmail.trim();
  return true;
}

function formToPayload(
  form: PlanFormState,
  team: { name: string; email: string }[],
  mode: "create" | "edit",
  sendEmail = false
) {
  const picked = assigneeFromForm(form, team);
  return {
    title: form.title.trim(),
    theme: form.theme.trim() || null,
    deliverable: form.deliverable,
    platforms: form.platforms,
    target_date: form.target_date || null,
    owner: picked.owner,
    assignee_email: picked.assignee_email,
    status: mode === "create" ? ("idea" as IdeaStatus) : form.status,
    notes: form.notes.trim() || null,
    substack_url: form.substack_url.trim() || null,
    substack_publish_date: form.substack_publish_date || null,
    notify_assignee: (sendEmail || form.notify_assignee) && !!picked.assignee_email,
  };
}

async function uploadPendingFiles(ideaId: string, files: File[]) {
  for (const file of files) {
    await api.plan.uploadSource(ideaId, file);
  }
}

export default function PlanPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [boardPanel, setBoardPanel] = useState<BoardPanel>("parking");
  const [filter, setFilter] = useState<IdeaStatus | "all">("all");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyPlanForm);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [notifyMsg, setNotifyMsg] = useState("");
  const [emailFallback, setEmailFallback] = useState<EmailFallbackState | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const highlightIdeaId = searchParams.get("idea");

  const { data: team = DEFAULT_PLAN_TEAM } = useQuery({
    queryKey: ["plan-team"],
    queryFn: () => api.plan.team(),
  });

  const { data, isLoading, isError, error: loadError } = useQuery({
    queryKey: ["plan"],
    queryFn: () => api.plan.list(),
  });

  const items = useMemo(
    () =>
      (data?.items ?? []).map((i) => ({
        ...i,
        platforms: i.platforms ?? [],
        source_files: i.source_files ?? [],
        deliverable: i.deliverable ?? null,
        substack_url: i.substack_url ?? null,
        substack_publish_date: i.substack_publish_date ?? null,
        post_id: i.post_id ?? null,
      })),
    [data?.items]
  );

  const boardItems = useMemo(
    () => items.filter((i) => isBoardStatus(i.status)),
    [items]
  );

  useEffect(() => {
    seedCategoriesFromIdeas(items.map((i) => i.theme));
  }, [items]);

  useEffect(() => {
    if (!highlightIdeaId || isLoading) return;
    const el = document.getElementById(`plan-idea-${highlightIdeaId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-teal", "ring-offset-2");
    const t = setTimeout(() => el.classList.remove("ring-2", "ring-teal", "ring-offset-2"), 4000);
    return () => clearTimeout(t);
  }, [highlightIdeaId, isLoading, items.length]);

  const listItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  const parkingLot = useMemo(
    () =>
      boardItems
        .filter((i) => isParkingStatus(i.status))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [boardItems]
  );

  const workQueue = useMemo(() => {
    const priority: Record<string, number> = {
      in_production: 0,
      approved: 1,
    };
    return boardItems
      .filter((i) => isQueueStatus(i.status))
      .sort((a, b) => {
        const da = a.target_date ? new Date(a.target_date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.target_date ? new Date(b.target_date).getTime() : Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
        return (priority[a.status] ?? 9) - (priority[b.status] ?? 9);
      });
  }, [boardItems]);

  const counts = useMemo(() => {
    const scheduled = items.filter((i) => i.status === "scheduled").length;
    const onBoard = boardItems.length;
    const all = items.length;
    return {
      /** Ideas visible on the parking lot + work queue columns */
      onBoard,
      /** Every idea in the plan (including published — hidden from board) */
      all,
      parking: parkingLot.length,
      queue: workQueue.length,
      scheduled,
      hiddenFromBoard: all - onBoard - scheduled,
    };
  }, [items, boardItems.length, parkingLot.length, workQueue.length]);

  const openCreate = () => {
    setForm(emptyPlanForm);
    setPendingFiles([]);
    setEditingId(null);
    setError("");
    setModalMode("create");
  };

  const openEdit = (idea: ContentIdea, opts?: { focusEmail?: boolean }) => {
    setForm({
      ...ideaToForm(idea, team),
      notify_assignee: opts?.focusEmail ?? false,
    });
    setPendingFiles([]);
    setEditingId(idea.id);
    setError("");
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setForm(emptyPlanForm);
    setPendingFiles([]);
    setError("");
  };

  const editingIdea = editingId ? items.find((i) => i.id === editingId) : undefined;

  const create = useMutation({
    mutationFn: async (payload: ReturnType<typeof formToPayload>) => {
      const idea = await api.plan.create(payload);
      if (pendingFiles.length) {
        await uploadPendingFiles(idea.id, pendingFiles);
      }
      rememberCategory(form.theme);
      return idea;
    },
    onSuccess: (idea) => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      closeModal();
      if (idea.notification?.ok) {
        setEmailFallback(null);
        setNotifyMsg(idea.notification.message);
        setTimeout(() => setNotifyMsg(""), 8000);
      } else if (idea.assignee_email && idea.notification) {
        showEmailComposer(idea, setEmailFallback);
      }
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not add idea"),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ReturnType<typeof formToPayload> }) => {
      const idea = await api.plan.update(id, patch);
      rememberCategory(form.theme);
      return idea;
    },
    onSuccess: (idea) => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      closeModal();
      if (idea.notification?.ok) {
        setEmailFallback(null);
        setNotifyMsg(idea.notification.message);
        setTimeout(() => setNotifyMsg(""), 8000);
      } else if (idea.assignee_email && idea.notification) {
        showEmailComposer(idea, setEmailFallback);
      }
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not save changes"),
  });

  const notify = useMutation({
    mutationFn: (idea: ContentIdea) => api.plan.notify(idea.id).then((res) => ({ res, idea })),
    onSuccess: ({ res, idea }) => {
      applyPlanNotification(idea, res, setNotifyMsg, setEmailFallback);
    },
    onError: () => {
      // Still show composer — email content is built in the browser
    },
  });

  const openEditForEmail = (idea: ContentIdea) => {
    if (!idea.assignee_email) {
      openEdit(idea, { focusEmail: true });
      return;
    }
    showEmailComposer(idea, setEmailFallback);
    notify.mutate(idea);
  };

  const remove = useMutation({
    mutationFn: (id: string) => api.plan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      setDeleteConfirmId(null);
      closeModal();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not delete"),
  });

  const moveToQueue = useMutation({
    mutationFn: (id: string) => api.plan.update(id, { status: "approved" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      setNotifyMsg("Approved — moved to work queue");
      setTimeout(() => setNotifyMsg(""), 3000);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Could not move to queue";
      setError(msg);
      setNotifyMsg(msg);
      setTimeout(() => setNotifyMsg(""), 4000);
    },
  });

  const sendToSchedule = useMutation({
    mutationFn: (id: string) => api.plan.sendToSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      setNotifyMsg("Sent to Schedule — open Schedule to publish");
      setTimeout(() => setNotifyMsg(""), 4000);
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : "Could not send to schedule";
      setError(msg);
      setNotifyMsg(msg);
      setTimeout(() => setNotifyMsg(""), 4000);
    },
  });

  const uploadSource = useMutation({
    mutationFn: async ({ id, files }: { id: string; files: FileList }) => {
      for (const file of Array.from(files)) {
        await api.plan.uploadSource(id, file);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan"] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not upload file"),
  });

  const removeSource = useMutation({
    mutationFn: ({ id, filename }: { id: string; filename: string }) =>
      api.plan.deleteSource(id, filename),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan"] }),
    onError: (err) => setError(err instanceof ApiError ? err.message : "Could not remove file"),
  });

  const handleSave = (sendEmail = false) => {
    if (!form.title.trim()) {
      setError("Topic is required");
      return;
    }
    if (sendEmail && !formHasAssignee(form)) {
      setError("Pick someone under Assign to before sending email");
      return;
    }
    const mode = modalMode === "edit" ? "edit" : "create";
    const payload = formToPayload(form, team, mode, sendEmail);
    if (modalMode === "edit" && editingId) {
      update.mutate({ id: editingId, patch: payload });
    } else {
      create.mutate(payload);
    }
  };

  const saving = create.isPending || update.isPending;
  const canEmailFromForm = formHasAssignee(form);
  const uploading = uploadSource.isPending || removeSource.isPending;

  const sectionProps = {
    onEdit: openEdit,
    onDelete: setDeleteConfirmId,
    onEmail: openEditForEmail,
    onMoveToQueue: (id: string) => moveToQueue.mutate(id),
    onSendToSchedule: (id: string) => sendToSchedule.mutate(id),
    highlightIdeaId,
  };

  return (
    <div className="space-y-5 animate-fade-in pb-24 sm:pb-0">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Content plan</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Plan board</h1>
          <p className="text-muted-foreground mt-1.5 text-sm max-w-xl">
            Capture ideas in the parking lot, approve them into the work queue, then send finished items to Schedule.
            Use <strong className="text-foreground font-medium">Email assignee</strong> on any card to notify your team.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 btn-primary text-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add idea
        </button>
      </div>

      {notifyMsg && (
        <p
          className={`text-sm px-4 py-2.5 rounded-xl border ${
            notifyMsg.includes("Could not")
              ? "text-red-700 bg-red-50 border-red-200"
              : "text-teal-700 bg-teal-50 border-teal-200"
          }`}
        >
          {notifyMsg}
        </p>
      )}

      {/* Stats — four separate boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label={viewMode === "board" ? "On board" : "All ideas"}
          value={viewMode === "board" ? counts.onBoard : counts.all}
          icon={Lightbulb}
          hint={
            viewMode === "board" && counts.hiddenFromBoard > 0
              ? `${counts.all} total · ${counts.hiddenFromBoard} published`
              : undefined
          }
        />
        <StatCard label="Parking lot" value={counts.parking} icon={Lightbulb} accent="muted" />
        <StatCard label="Work queue" value={counts.queue} icon={ListTodo} accent="sky" />
        <Link href="/calendar" className="block">
          <StatCard label="In schedule" value={counts.scheduled} icon={CalendarDays} accent="teal" />
        </Link>
      </div>

      {/* View section — separate, with plain-language labels */}
      <section className="pulse-card p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-base">How do you want to view your ideas?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pick one option below. You can switch anytime.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <ViewOption
            active={viewMode === "board"}
            onClick={() => setViewMode("board")}
            icon={LayoutGrid}
            title="Board view"
            description="See the Parking lot (new ideas) and Work queue (approved items) side by side. Send finished items to Schedule when ready."
          />
          <ViewOption
            active={viewMode === "list"}
            onClick={() => setViewMode("list")}
            icon={List}
            title="All items list"
            description="See every idea in one list. Use the status filter to narrow down (e.g. only Scheduled)."
          />
        </div>

        {viewMode === "board" && (
          <div className="pt-2 border-t border-border/70 space-y-2 md:hidden">
            <label className="text-sm font-medium block">
              Which column do you want to see?
              <span className="font-normal text-muted-foreground ml-1">(on phone)</span>
            </label>
            <div className="relative">
              <select
                value={boardPanel}
                onChange={(e) => setBoardPanel(e.target.value as BoardPanel)}
                className="form-input appearance-none pr-9"
              >
                <option value="parking">Parking lot — new ideas ({counts.parking})</option>
                <option value="queue">Work queue — approved items ({counts.queue})</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        )}

        {viewMode === "list" && (
          <div className="pt-2 border-t border-border/70 space-y-2">
            <label htmlFor="plan-status-filter" className="text-sm font-medium block">
              Filter by status
            </label>
            <div className="relative max-w-xs">
              <select
                id="plan-status-filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value as IdeaStatus | "all")}
                className="form-input appearance-none pr-9"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-xs text-muted-foreground">
              Choose &ldquo;All statuses&rdquo; to see everything, or pick one stage (e.g. Idea, Scheduled).
            </p>
          </div>
        )}
      </section>

      {loadError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-4 py-3 rounded-xl">
          Could not load plan: {loadError instanceof ApiError ? loadError.message : "Check your connection and refresh"}
        </p>
      )}

      {isLoading && !loadError && <p className="text-muted-foreground text-sm px-1">Loading plan…</p>}

      {!isLoading && (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h2 className="font-semibold text-lg">
            {viewMode === "board" ? "Your board" : "Your full list"}
          </h2>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {viewMode === "board"
              ? "Left = new ideas · Right = approved work"
              : filter === "all"
                ? "Showing every idea"
                : `Showing: ${STATUS_OPTIONS.find((o) => o.value === filter)?.label}`}
          </p>
        </div>
      )}

      {!isLoading && viewMode === "board" && (
        <>
          {/* Desktop: side-by-side columns */}
          <div className="hidden md:grid md:grid-cols-2 gap-5">
            <BoardColumn
              title="Parking lot"
              description="New ideas start here"
              icon={Lightbulb}
              count={parkingLot.length}
              empty="No ideas yet — add one to get started."
              ideas={parkingLot}
              showMoveToQueue
              {...sectionProps}
            />
            <BoardColumn
              title="Work queue"
              description="Approved & in production — send to Schedule when ready"
              icon={ListTodo}
              count={workQueue.length}
              empty="Approve an idea from the parking lot to begin."
              ideas={workQueue}
              showSendToSchedule
              {...sectionProps}
            />
          </div>

          {/* Mobile: one panel at a time */}
          <div className="md:hidden">
            {boardPanel === "parking" ? (
              <BoardColumn
                title="Parking lot"
                description="New ideas start here"
                icon={Lightbulb}
                count={parkingLot.length}
                empty="No ideas yet — tap Add idea."
                ideas={parkingLot}
                showMoveToQueue
                compact
                {...sectionProps}
              />
            ) : (
              <BoardColumn
                title="Work queue"
                description="Approved & in production — send to Schedule when ready"
                icon={ListTodo}
                count={workQueue.length}
                empty="Approve an idea to see it here."
                ideas={workQueue}
                showSendToSchedule
                compact
                {...sectionProps}
              />
            )}
          </div>
        </>
      )}

      {!isLoading && viewMode === "list" && (
        <BoardColumn
          title="All items"
          description={
            filter === "all"
              ? `${listItems.length} idea${listItems.length === 1 ? "" : "s"} across all statuses`
              : `Showing ${listItems.length} · ${STATUS_OPTIONS.find((o) => o.value === filter)?.label}`
          }
          icon={ClipboardList}
          count={listItems.length}
          empty="No items match this filter."
          ideas={listItems}
          showMoveToQueue
          showSendToSchedule
          {...sectionProps}
        />
      )}

      {/* Mobile FAB */}
      <button
        onClick={openCreate}
        className="sm:hidden fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full btn-primary shadow-lg flex items-center justify-center"
        aria-label="Add idea"
      >
        <Plus className="w-6 h-6" />
      </button>

      <PlanModal
        open={modalMode !== null}
        onClose={closeModal}
        title={modalMode === "edit" ? "Edit idea" : "New idea"}
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
            {modalMode === "edit" && editingId && (
              <button
                type="button"
                onClick={() => setDeleteConfirmId(editingId)}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200"
              >
                Delete idea
              </button>
            )}
            <div className="flex flex-col sm:flex-row gap-2 sm:ml-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={saving || !form.title.trim() || !canEmailFromForm}
                title={
                  canEmailFromForm
                    ? "Save and email assignment details"
                    : "Select Assign to first"
                }
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-teal/40 text-teal bg-teal/10 hover:bg-teal/15 disabled:opacity-40"
              >
                <Mail className="w-4 h-4" />
                {saving ? "Sending…" : "Save & email"}
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={saving || !form.title.trim()}
                className="btn-primary px-5 py-2.5 rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? "Saving…" : modalMode === "edit" ? "Save only" : "Add idea"}
              </button>
            </div>
          </div>
        }
      >
        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">{error}</p>}
        <PlanIdeaForm
          form={form}
          setForm={setForm}
          team={team}
          mode={modalMode === "create" ? "create" : "edit"}
          sourceFiles={editingIdea?.source_files ?? []}
          pendingFiles={pendingFiles}
          onPendingFilesChange={setPendingFiles}
          uploading={uploading}
          onUpload={
            editingId
              ? (files) => uploadSource.mutate({ id: editingId, files })
              : undefined
          }
          onRemoveFile={
            editingId
              ? (filename) => removeSource.mutate({ id: editingId, filename })
              : undefined
          }
        />
      </PlanModal>

      <PlanModal
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete this idea?"
        footer={
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={() => setDeleteConfirmId(null)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => deleteConfirmId && remove.mutate(deleteConfirmId)}
              disabled={remove.isPending}
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {remove.isPending ? "Deleting…" : "Yes, delete"}
            </button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">
          This permanently removes the idea from your plan. This cannot be undone.
        </p>
      </PlanModal>

      {emailFallback && (
        <PlanEmailFallback
          idea={emailFallback.idea}
          assigneeEmail={emailFallback.assigneeEmail}
          onClose={() => setEmailFallback(null)}
        />
      )}
    </div>
  );
}

function ViewOption({
  active,
  onClick,
  icon: Icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border-2 p-4 transition-all ${
        active
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-white/40 hover:border-primary/30 hover:bg-white/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
          }`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      {active && (
        <p className="text-xs font-medium text-primary mt-3 pl-[52px]">✓ Currently selected</p>
      )}
    </button>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
  hint,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "muted" | "sky" | "teal";
  hint?: string;
}) {
  const colors = {
    primary: "text-primary bg-primary/10",
    muted: "text-muted-foreground bg-secondary",
    sky: "text-cyan bg-cyan/15",
    teal: "text-teal bg-teal/15",
  };
  return (
    <div className="pulse-card-hover p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 ${colors[accent]}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl sm:text-3xl font-bold tabular-nums">{value}</p>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
        {hint && <p className="text-[10px] sm:text-xs text-muted-foreground/80 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

function BoardColumn({
  title,
  description,
  icon: Icon,
  count,
  empty,
  ideas,
  showMoveToQueue,
  showSendToSchedule,
  compact,
  onEdit,
  onDelete,
  onEmail,
  onMoveToQueue,
  onSendToSchedule,
  highlightIdeaId,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  empty: string;
  ideas: ContentIdea[];
  showMoveToQueue?: boolean;
  showSendToSchedule?: boolean;
  compact?: boolean;
  onEdit: (idea: ContentIdea) => void;
  onDelete: (id: string) => void;
  onEmail: (idea: ContentIdea) => void;
  onMoveToQueue?: (id: string) => void;
  onSendToSchedule?: (id: string) => void;
  highlightIdeaId?: string | null;
}) {
  return (
    <div className={`pulse-card flex flex-col ${compact ? "" : "min-h-[320px]"}`}>
      <div className="px-4 py-3.5 border-b border-border/70 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm sm:text-base">{title}</h2>
            <span className="text-xs font-medium tabular-nums text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {count}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
      </div>

      <div className="p-3 sm:p-4 flex-1 space-y-3">
        {ideas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 py-10 px-4 text-center text-sm text-muted-foreground">
            {empty}
          </div>
        ) : (
          ideas.map((idea) => (
            <PlanIdeaCard
              key={idea.id}
              idea={idea}
              highlighted={highlightIdeaId === idea.id}
              onEdit={() => onEdit(idea)}
              onDelete={() => onDelete(idea.id)}
              onEmail={() => onEmail(idea)}
              onMoveToQueue={onMoveToQueue ? () => onMoveToQueue(idea.id) : undefined}
              showMoveToQueue={showMoveToQueue}
              onSendToSchedule={onSendToSchedule ? () => onSendToSchedule(idea.id) : undefined}
              showSendToSchedule={showSendToSchedule}
            />
          ))
        )}
      </div>
    </div>
  );
}
