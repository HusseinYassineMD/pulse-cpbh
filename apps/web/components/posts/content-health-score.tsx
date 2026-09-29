"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { healthColor, healthRingColor, scorePostHealth } from "@/lib/content-health";
import type { Post } from "@/lib/types";

export function ContentHealthScore({ post }: { post: Post }) {
  const [expanded, setExpanded] = useState(false);
  const health = scorePostHealth(post);
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (health.score / 100) * circumference;

  return (
    <div className="pulse-card p-4 sm:p-5 border border-border/80">
      <div className="flex items-center gap-4">
        <div className="relative w-14 h-14 shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44" aria-hidden>
            <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" className="text-gray-100" strokeWidth="4" />
            <circle
              cx="22"
              cy="22"
              r={radius}
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className={healthRingColor(health.score)}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${healthColor(health.score)}`}>
            {health.score}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal shrink-0" />
            <p className="font-semibold text-sm">Content health</p>
          </div>
          <p className={`text-sm font-medium ${healthColor(health.score)}`}>{health.grade}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {health.checks.filter((c) => c.ok).length}/{health.checks.length} checks passed
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary shrink-0"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <ul className="mt-4 pt-4 border-t border-border/60 space-y-2">
          {health.checks.map((check) => (
            <li key={check.label} className="flex items-center gap-2 text-sm">
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  check.ok ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
                }`}
              >
                {check.ok ? <Check className="w-3 h-3" /> : "·"}
              </span>
              <span className={check.ok ? "text-foreground" : "text-muted-foreground"}>{check.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
