"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  text: string;
  maxLines?: number;
  className?: string;
  emptyLabel?: string;
};

/** Shows full text with optional collapse when long — no hidden line-clamp by default. */
export function VisibleContent({ text, maxLines = 8, className = "", emptyLabel }: Props) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = text?.trim() ?? "";

  if (!trimmed) {
    return emptyLabel ? (
      <p className={`text-xs text-muted-foreground italic ${className}`}>{emptyLabel}</p>
    ) : null;
  }

  const lineCount = trimmed.split("\n").length;
  const long = trimmed.length > 280 || lineCount > maxLines;

  return (
    <div className={className}>
      <div
        className={`text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed ${
          long && !expanded ? `line-clamp-[${maxLines}]` : ""
        }`}
        style={
          long && !expanded
            ? {
                display: "-webkit-box",
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }
            : undefined
        }
      >
        {trimmed}
      </div>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Show all
            </>
          )}
        </button>
      )}
    </div>
  );
}
