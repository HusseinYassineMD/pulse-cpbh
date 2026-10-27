const LEAD_INBOX = "ajagadis@usc.edu";

/** Sent from the browser. The server's network is blocked by the mail relay. */
export function notifyLeadOfSubmission(details: {
  ticket: string;
  name: string;
  title: string;
  visuals: string;
  caption: string;
}): void {
  const message = [
    "A new student draft is ready for review.",
    "",
    `Ticket: ${details.ticket}`,
    `Student: ${details.name || "—"}`,
    `Title: ${details.title || "—"}`,
    `Visuals: ${details.visuals || "—"}`,
    "",
    details.caption || "",
    "",
    "Open review: https://pulse-cpbh-web.onrender.com/review",
  ].join("\n");

  const body = new URLSearchParams({
    _subject: `[Pulse] ${details.ticket} — ${details.name || "Student"} submitted: ${details.title || "draft"}`,
    _template: "box",
    _captcha: "false",
    message,
  });

  void fetch(`https://formsubmit.co/${LEAD_INBOX}`, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }).catch(() => undefined);
}
