"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { api, ApiError } from "@/lib/api";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const QUICK_PROMPTS = [
  { label: "Shorter for Instagram", message: "Shorten the Instagram caption to under 280 characters while keeping the key message." },
  { label: "Add clinic CTA", message: "Add a warm call-to-action inviting readers to learn more at USC CPBH." },
  { label: "More patient-friendly", message: "Rewrite in plain, patient-friendly language — less jargon, same facts." },
  { label: "LinkedIn tone", message: "Make the LinkedIn caption more professional and research-backed." },
  { label: "Add hashtags", message: "Add relevant brain-health hashtags including #BrainHealth and #USCCPBH." },
];

type Props = {
  postId: string;
  onUpdated: () => void;
  disabled?: boolean;
};

export function ContentChat({ postId, onUpdated, disabled }: Props) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Ask for anything — tone, length, hashtags, CTAs, or paste instructions. I'll rewrite your captions and keep the conversation going.",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  const chat = useMutation({
    mutationFn: (payload: { message: string; history: { role: "user" | "assistant"; content: string }[] }) =>
      api.posts.chatRefine(postId, payload.message, { history: payload.history }),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", text: data.reply },
      ]);
      setInput("");
      onUpdated();
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    },
    onError: (e) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: e instanceof ApiError ? e.message : "Could not refine — try again.",
        },
      ]);
    },
  });

  function buildHistory(excludeLatestUser?: string) {
    return messages
      .filter((m) => m.id !== "welcome")
      .filter((m) => !(excludeLatestUser && m.role === "user" && m.text === excludeLatestUser))
      .map((m) => ({ role: m.role, content: m.text }));
  }

  function send(text: string) {
    const msg = text.trim();
    if (!msg || chat.isPending || disabled) return;

    const history = buildHistory();
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: msg }]);
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
    chat.mutate({ message: msg, history });
  }

  return (
    <div className="pulse-card flex flex-col border border-border/80 h-full min-h-[360px] max-h-[520px]">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-teal/15 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-teal" />
        </div>
        <div>
          <p className="text-sm font-semibold">Content assistant</p>
          <p className="text-[11px] text-muted-foreground">Multi-turn chat — refine as many times as you need</p>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Chat messages"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && <Bot className="w-4 h-4 text-teal shrink-0 mt-1" />}
            <p
              className={`text-sm leading-relaxed max-w-[90%] rounded-2xl px-3 py-2 whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}
        {chat.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Rewriting captions…
          </div>
        )}
      </div>

      <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
        {QUICK_PROMPTS.map(({ label, message }) => (
          <button
            key={label}
            type="button"
            disabled={disabled || chat.isPending}
            onClick={() => send(message)}
            className="text-[10px] font-medium px-2 py-1 rounded-full border border-border hover:bg-secondary disabled:opacity-40"
          >
            {label}
          </button>
        ))}
      </div>

      <form
        className="p-3 border-t border-border flex gap-2 shrink-0 items-end"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          disabled={disabled || chat.isPending}
          rows={2}
          placeholder="Type your request… (Enter to send, Shift+Enter for new line)"
          className="flex-1 px-3 py-2.5 min-h-[52px] rounded-xl border border-border text-base sm:text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || disabled || chat.isPending}
          className="p-2.5 min-w-[44px] min-h-[44px] rounded-xl btn-primary disabled:opacity-50 flex items-center justify-center shrink-0"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
