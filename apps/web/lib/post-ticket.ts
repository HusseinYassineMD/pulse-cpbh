import type { Post } from "./types";

/** Display ticket e.g. CPBH-251024-A3F9 for student drafts. */
export function draftTicketId(post: Post): string | null {
  const cfg = post.source_config;
  if (!cfg || typeof cfg !== "object") return null;
  const tid = (cfg as { ticket_id?: string }).ticket_id?.trim();
  return tid || null;
}

export function draftTicketLabel(post: Post): string {
  return draftTicketId(post) ?? `Draft ${post.id.slice(0, 8).toUpperCase()}`;
}
