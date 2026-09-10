"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Calendar,
  Copy,
  Check,
  Sparkles,
  Clock,
  Send,
  FileStack,
  Terminal,
  Wand2,
  Zap,
} from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { api, ApiError } from "@/lib/api";
import { AuthImage } from "@/components/auth-image";
import { HeroMockup } from "@/components/hero-mockup";
import { QuickTools } from "@/components/home/quick-tools";
import { PostNextAction } from "@/components/posts/post-next-action";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { PlatformBadges } from "@/components/ui/platform-badges";
import { ACTIONABLE_STATUSES, getPostNextStep } from "@/lib/post-workflow";
import type { CommandResult, Post } from "@/lib/types";

const EXAMPLES = ["post exercise-apoe4", "captions apoe4"];

const STEPS = [
  { icon: Terminal, label: "Command", desc: "post · captions", color: "from-gray-800 to-gray-900" },
  { icon: Wand2, label: "Generate", desc: "slides + AI captions", color: "from-teal to-cyan" },
  { icon: Send, label: "Publish", desc: "schedule all platforms", color: "from-accent to-teal" },
];

export default function HomePage() {
  const queryClient = useQueryClient();
  const [command, setCommand] = useState("");
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.dashboard.get(),
  });

  const { data: postsData } = useQuery({
    queryKey: ["posts"],
    queryFn: () => api.posts.list({ limit: 50 }),
  });

  const {
    data: schedule,
    isLoading: scheduleLoading,
    isError: scheduleError,
  } = useQuery({
    queryKey: ["schedule"],
    queryFn: () => api.schedule.list(),
  });

  const run = useMutation({
    mutationFn: (cmd: string) => api.commands.run(cmd),
    onSuccess: (result) => {
      setLastResult(result);
      setCommand("");
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const upcoming = schedule?.filter((s) => s.status === "pending") ?? [];
  const stats = dashboard?.stats;
  const actionPosts =
    postsData?.items.filter((p) => ACTIONABLE_STATUSES.includes(p.status)) ?? [];
  const readyCount = actionPosts.length;

  return (
    <div className="space-y-10 pb-4">
      {/* Hero */}
      <div className="grid lg:grid-cols-2 gap-10 items-center animate-fade-in">
        <div className="space-y-5">
          <div className="inline-flex flex-col gap-1.5">
            <div className="cpbh-badge">
              <Zap className="w-3.5 h-3.5 text-teal" />
              CPBH Social Automation
            </div>
            <div className="cpbh-accent-line ml-3" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">
            What should
            <br />
            <span className="gradient-text">we post?</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
            One command. Carousel slides, stories, and platform captions — generated and scheduled in seconds.
          </p>

          <div className="flex flex-wrap gap-3 pt-1">
            {STEPS.map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className="flex items-center gap-2.5 pulse-card px-3 py-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold">{label}</p>
                  <p className="text-[10px] text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <HeroMockup />
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-stagger">
          <StatCard label="Total posts" value={stats.total} icon={FileStack} accent="cardinal" href="/board?tab=posts" />
          <StatCard label="Scheduled" value={stats.scheduled} icon={Clock} accent="blue" href="/calendar" />
          <StatCard label="Published" value={stats.published} icon={Send} accent="green" href="/board?tab=posts&filter=published" />
          <StatCard label="Needs action" value={readyCount} icon={Sparkles} accent="gold" href="/board?tab=posts&filter=action" />
        </div>
      )}

      {actionMsg && (
        <p className="text-sm text-teal-900 bg-teal/10 border border-teal/25 px-4 py-2.5 rounded-xl">{actionMsg}</p>
      )}

      {actionPosts.length > 0 && (
        <section className="space-y-4 animate-stagger">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-0.5">Your queue</p>
              <h2 className="font-bold text-xl">Posts waiting on you</h2>
            </div>
            <Link href="/board?tab=posts&filter=action" className="text-sm text-primary hover:underline font-semibold">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {actionPosts.slice(0, 5).map((post) => {
              const next = getPostNextStep(post);
              return (
                <div
                  key={post.id}
                  className="pulse-card-hover p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                >
                  <Link href={`/posts/${post.id}`} className="flex-1 min-w-0 group">
                    <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{next.hint}</p>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={post.status} />
                    <PostNextAction
                      post={post}
                      onDone={(msg) => {
                        setActionMsg(msg);
                        setTimeout(() => setActionMsg(""), 5000);
                      }}
                      onError={(msg) => {
                        setActionMsg(msg);
                        setTimeout(() => setActionMsg(""), 5000);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <QuickTools />

      {/* Command bar */}
      <section className="pulse-card p-6 lg:p-8 pulse-glow animate-glow">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <h2 className="text-sm font-bold text-foreground uppercase tracking-widest">Command bar</h2>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (command.trim() && !run.isPending) run.mutate(command.trim());
          }}
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 pulse-terminal flex items-center px-4 sm:px-5 py-3 sm:py-4 gap-3 min-w-0">
              <span className="text-teal/70 select-none font-bold shrink-0">❯</span>
              <input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="post exercise-apoe4"
                aria-label="Generate content command"
                className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-gray-600 text-base min-h-[44px]"
                disabled={run.isPending}
              />
              {run.isPending && (
                <span className="text-xs text-teal/60 animate-pulse shrink-0">processing...</span>
              )}
            </div>
            <button
              type="submit"
              disabled={run.isPending || !command.trim()}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 btn-primary disabled:opacity-40 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
            >
              {run.isPending ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Go
                </>
              ) : (
                <>
                  Generate
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-400 self-center mr-1">Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setCommand(ex)}
                className="text-xs px-3 py-1.5 bg-secondary hover:bg-primary/10 hover:text-primary hover:border-primary/15 border border-transparent text-muted-foreground rounded-full font-mono transition-all"
              >
                {ex}
              </button>
            ))}
          </div>
        </form>

        {run.isError && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
            {run.error instanceof ApiError ? run.error.message : "Something went wrong"}
          </p>
        )}

        {lastResult?.post && (
          <ResultCard
            post={lastResult.post}
            message={lastResult.message}
            copied={copied}
            onCopy={(text, id) => {
              navigator.clipboard.writeText(text);
              setCopied(id);
              setTimeout(() => setCopied(null), 2000);
            }}
          />
        )}
      </section>

      {/* Schedule + Recent */}
      <div className="grid lg:grid-cols-5 gap-8">
        <section className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Upcoming
            </h2>
            <Link href="/calendar" className="text-sm text-primary hover:underline font-semibold">
              Calendar →
            </Link>
          </div>

          {scheduleLoading && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="pulse-card h-24 animate-pulse bg-gray-100" />
              ))}
            </div>
          )}

          {scheduleError && (
            <p className="text-red-600 text-sm pulse-card p-4">
              API offline — run <code className="bg-gray-100 px-1 rounded">./start.sh api</code>
            </p>
          )}

          {!scheduleLoading && !scheduleError && upcoming.length === 0 && (
            <div className="pulse-card p-10 text-center">
              <Calendar className="w-10 h-10 mx-auto text-gray-200 mb-3" />
              <p className="text-gray-400 text-sm">Nothing scheduled yet</p>
            </div>
          )}

          {!scheduleLoading && !scheduleError && upcoming.length > 0 && (
            <div className="space-y-3">
              {upcoming.slice(0, 3).map((item, i) => (
                <Link
                  key={item.id}
                  href={`/posts/${item.post_id}`}
                  className="pulse-card-hover p-5 flex items-center gap-4 group"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal to-cyan flex items-center justify-center shrink-0 shadow-md shadow-teal/15">
                    <span className="text-white text-xs font-bold text-center leading-tight">
                      {format(parseISO(item.scheduled_at), "MMM")}
                      <br />
                      {format(parseISO(item.scheduled_at), "d")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold group-hover:text-primary transition-colors truncate">
                      {item.post_title}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {format(parseISO(item.scheduled_at), "h:mm a")}
                    </p>
                    <div className="mt-2">
                      <PlatformBadges platforms={item.platform_targets} />
                    </div>
                  </div>
                  {isPast(parseISO(item.scheduled_at)) && (
                    <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-full shrink-0">
                      due
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {dashboard && dashboard.recent_posts.length > 0 && (
          <section className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xl">Recent</h2>
              <Link href="/board" className="text-sm text-primary hover:underline font-semibold">
                Board →
              </Link>
            </div>
            <div className="pulse-card divide-y overflow-hidden">
              {dashboard.recent_posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/posts/${p.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-gray-50/80 transition-colors group"
                >
                  <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                    {p.title}
                  </span>
                  <StatusBadge status={p.status} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ResultCard({
  post,
  message,
  copied,
  onCopy,
}: {
  post: Post;
  message: string;
  copied: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-teal/30 overflow-hidden bg-card shadow-xl shadow-teal/5 animate-fade-up">
      <div className="px-5 py-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, hsl(var(--foreground)), hsl(196 45% 38%))" }}>
        <span className="text-sm text-white font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          {message}
        </span>
        <Link
          href={`/posts/${post.id}`}
          className="text-sm text-white/90 font-semibold hover:text-white flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full"
        >
          Open post <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="p-5 grid md:grid-cols-2 gap-5">
        {post.media_assets[0]?.url && (
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-br from-primary/15 to-teal/15 rounded-2xl blur-sm" />
            <div className="relative bg-muted rounded-xl p-2 ring-1 ring-border">
              <AuthImage
                src={post.media_assets[0].url}
                alt="Preview"
                className="w-full object-contain rounded-lg aspect-square"
              />
              {post.media_assets.length > 1 && (
                <p className="text-xs text-gray-400 text-center mt-2 font-medium">
                  +{post.media_assets.length - 1} more slides
                </p>
              )}
            </div>
          </div>
        )}

        {post.variants.length > 0 && (
          <div className="space-y-3">
            {post.variants.map((v) => (
              <div key={v.id} className="bg-muted rounded-xl p-4 ring-1 ring-border">
                <div className="flex items-center justify-between mb-2">
                  <PlatformBadges platforms={[v.platform]} size="md" />
                  <button
                    onClick={() => onCopy(v.caption, v.id)}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    {copied === v.id ? <Check className="w-3 h-3 text-teal" /> : <Copy className="w-3 h-3" />}
                    {copied === v.id ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-sm text-gray-600 line-clamp-4 whitespace-pre-wrap leading-relaxed">{v.caption}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
