"use client";

import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { CreateStudio } from "@/components/studio/create-studio";

export default function StudioPage() {
  return (
    <div className="space-y-6 animate-fade-in pb-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">Create</p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          Create Studio
        </h1>
        <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
          Start from Ideas or paste anything — generate captions (and optional slides), <strong>chat to refine</strong>, approve, and schedule.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="pulse-card h-96 animate-pulse bg-gray-100 rounded-2xl" aria-hidden />
        }
      >
        <CreateStudio />
      </Suspense>
    </div>
  );
}
