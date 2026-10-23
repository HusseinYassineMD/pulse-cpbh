"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Post } from "@/lib/types";
import { isStudentDraft } from "@/lib/social-workflow";
import { draftTicketLabel } from "@/lib/post-ticket";
import { kindLabel } from "@/lib/submit-source-materials";

function sourceFileHref(postId: string, filename: string): string {
  const base = filename.startsWith("sources/") ? filename.replace(/^sources\//, "") : filename;
  return `/api/media/posts/${postId}/sources/${encodeURIComponent(base)}`;
}

export function StudentDraftDetails({ post, compact = false }: { post: Post; compact?: boolean }) {
  if (!isStudentDraft(post)) return null;
  const cfg = post.source_config;
  if (!cfg) return null;

  const materials = (cfg.source_materials as Array<Record<string, string>> | undefined) ?? [];
  const deliverable = cfg.deliverable === "story" ? "Story" : "Post";

  const row = (label: string, value: ReactNode) => {
    if (!value) return null;
    return (
      <div className={compact ? "text-xs" : "text-sm"}>
        <span className="text-muted-foreground">{label}: </span>
        <span className="text-foreground break-all">{value}</span>
      </div>
    );
  };

  return (
    <div
      className={`rounded-xl border border-border/80 bg-muted/30 space-y-2 ${
        compact ? "p-3 text-xs" : "p-4 text-sm"
      }`}
    >
      <p className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>
        {draftTicketLabel(post)} · {deliverable}
      </p>
      {row("Content link (Canva / Drive)", cfg.canva_link ? (
        <a href={cfg.canva_link} target="_blank" rel="noopener noreferrer" className="text-teal underline">
          Open design
        </a>
      ) : null)}
      {row("Slide #s (dept folder)", cfg.canva_slide_numbers)}
      {row("Link in bio", cfg.link_in_bio ? (
        <a href={cfg.link_in_bio} target="_blank" rel="noopener noreferrer" className="text-teal underline">
          {cfg.link_in_bio}
        </a>
      ) : null)}
      {cfg.student_notes && row("Notes", cfg.student_notes)}
      {materials.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-muted-foreground font-medium">Source material</p>
          <ul className="space-y-1">
            {materials.map((m, i) => (
              <li key={`${m.url ?? m.filename ?? i}`} className="leading-snug">
                <span className="font-medium">{m.label || kindLabel(m.kind || "other")}</span>
                <span className="text-muted-foreground"> · {kindLabel(m.kind || "other")}</span>
                {m.url && (
                  <>
                    {" · "}
                    <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-teal underline">
                      Link
                    </a>
                  </>
                )}
                {m.filename && (
                  <>
                    {" · "}
                    <Link href={sourceFileHref(post.id, m.filename)} className="text-teal underline">
                      Download
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
