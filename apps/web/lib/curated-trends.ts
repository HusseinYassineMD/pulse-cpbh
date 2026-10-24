import type { TrendScanResponse } from "./trends-types";

/** Always-available brain-health starters when live RSS/API fails. */
export function curatedTrendsResponse(limit = 12): TrendScanResponse {
  const items = [
    {
      id: "curated-sleep-brain",
      title: "Why sleep quality matters for memory and mood",
      url: "https://medlineplus.gov/sleepdisorders.html",
      source: "CPBH curated",
      summary: "Sleep helps the brain clear waste and consolidate memories.",
      published_at: null,
      theme: "Sleep",
      suggested_hook: "Hook: 'Think sleep is optional? Your brain disagrees.' — 3 slides on sleep & memory.",
      deliverable: "story" as const,
    },
    {
      id: "curated-walk-cognition",
      title: "Walking and cognitive health: what research suggests",
      url: "https://www.nia.nih.gov/health/brain-health/cognitive-health-and-older-adults",
      source: "CPBH curated",
      summary: "Regular movement supports blood flow and brain resilience.",
      published_at: null,
      theme: "Exercise",
      suggested_hook: "Carousel: simple ways movement supports brain health.",
      deliverable: "post" as const,
    },
    {
      id: "curated-mind-diet",
      title: "MIND diet patterns and long-term brain health",
      url: "https://www.nia.nih.gov/health/mind-diet",
      source: "CPBH curated",
      summary: "Plant-forward eating linked to slower cognitive decline in observational studies.",
      published_at: null,
      theme: "Nutrition",
      suggested_hook: "Story: one MIND diet habit to try this week.",
      deliverable: "story" as const,
    },
    {
      id: "curated-social-brain",
      title: "Social connection and brain aging",
      url: "https://medlineplus.gov/socialphobia.html",
      source: "CPBH curated",
      summary: "Staying connected may support cognitive and emotional health.",
      published_at: null,
      theme: "Social",
      suggested_hook: "Post: loneliness & brain health — compassionate, evidence-aware tone.",
      deliverable: "post" as const,
    },
    {
      id: "curated-stress",
      title: "Stress, cortisol, and what you can control",
      url: "https://medlineplus.gov/stress.html",
      source: "CPBH curated",
      summary: "Chronic stress can affect sleep, mood, and cognition over time.",
      published_at: null,
      theme: "Brain health",
      suggested_hook: "Reel/story: 60-second stress reset + CPBH resources.",
      deliverable: "story" as const,
    },
    {
      id: "curated-hearing",
      title: "Hearing loss and dementia risk — why screening matters",
      url: "https://www.nia.nih.gov/health/hearing-loss-and-dementia",
      source: "CPBH curated",
      summary: "Treating hearing loss may help reduce cognitive load and isolation.",
      published_at: null,
      theme: "Research",
      suggested_hook: "Post: hearing health as part of brain health.",
      deliverable: "post" as const,
    },
  ];
  return {
    scanned_at: new Date().toISOString(),
    sources_checked: ["CPBH curated"],
    items: items.slice(0, limit),
  };
}
