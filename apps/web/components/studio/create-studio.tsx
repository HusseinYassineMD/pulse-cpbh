"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  ClipboardPaste,
  ImageIcon,
  Lightbulb,
  Sparkles,
  Wand2,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { isStaticMode } from "@/lib/base-path";
import { AuthImage } from "@/components/auth-image";
import { ContentChat } from "@/components/studio/content-chat";
import { SchedulePanel } from "@/components/schedule-panel";
import { celebrate } from "@/lib/celebrate";
import { HashtagHelper } from "@/components/hashtags/hashtag-helper";
import { PlatformLabel } from "@/components/ui/platform-badges";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ContentIdea, Post, Template } from "@/lib/types";

const STEPS = [
  { id: 1, label: "Source", desc: "Ideas, paste, or Plan" },
  { id: 2, label: "Generate", desc: "Captions & slides" },
  { id: 3, label: "Refine & chat", desc: "Preview + assistant" },
  { id: 4, label: "Approve", desc: "Sign off" },
  { id: 5, label: "Schedule", desc: "Pick time & publish" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

export function CreateStudio() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<StepId>(1);
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [planIdeaId, setPlanIdeaId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [postId, setPostId] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [error, setError] = useState("");
  const [doneMsg, setDoneMsg] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.templates.list(),
  });

  const { data: planItems } = useQuery({
    queryKey: ["plan"],
    queryFn: () => api.plan.list(),
  });

  const { data: post, refetch: refetchPost } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => api.posts.get(postId!),
    enabled: !!postId,
  });

  const selectedTemplate = useMemo(
    () => templates?.find((t) => t.post_creator_id === templateId),
    [templates, templateId]
  );

  const hasSource = useMemo(() => {
    const hasPasted = title.trim().length > 0 && sourceText.trim().length > 0;
    return hasPasted || !!templateId;
  }, [title, sourceText, templateId]);

  const createPost = useMutation({
    mutationFn: () =>
      api.studio.create({
        title: title.trim() || selectedTemplate?.title || "Untitled post",
        source_text: sourceText.trim(),
        template_id: templateId || null,
        plan_idea_id: planIdeaId,
      }),
    onSuccess: (result) => {
      setPostId(result.post.id);
      queryClient.setQueryData(["post", result.post.id], result.post);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setStep(3);
      setSlideIndex(0);
      setDoneMsg(result.message);
      setError("");
      setTimeout(() => setDoneMsg(""), 6000);
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Generation failed"),
  });

  const approve = useMutation({
    mutationFn: () => api.posts.approve(postId!),
    onSuccess: (updated) => {
      queryClient.setQueryData(["post", postId], updated);
      setStep(5);
      setError("");
      celebrate();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Could not approve"),
  });

  const maxReachableStep = useMemo(() => {
    if (!hasSource && !postId) return 1;
    if (!postId || !post) return 2;
    if (!post.variants.length) return 2;
    if (post.status !== "approved" && post.status !== "scheduled" && post.status !== "published") {
      return 4;
    }
    return 5;
  }, [hasSource, postId, post]);

  useEffect(() => {
    if (post?.status === "approved" && step < 5) setStep(5);
  }, [post?.status, step]);

  useEffect(() => {
    if (prefilled) return;
    const planId = searchParams.get("planId");
    const urlTitle = searchParams.get("title");
    const urlNotes = searchParams.get("notes");

    if (planId && planItems?.items) {
      const idea = planItems.items.find((i) => i.id === planId);
      if (idea) {
        applyPlanIdea(idea);
        setPrefilled(true);
        return;
      }
    }
    if (urlTitle) {
      setTitle(decodeURIComponent(urlTitle));
      if (urlNotes) setSourceText(decodeURIComponent(urlNotes));
      setPrefilled(true);
    }
  }, [searchParams, planItems, prefilled]);

  function applyPlanIdea(idea: ContentIdea) {
    setPlanIdeaId(idea.id);
    setTitle(idea.title);
    const parts = [idea.notes, idea.theme ? `Theme: ${idea.theme}` : ""].filter(Boolean);
    setSourceText(parts.join("\n\n"));
  }

  function goTo(s: StepId) {
    if (s <= maxReachableStep) setStep(s);
  }

  function runGenerate() {
    if (!hasSource) return;
    setError("");
    setDoneMsg("");
    createPost.mutate();
  }

  function restart() {
    setStep(1);
    setTitle("");
    setSourceText("");
    setPlanIdeaId(null);
    setTemplateId("");
    setPostId(null);
    setError("");
    setDoneMsg("");
    setPrefilled(false);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-[min(70vh,720px)]">
      <aside className="lg:w-56 xl:w-64 shrink-0">
        <nav className="pulse-card p-3 space-y-1 lg:sticky lg:top-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-3 py-2">
            Ideas → Create → Publish
          </p>
          {STEPS.map(({ id, label, desc }) => {
            const active = step === id;
            const done = id < step || (id === 4 && post?.status === "approved");
            const locked = id > maxReachableStep;
            return (
              <button
                key={id}
                type="button"
                disabled={locked}
                title={locked ? `Complete step ${maxReachableStep} first` : undefined}
                aria-label={locked ? `${label} — complete step ${maxReachableStep} first` : label}
                onClick={() => goTo(id)}
                className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : locked
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-secondary text-foreground"
                }`}
              >
                <span
                  className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    active ? "bg-white/20" : done ? "bg-teal/15 text-teal" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {done && !active ? <Check className="w-4 h-4" /> : id}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-tight">{label}</span>
                  <span
                    className={`block text-[11px] mt-0.5 leading-snug ${
                      active ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {desc}
                  </span>
                </span>
              </button>
            );
          })}
          <Link
            href="/ideas"
            className="flex items-center gap-2 px-3 py-2 mt-2 text-xs font-medium text-primary hover:underline"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Browse Ideas
          </Link>
        </nav>
      </aside>

      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-0.5">
              Step {step} of {STEPS.length}
            </p>
            <h2 className="text-xl font-bold">{STEPS[step - 1].label}</h2>
          </div>
          {post && (
            <div className="flex items-center gap-2">
              <StatusBadge status={post.status} />
              <Link href={`/posts/${post.id}`} className="text-xs text-primary hover:underline font-medium">
                Full editor →
              </Link>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">{error}</p>
        )}
        {doneMsg && (
          <p className="text-sm text-teal-900 bg-teal/10 border border-teal/25 px-4 py-2.5 rounded-xl">{doneMsg}</p>
        )}

        {step === 1 && (
          <StepSource
            title={title}
            sourceText={sourceText}
            planIdeaId={planIdeaId}
            templateId={templateId}
            planItems={planItems?.items ?? []}
            templates={templates ?? []}
            loadingTemplates={loadingTemplates}
            onTitleChange={setTitle}
            onSourceTextChange={(text) => {
              setSourceText(text);
              setPlanIdeaId(null);
            }}
            onSelectPlan={applyPlanIdea}
            onTemplateChange={(id) => {
              setTemplateId(id);
              if (!title.trim() && id) {
                const t = templates?.find((x) => x.post_creator_id === id);
                if (t) setTitle(t.title);
              }
            }}
            onNext={() => hasSource && setStep(2)}
            canContinue={hasSource}
          />
        )}

        {step === 2 && (
          <StepGenerate
            title={title}
            sourceText={sourceText}
            template={selectedTemplate}
            captionsOnly={!templateId}
            generating={createPost.isPending}
            onGenerate={runGenerate}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && post && (
          <StepRefine
            post={post}
            slideIndex={slideIndex}
            onSlideChange={setSlideIndex}
            onRefresh={() => refetchPost()}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && post && (
          <StepApprove
            post={post}
            approving={approve.isPending}
            onApprove={() => approve.mutate()}
            onBack={() => setStep(3)}
            onSkip={() => setStep(5)}
          />
        )}

        {step === 5 && post && (
          <StepSchedule
            post={post}
            onScheduled={() => {
              refetchPost();
              setDoneMsg("Scheduled! View it on the Schedule page.");
              setTimeout(() => setDoneMsg(""), 5000);
            }}
            onBack={() => setStep(4)}
            onRestart={restart}
          />
        )}
      </div>
    </div>
  );
}

function StepSource({
  title,
  sourceText,
  planIdeaId,
  templateId,
  planItems,
  templates,
  loadingTemplates,
  onTitleChange,
  onSourceTextChange,
  onSelectPlan,
  onTemplateChange,
  onNext,
  canContinue,
}: {
  title: string;
  sourceText: string;
  planIdeaId: string | null;
  templateId: string;
  planItems: ContentIdea[];
  templates: Template[];
  loadingTemplates: boolean;
  onTitleChange: (v: string) => void;
  onSourceTextChange: (v: string) => void;
  onSelectPlan: (idea: ContentIdea) => void;
  onTemplateChange: (id: string) => void;
  onNext: () => void;
  canContinue: boolean;
}) {
  const planIdeas = planItems.filter((i) => !["published", "scheduled"].includes(i.status));

  return (
    <div className="pulse-card p-5 sm:p-6 space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Start anywhere — pull from <strong>Plan</strong>, paste copy from Ideas or your notes, or pick an optional carousel template. Topic can be anything.
      </p>

      <div className="space-y-2">
        <label htmlFor="studio-title" className="text-sm font-semibold">
          Title / topic
        </label>
        <input
          id="studio-title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g. Sleep and brain health, APOE4 exercise tips…"
          className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="studio-source" className="text-sm font-semibold flex items-center gap-2">
          <ClipboardPaste className="w-4 h-4 text-teal" />
          Your content
        </label>
        <textarea
          id="studio-source"
          value={sourceText}
          onChange={(e) => onSourceTextChange(e.target.value)}
          rows={8}
          placeholder="Paste article text, bullet points, a trend hook from Ideas, Substack draft, anything…"
          className="w-full px-3 py-3 rounded-xl border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-y min-h-[160px]"
        />
        <p className="text-xs text-muted-foreground">
          Required for captions-only posts. Optional if you only want template slides (AI will still refine from your text if provided).
        </p>
      </div>

      {planIdeas.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            From Plan
          </p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {planIdeas.slice(0, 12).map((idea) => (
              <button
                key={idea.id}
                type="button"
                onClick={() => onSelectPlan(idea)}
                className={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${
                  planIdeaId === idea.id
                    ? "border-primary bg-primary/5 text-primary font-medium"
                    : "border-border hover:bg-secondary"
                }`}
              >
                {idea.title}
              </button>
            ))}
          </div>
          <Link href="/plan" className="text-xs text-primary hover:underline">
            Manage Plan →
          </Link>
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-border/60">
        <p className="text-sm font-semibold">Carousel template (optional)</p>
        <p className="text-xs text-muted-foreground">
          Skip for captions-only, or pick a template to generate slide images via Post_Creator.
        </p>
        {loadingTemplates && <p className="text-sm text-muted-foreground">Loading templates…</p>}
        <select
          value={templateId}
          onChange={(e) => onTemplateChange(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Captions only — no slides</option>
          {templates.map((t) => (
            <option key={t.post_creator_id} value={t.post_creator_id}>
              {t.title} ({t.slide_count} slides)
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          disabled={!canContinue}
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] btn-primary text-sm disabled:opacity-50"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function StepGenerate({
  title,
  sourceText,
  template,
  captionsOnly,
  generating,
  onGenerate,
  onBack,
}: {
  title: string;
  sourceText: string;
  template?: Template;
  captionsOnly: boolean;
  generating: boolean;
  onGenerate: () => void;
  onBack: () => void;
}) {
  return (
    <div className="pulse-card p-5 sm:p-8 space-y-6 max-w-xl mx-auto">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-teal to-cyan flex items-center justify-center shadow-lg shadow-teal/20">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <div className="space-y-2 text-center">
        <h3 className="text-lg font-bold">{title || "Your post"}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {captionsOnly
            ? "We'll draft Instagram, Facebook, and LinkedIn captions from your pasted content."
            : `We'll generate ${template?.slide_count ?? ""} carousel slides plus platform captions${
                sourceText.trim() ? ", tailored to your source text" : ""
              }.`}
        </p>
      </div>
      {isStaticMode() && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-left">
          Full AI generation requires <strong>localhost:3010</strong> with the API running.
        </p>
      )}
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="inline-flex items-center justify-center gap-2 w-full px-8 py-3 min-h-[48px] btn-primary text-sm font-semibold disabled:opacity-50"
      >
        {generating ? (
          <>
            <Circle className="w-4 h-4 animate-pulse" />
            Generating…
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            {captionsOnly ? "Generate captions" : "Generate slides & captions"}
          </>
        )}
      </button>
      <div className="flex justify-start pt-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="w-4 h-4" />
          Edit source
        </button>
      </div>
    </div>
  );
}

function StepRefine({
  post,
  slideIndex,
  onSlideChange,
  onRefresh,
  onNext,
  onBack,
}: {
  post: Post;
  slideIndex: number;
  onSlideChange: (i: number) => void;
  onRefresh: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const slides = post.media_assets;
  const current = slides[slideIndex];

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-teal" />
        Preview captions{slides.length ? " and slides" : ""}, then chat with the assistant — ask for exact edits as many times as you need.
      </p>

      <div className="grid lg:grid-cols-2 gap-5 items-start">
        <div className="space-y-4">
          {slides.length > 0 && (
            <div className="pulse-card overflow-hidden">
              <div className="relative bg-muted aspect-square max-h-[360px]">
                {current?.url ? (
                  <AuthImage src={current.url} alt={`Slide ${slideIndex + 1}`} className="w-full h-full object-contain" />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No preview</div>
                )}
              </div>
              {slides.length > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <button
                    type="button"
                    onClick={() => onSlideChange(Math.max(0, slideIndex - 1))}
                    disabled={slideIndex === 0}
                    className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Slide {slideIndex + 1} / {slides.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSlideChange(Math.min(slides.length - 1, slideIndex + 1))}
                    disabled={slideIndex >= slides.length - 1}
                    className="p-2 rounded-lg hover:bg-secondary disabled:opacity-30"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Captions</h3>
            {post.variants.map((v) => (
              <div key={v.id} className="pulse-card p-4">
                <PlatformLabel platform={v.platform} />
                <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2 leading-relaxed">{v.caption}</p>
              </div>
            ))}
          </div>

          {post.variants.length > 0 && (
            <HashtagHelper postId={post.id} caption={post.variants[0]?.caption} onOptimized={onRefresh} />
          )}
        </div>

        <ContentChat postId={post.id} onUpdated={onRefresh} />
      </div>

      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="w-4 h-4" />
          Back to generate
        </button>
        <button type="button" onClick={onNext} className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] btn-primary text-sm">
          Continue to approve
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function StepApprove({
  post,
  approving,
  onApprove,
  onBack,
  onSkip,
}: {
  post: Post;
  approving: boolean;
  onApprove: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const alreadyApproved = post.status === "approved" || post.status === "scheduled" || post.status === "published";

  return (
    <div className="pulse-card p-5 sm:p-6 space-y-5 max-w-lg">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Happy with <strong>{post.title}</strong>? Approve when ready — or go back to refine more with chat.
      </p>
      {alreadyApproved ? (
        <p className="text-sm text-teal font-medium">Already approved — continue to schedule.</p>
      ) : (
        <button
          type="button"
          onClick={onApprove}
          disabled={approving}
          className="inline-flex items-center gap-2 px-6 py-2.5 min-h-[44px] bg-teal text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          {approving ? "Approving…" : "Approve content"}
        </button>
      )}
      <div className="flex justify-between pt-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="w-4 h-4" />
          Back to refine
        </button>
        <button type="button" onClick={onSkip} className="text-sm text-primary hover:underline font-medium">
          Skip to schedule →
        </button>
      </div>
    </div>
  );
}

function StepSchedule({
  post,
  onScheduled,
  onBack,
  onRestart,
}: {
  post: Post;
  onScheduled: () => void;
  onBack: () => void;
  onRestart: () => void;
}) {
  const platforms = post.variants.map((v) => v.platform);

  return (
    <div className="space-y-5 max-w-xl">
      <SchedulePanel postId={post.id} availablePlatforms={platforms} onScheduled={onScheduled} />
      <div className="flex flex-wrap justify-between gap-3 pt-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex gap-3">
          <Link href="/calendar" className="text-sm font-medium text-primary hover:underline">
            View schedule
          </Link>
          <button type="button" onClick={onRestart} className="text-sm text-muted-foreground hover:text-foreground font-medium">
            Start over
          </button>
        </div>
      </div>
    </div>
  );
}
