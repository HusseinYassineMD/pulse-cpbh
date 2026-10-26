"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Link2, Plus, Send, Trash2 } from "lucide-react";
import { draftTicketLabel } from "@/lib/post-ticket";
import type { Post } from "@/lib/types";
import { api, ApiError } from "@/lib/api";
import { isStaticMode } from "@/lib/base-path";
import { HOSTED_APP_URL } from "@/lib/static-config";
import { readSubmitName, writeSubmitName } from "@/lib/submit-prefs";
import { SUBMIT_PLATFORMS } from "@/lib/submit-platforms";
import {
  SOURCE_MATERIAL_KINDS,
  type SourceMaterialLink,
} from "@/lib/submit-source-materials";
import { readIdeateDraftForSubmit } from "@/lib/ideate-submit-handoff";
import { submitStudentDraftReliable } from "@/lib/submit-student-draft";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function SubmitDraftPage() {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [deliverable, setDeliverable] = useState<"post" | "story">("post");
  const [canvaLink, setCanvaLink] = useState("");
  const [canvaSlides, setCanvaSlides] = useState("");
  const [linkInBio, setLinkInBio] = useState("");
  const [linkSources, setLinkSources] = useState<SourceMaterialLink[]>([
    { id: newId(), kind: "yassinelab_substack", label: "", url: "" },
  ]);
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "facebook", "linkedin"]);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [lastPost, setLastPost] = useState<Post | null>(null);
  const [sendHint, setSendHint] = useState("");
  const [captionsByPlatform, setCaptionsByPlatform] = useState<{
    instagram: string;
    facebook: string;
    linkedin: string;
  } | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  function togglePlatform(id: string) {
    setPlatforms((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((p) => p !== id);
        return next.length ? next : prev;
      }
      return [...prev, id];
    });
  }

  useEffect(() => {
    setName(readSubmitName());
    if (typeof window === "undefined") return;

    const handoff = readIdeateDraftForSubmit();
    if (handoff) {
      if (handoff.topic) setTopic(handoff.topic);
      if (handoff.notes) setNotes(handoff.notes);
      if (handoff.captions) {
        setCaptionsByPlatform(handoff.captions);
        setCaption(handoff.captions.instagram);
      }
    }

    const params = new URLSearchParams(window.location.search);
    const t = params.get("topic");
    const c = params.get("caption");
    if (t && !handoff?.topic) setTopic(t);
    if (c && !handoff?.captions) setCaption(c);
  }, []);

  const submit = useMutation({
    mutationFn: async () => {
      const title = topic.trim() || caption.trim().slice(0, 80) || "Untitled draft";
      const form = new FormData();
      form.set("title", title);
      form.set("submitted_by", name.trim());
      form.set("notes", notes.trim());
      const unified = caption.trim();
      const ig = captionsByPlatform?.instagram.trim() || unified;
      const fb = captionsByPlatform?.facebook.trim() || unified;
      const li = captionsByPlatform?.linkedin.trim() || unified;
      form.set("unified_caption", unified);
      form.set("caption_instagram", ig);
      form.set("caption_facebook", fb);
      form.set("caption_linkedin", li);
      form.set("deliverable", deliverable);
      form.set("canva_link", canvaLink.trim());
      if (canvaSlides.trim()) form.set("canva_slide_numbers", canvaSlides.trim());
      if (linkInBio.trim()) form.set("link_in_bio", linkInBio.trim());

      const sourcesPayload = linkSources
        .filter((s) => s.url.trim())
        .map(({ kind, label, url }) => ({
          kind,
          label: label.trim() || undefined,
          url: url.trim(),
        }));
      form.set("sources_json", JSON.stringify(sourcesPayload));
      platforms.forEach((p) => form.append("platforms", p));
      return submitStudentDraftReliable((f) => api.posts.submitStudentDraft(f), form);
    },
    onSuccess: (post) => {
      writeSubmitName(name);
      setLastPost(post);
      setDone(true);
      setError("");
    },
    onError: (e) => {
      setSendHint("");
      let msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Could not send — try again.";
      if (msg.includes("TimeoutError") || msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("aborted")) {
        msg = "Connection timed out — tap Send once more. Your answers are still on this page.";
      } else if (msg.includes("502") || msg.toLowerCase().includes("could not reach pulse api")) {
        msg = "Could not connect just now — wait a few seconds and tap Send again.";
      } else if (msg.includes("500") || msg.toLowerCase().includes("internal")) {
        msg = "Server error — ask your lead to restart the team app, then try again.";
      }
      showValidationError(msg);
    },
  });

  useEffect(() => {
    if (!submit.isPending) {
      setSendHint("");
      return;
    }
    const t1 = window.setTimeout(() => {
      setSendHint("Connecting…");
    }, 2500);
    const t2 = window.setTimeout(() => {
      setSendHint("Waking the server — can take up to a minute on first send…");
    }, 12000);
    const t3 = window.setTimeout(() => {
      setSendHint("Still saving — do not close this page…");
    }, 45000);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [submit.isPending]);

  function resetForm() {
    setDone(false);
    setTopic("");
    setCaption("");
    setNotes("");
    setCanvaLink("");
    setCanvaSlides("");
    setLinkInBio("");
    setLinkSources([{ id: newId(), kind: "yassinelab_substack", label: "", url: "" }]);
    setLastPost(null);
    setCaptionsByPlatform(null);
  }

  function showValidationError(message: string) {
    setError(message);
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function validate(): string | null {
    if (!name.trim()) return "Please enter your name.";
    if (!caption.trim()) return "Please paste your caption.";
    if (!canvaLink.trim()) return "Add a Canva or Google Drive link to your visuals.";
    if (platforms.length === 0) return "Pick at least one place to post.";
    if (!linkSources.some((s) => s.url.trim())) {
      return "Add at least one source material link (Substack, handout, article, etc.).";
    }
    return null;
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6 animate-fade-in text-center">
        <CheckCircle2 className="w-14 h-14 text-teal mx-auto" />
        <h1 className="text-2xl font-bold">Sent!</h1>
        {lastPost && (
          <p className="font-mono text-sm font-semibold text-teal">{draftTicketLabel(lastPost)}</p>
        )}
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your lead was emailed. Save your ticket ID — they may reference it in feedback.
        </p>
        <button type="button" onClick={resetForm} className="btn-primary px-6 py-3 rounded-xl font-medium">
          Send another
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-10 animate-fade-in">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Send a draft</h1>
        <p className="text-sm text-muted-foreground">
          Post or story — one link to your visuals (Canva or Drive), plus source links. No image upload needed.
        </p>
        <p className="text-xs">
          <Link href="/ideate" className="text-teal font-medium hover:underline">
            Start in Ideation
          </Link>
        </p>
      </div>

      {isStaticMode() && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 leading-relaxed">
          Preview site only — drafts are not saved for the team.{" "}
          {HOSTED_APP_URL ? (
            <a href={`${HOSTED_APP_URL}/submit/`} className="font-semibold underline">
              Use the team link instead
            </a>
          ) : (
            "Ask your lead for the team app link."
          )}
        </p>
      )}

      <form
        noValidate
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          const v = validate();
          if (v) {
            showValidationError(v);
            return;
          }
          setError("");
          submit.mutate();
        }}
      >
        {error && (
          <p
            ref={errorRef}
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5"
          >
            {error}
          </p>
        )}

        <label className="block">
          <span className="text-sm font-medium">Your name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input mt-1.5 w-full text-base py-3"
            placeholder="First and last name"
            autoComplete="name"
          />
        </label>

        <fieldset className="block">
          <legend className="text-sm font-medium">Post or story?</legend>
          <p className="text-xs text-muted-foreground mt-1 mb-2">You still build in Canva either way.</p>
          <div className="flex gap-2">
            {(["post", "story"] as const).map((d) => {
              const on = deliverable === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDeliverable(d)}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border-2 capitalize min-h-[44px] ${
                    on ? "border-teal bg-teal/10 text-teal" : "border-border text-muted-foreground"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-medium">Topic (optional)</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="form-input mt-1.5 w-full text-base py-3"
            placeholder="e.g. Sleep and brain health"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium">Caption</span>
          <textarea
            value={caption}
            rows={6}
            className="form-input mt-1.5 w-full text-base"
            placeholder="Paste your post or story text…"
            onChange={(e) => {
              setCaption(e.target.value);
              setCaptionsByPlatform(null);
            }}
          />
        </label>
        {captionsByPlatform && (
          <p className="text-xs text-teal-900 bg-teal/10 border border-teal/25 rounded-lg px-3 py-2 leading-relaxed">
            Instagram, Facebook, and LinkedIn each keep their own caption from Ideation (including the LinkedIn hook).
            Edit this box only if you want the same text on all channels.
          </p>
        )}

        <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Content &amp; links
          </p>
          <label className="block">
            <span className="text-sm font-medium">Canva or Google Drive link</span>
            <input
              value={canvaLink}
              onChange={(e) => setCanvaLink(e.target.value)}
              type="url"
              className="form-input mt-1.5 w-full text-base py-3"
              placeholder="Canva design or Drive folder with your slides/images"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Slide numbers (dept Canva / social folder)</span>
            <input
              value={canvaSlides}
              onChange={(e) => setCanvaSlides(e.target.value)}
              className="form-input mt-1.5 w-full text-base py-3"
              placeholder="e.g. slides 3–7"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Link in bio (if different)</span>
            <input
              value={linkInBio}
              onChange={(e) => setLinkInBio(e.target.value)}
              type="url"
              className="form-input mt-1.5 w-full text-base py-3"
              placeholder="Optional — profile link for this campaign"
            />
          </label>
        </div>

        <div className="rounded-xl border border-border p-4 space-y-3">
          <p className="text-sm font-semibold">Source material</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Substack, patient handouts, journal articles, etc. — link only (no file upload).
          </p>

          <div className="space-y-3">
            {linkSources.map((row) => (
              <div key={row.id} className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border/60">
                <div className="flex gap-2">
                  <select
                    value={row.kind}
                    onChange={(e) =>
                      setLinkSources((prev) =>
                        prev.map((r) => (r.id === row.id ? { ...r, kind: e.target.value as typeof row.kind } : r))
                      )
                    }
                    className="form-input text-sm flex-1 min-w-0"
                  >
                    {SOURCE_MATERIAL_KINDS.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                  {linkSources.length > 1 && (
                    <button
                      type="button"
                      aria-label="Remove source link"
                      onClick={() => setLinkSources((prev) => prev.filter((r) => r.id !== row.id))}
                      className="p-2 text-muted-foreground hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <input
                  value={row.label}
                  onChange={(e) =>
                    setLinkSources((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r))
                    )
                  }
                  className="form-input w-full text-sm"
                  placeholder="Short label (optional)"
                />
                <input
                  value={row.url}
                  onChange={(e) =>
                    setLinkSources((prev) =>
                      prev.map((r) => (r.id === row.id ? { ...r, url: e.target.value } : r))
                    )
                  }
                  type="url"
                  className="form-input w-full text-sm"
                  placeholder="https://…"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setLinkSources((prev) => [...prev, { id: newId(), kind: "journal_article", label: "", url: "" }])
              }
              className="text-sm text-teal font-medium inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add another source link
            </button>
          </div>

        </div>

        <label className="block">
          <span className="text-sm font-medium">Notes for your lead (optional)</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="form-input mt-1.5 w-full text-base"
            placeholder="Anything else they should know"
          />
        </label>

        <fieldset className="block">
          <legend className="text-sm font-medium">Where should this go?</legend>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            Your lead schedules the actual post — you only choose the channels.
          </p>
          <div className="flex flex-wrap gap-2">
            {SUBMIT_PLATFORMS.map(({ id, label }) => {
              const on = platforms.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => togglePlatform(id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-colors min-h-[44px] ${
                    on
                      ? "border-teal bg-teal/10 text-teal"
                      : "border-border text-muted-foreground hover:border-teal/30"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {sendHint && (
          <p className="text-sm text-muted-foreground bg-muted/50 border border-border rounded-xl px-3 py-2.5">{sendHint}</p>
        )}
        <button
          type="submit"
          disabled={submit.isPending}
          className="btn-primary w-full py-4 rounded-xl text-base font-semibold inline-flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          {submit.isPending ? "Sending…" : "Send to my lead"}
        </button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Team lead?{" "}
        <Link href="/team" className="text-teal font-medium hover:underline">
          Lead sign-in
        </Link>
      </p>
    </div>
  );
}
