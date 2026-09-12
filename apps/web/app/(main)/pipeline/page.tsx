"use client";

import { GitBranch } from "lucide-react";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";

export default function PipelinePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Content pipeline</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <GitBranch className="w-7 h-7 text-teal hidden sm:block" />
          Pipeline
        </h1>
        <p className="text-muted-foreground mt-2 text-sm max-w-2xl leading-relaxed">
          Paste your source material, click <strong className="font-medium text-foreground">Summarize</strong> to
          get AI highlights, or use <strong className="font-medium text-foreground">Create output</strong> to skip
          straight to a post, caption, story, or newsletter. You can also add highlights manually anytime.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pulse-card px-4 py-2.5">
        <span className="font-medium text-foreground w-full sm:w-auto">Flow:</span>
        <span className="px-2 py-0.5 rounded-full bg-secondary">1 Source</span>
        <span className="hidden sm:inline">→</span>
        <span className="px-2 py-0.5 rounded-full bg-secondary">2 Highlights</span>
        <span className="hidden sm:inline">→</span>
        <span className="px-2 py-0.5 rounded-full bg-secondary">3 Output</span>
        <span className="text-muted-foreground/80 sm:ml-1">· drag cards between columns (swipe board on phone)</span>
      </div>

      <PipelineBoard />
    </div>
  );
}
