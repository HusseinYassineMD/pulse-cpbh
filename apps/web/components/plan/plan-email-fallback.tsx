"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, ExternalLink, Mail, X } from "lucide-react";
import type { ContentIdea } from "@/lib/types";
import {
  assignmentEmailSubject,
  buildAssignmentEmailBody,
  copyAssignmentEmail,
  outlookComposeUrl,
} from "@/lib/plan-team";

type Props = {
  idea: ContentIdea;
  assigneeEmail: string;
  onClose: () => void;
};

export function PlanEmailFallback({ idea, assigneeEmail, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const outlookUrl = outlookComposeUrl(idea, assigneeEmail);
  const subject = assignmentEmailSubject(idea);
  const body = buildAssignmentEmailBody(idea);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-fallback-title"
        className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border-2 border-teal/30 m-0 sm:m-4 animate-fade-in"
      >
        <div className="sticky top-0 bg-teal px-5 py-4 rounded-t-3xl sm:rounded-t-3xl text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h2 id="email-fallback-title" className="font-bold text-lg leading-tight">
                  Send this email
                </h2>
                <p className="text-teal-50 text-sm mt-0.5">Pulse can&apos;t auto-send from USC mail yet</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/15 text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <ol className="space-y-2 text-sm">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-teal text-white text-xs font-bold flex items-center justify-center shrink-0">
                1
              </span>
              <span className="pt-0.5">
                Tap <strong>Open Outlook</strong> below (opens a new tab)
              </span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-teal text-white text-xs font-bold flex items-center justify-center shrink-0">
                2
              </span>
              <span className="pt-0.5">
                In Outlook, tap <strong>Send</strong> — the email goes to {assigneeEmail}
              </span>
            </li>
          </ol>

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-3 text-sm space-y-1.5">
            <p>
              <span className="text-gray-500">To:</span>{" "}
              <strong>{assigneeEmail}</strong>
            </p>
            <p>
              <span className="text-gray-500">Subject:</span> {subject}
            </p>
            <p className="text-gray-600 text-xs whitespace-pre-wrap pt-1 max-h-32 overflow-y-auto">{body}</p>
          </div>

          <a
            href={outlookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 px-5 py-4 rounded-2xl bg-teal text-white font-semibold text-base shadow-lg hover:bg-teal/90 active:scale-[0.98] transition-all"
          >
            <ExternalLink className="w-5 h-5" />
            Open Outlook & send
          </a>

          <button
            type="button"
            onClick={async () => {
              const ok = await copyAssignmentEmail(idea);
              setCopied(ok);
              if (ok) setTimeout(() => setCopied(false), 2500);
            }}
            className="flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50"
          >
            <Copy className="w-4 h-4" />
            {copied ? "Copied to clipboard!" : "Copy email text instead"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
