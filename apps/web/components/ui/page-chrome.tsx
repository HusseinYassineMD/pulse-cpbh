"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageBackLink({ href = "/board", label = "Back to board" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-4 min-h-[44px] touch-manipulation"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </Link>
  );
}

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="pulse-card h-24 bg-gray-100/80 rounded-2xl" />
      ))}
    </div>
  );
}

export function PageError({
  message,
  onRetry,
  backHref = "/board",
  backLabel = "Back to board",
}: {
  message: string;
  onRetry?: () => void;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="space-y-4">
      <PageBackLink href={backHref} label={backLabel} />
      <div className="pulse-card p-6 space-y-4 border border-red-200 bg-red-50/50">
        <p className="text-sm text-red-800">{message}</p>
        <div className="flex flex-wrap gap-2">
          {onRetry && (
            <button type="button" onClick={onRetry} className="px-4 py-2.5 rounded-xl text-sm font-medium btn-primary min-h-[44px]">
              Try again
            </button>
          )}
          <Link href={backHref} className="px-4 py-2.5 rounded-xl text-sm font-medium border border-border bg-white hover:bg-secondary min-h-[44px] inline-flex items-center">
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
