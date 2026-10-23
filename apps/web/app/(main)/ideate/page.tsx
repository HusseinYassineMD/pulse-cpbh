"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Bot, Copy, Check, Sparkles, Wand2 } from "lucide-react";
import { TrendScanner } from "@/components/ideas/trend-scanner";
import { api, ApiError } from "@/lib/api";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

export default function IdeatePage() {
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [captions, setCaptions] = useState<{ instagram: string; facebook: string; linkedin: string } | null>(
    null
  );
  const [copied, setCopied] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Ask for story angles, hooks, or how to explain a topic for patients. When you are ready, copy a caption into Send draft.",
    },
  ]);
  const chatRef = useRef<HTMLDivElement>(null);

  const gen = useMutation({
    mutationFn: () =>
      api.ideation.captions({
        title: topic.trim() || "CPBH post",
        source_text: notes.trim() || topic.trim(),
      }),
    onSuccess: (data) => setCaptions(data),
  });

  const chat = useMutation({
    mutationFn: () => {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.text }));
      return api.ideation.chat({
        message: chatInput.trim(),
        history,
        context: [topic, notes].filter(Boolean).join("\n\n"),
      });
    },
    onSuccess: (data) => {
      const userText = chatInput.trim();
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", text: userText },
        { id: `a-${Date.now()}`, role: "assistant", text: data.reply },
      ]);
      setChatInput("");
      requestAnimationFrame(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" }));
    },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const t = params.get("topic");
    if (t) setTopic(t);
  }, []);

  function copyCaption(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const draftHref = () => {
    const params = new URLSearchParams();
    if (topic.trim()) params.set("topic", topic.trim());
    const cap = captions?.instagram || notes.trim();
    if (cap) params.set("caption", cap.slice(0, 2000));
    const q = params.toString();
    return q ? `/submit?${q}` : "/submit";
  };

  return (
    <div className="max-w-5xl mx-auto pb-10 animate-fade-in">
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-2xl font-bold">Ideation</h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Explore hot topics, draft captions, and chat through ideas — then send a draft to your lead.
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(240px,280px)_1fr] gap-6 items-start">
        <aside className="lg:sticky lg:top-4">
          <TrendScanner layout="sidebar" />
        </aside>

        <div className="space-y-6 min-w-0">
          <section className="pulse-card p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-teal" />
              Caption drafts
            </h2>
            <label className="block">
              <span className="text-sm font-medium">Topic</span>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="form-input mt-1.5 w-full"
                placeholder="e.g. Sleep and memory"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Notes or source text</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="form-input mt-1.5 w-full"
                placeholder="Paste bullets, article summary, or patient handout text…"
              />
            </label>
            <button
              type="button"
              disabled={gen.isPending || (!topic.trim() && !notes.trim())}
              onClick={() => gen.mutate()}
              className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {gen.isPending ? "Generating…" : "Generate captions"}
            </button>
            {gen.isError && (
              <p className="text-sm text-red-700">
                {gen.error instanceof ApiError ? gen.error.message : "Could not generate"}
              </p>
            )}
            {captions && (
              <div className="space-y-3 pt-2 border-t border-border">
                {(["instagram", "facebook", "linkedin"] as const).map((platform) => (
                  <div key={platform} className="rounded-xl bg-muted/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold uppercase text-muted-foreground">{platform}</span>
                      <button
                        type="button"
                        onClick={() => copyCaption(captions[platform], platform)}
                        className="text-xs text-teal font-medium inline-flex items-center gap-1"
                      >
                        {copied === platform ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        Copy
                      </button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{captions[platform]}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="pulse-card p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Bot className="w-4 h-4 text-teal" />
              Idea chat
            </h2>
            <div ref={chatRef} className="max-h-64 overflow-y-auto space-y-2 rounded-xl bg-muted/30 p-3 text-sm">
              {messages.map((m) => (
                <p key={m.id} className={m.role === "user" ? "text-foreground font-medium" : "text-muted-foreground"}>
                  {m.role === "user" ? "You: " : "Coach: "}
                  {m.text}
                </p>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatInput.trim() || chat.isPending) return;
                chat.mutate();
              }}
            >
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="form-input flex-1 text-sm"
                placeholder="Ask for hooks, story structure, plain-language tips…"
              />
              <button type="submit" disabled={chat.isPending} className="btn-primary px-4 rounded-xl text-sm font-semibold">
                Send
              </button>
            </form>
          </section>

          <Link
            href={draftHref()}
            className="pulse-card flex items-center justify-between p-5 border-2 border-teal/30 hover:border-teal/50 transition-colors"
          >
            <div>
              <p className="font-bold">Ready to submit?</p>
              <p className="text-sm text-muted-foreground">Send draft with your caption and content link.</p>
            </div>
            <ArrowRight className="w-5 h-5 text-teal shrink-0" />
          </Link>
        </div>
      </div>
    </div>
  );
}
