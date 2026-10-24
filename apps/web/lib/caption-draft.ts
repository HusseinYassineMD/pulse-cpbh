/** Punchy social captions without OpenAI — hooks, emojis, USC CPBH hashtags. */

const HASHTAGS_IG = "#BrainHealth #USCCPBH #SleepHealth #CognitiveHealth";
const HASHTAGS_FB = "#BrainHealth #USCCPBH #AlzheimersPrevention";
const HASHTAGS_LI = "#BrainHealth #USCCPBH #Neuroscience #PublicHealth";

function themeFrom(text: string): "sleep" | "nutrition" | "exercise" | "memory" | "general" {
  const t = text.toLowerCase();
  if (/\b(sleep|insomnia|circadian|rest)\b/.test(t)) return "sleep";
  if (/\b(diet|nutrition|food|omega)\b/.test(t)) return "nutrition";
  if (/\b(exercise|walk|movement|fitness)\b/.test(t)) return "exercise";
  if (/\b(memory|cognitive|alzheimer|dementia)\b/.test(t)) return "memory";
  return "general";
}

function hook(theme: ReturnType<typeof themeFrom>, topic: string): string {
  const short = topic.split(/[.!?]/)[0]?.trim().slice(0, 90) || topic.slice(0, 90);
  switch (theme) {
    case "sleep":
      return `🌙 Sleep and your brain — let's clear up the confusion.\n"${short}"`;
    case "nutrition":
      return `🥗 Food choices matter for brain health.\n"${short}"`;
    case "exercise":
      return `🚶‍♀️ Movement is brain medicine.\n"${short}"`;
    case "memory":
      return `🧠 Memory questions? You're not alone.\n"${short}"`;
    default:
      return `✨ Brain health, explained simply.\n"${short}"`;
  }
}

function bodyLines(notes: string, topic: string): string {
  const raw = (notes.trim() || topic.trim()).replace(/\s+/g, " ");
  if (!raw) return "Small daily habits add up — especially for long-term brain health.";
  const sentences = raw.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length >= 2) return sentences.slice(0, 3).join(" ");
  if (raw.length > 120) return `${raw.slice(0, 200).trim()}…`;
  return `${raw}\n\nHere's the patient-friendly takeaway: stay curious, keep routines steady, and talk with your care team when something feels off.`;
}

const CTA = "💙 USC Center for Personalized Brain Health — science-backed tips for everyday brain wellness.";

export function draftSocialCaptions(title: string, sourceText: string): {
  instagram: string;
  facebook: string;
  linkedin: string;
} {
  const topic = title.trim() || "Brain health";
  const notes = sourceText.trim() || topic;
  const theme = themeFrom(`${topic} ${notes}`);
  const open = hook(theme, topic);
  const body = bodyLines(notes, topic);

  const instagram = `${open}\n\n${body}\n\n${CTA}\n\n${HASHTAGS_IG}`.slice(0, 2200);
  const facebook = `${open}\n\n${body}\n\n${CTA}\n\n${HASHTAGS_FB}`.slice(0, 600);
  const linkedin = `${topic}\n\n${body}\n\n${CTA}\n\n${HASHTAGS_LI}`.slice(0, 1200);

  return { instagram, facebook, linkedin };
}
