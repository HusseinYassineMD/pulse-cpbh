"use client";

import Link from "next/link";
import { BarChart3, Calendar, GitBranch, Lightbulb, ArrowRight, Sparkles } from "lucide-react";

const TOOLS = [
  {
    href: "/studio",
    label: "Create Studio",
    desc: "Step-by-step slides + captions",
    icon: Sparkles,
    accent: "from-primary to-teal",
  },
  {
    href: "/analytics",
    label: "Analytics",
    desc: "Reach, trends & activity",
    icon: BarChart3,
    accent: "from-teal to-cyan",
  },
  {
    href: "/ideas",
    label: "Ideas",
    desc: "Curated content prompts",
    icon: Lightbulb,
    accent: "from-amber-400 to-orange-500",
  },
  {
    href: "/pipeline",
    label: "Pipeline",
    desc: "Source → draft → publish",
    icon: GitBranch,
    accent: "from-primary to-teal",
  },
  {
    href: "/calendar",
    label: "Schedule",
    desc: "Queue & calendar view",
    icon: Calendar,
    accent: "from-blue-500 to-indigo-600",
  },
] as const;

export function QuickTools() {
  return (
    <section className="space-y-4 animate-stagger">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-0.5">Quick tools</p>
          <h2 className="font-bold text-xl">Everything in one workspace</h2>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Press <kbd className="font-mono px-1 py-0.5 rounded bg-secondary border text-[10px]">⌘K</kbd> anywhere
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TOOLS.map(({ href, label, desc, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            className="pulse-card-hover p-4 flex items-start gap-3 group min-h-[88px]"
          >
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accent} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm flex items-center gap-1 group-hover:text-primary transition-colors">
                {label}
                <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
