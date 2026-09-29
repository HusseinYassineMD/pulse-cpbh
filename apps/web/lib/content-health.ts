import { BRAND_HASHTAGS } from "@/lib/insights";
import type { Post } from "@/lib/types";

export type HealthCheck = {
  label: string;
  ok: boolean;
  points: number;
};

export type ContentHealth = {
  score: number;
  grade: "Excellent" | "Good" | "Needs work" | "Draft";
  checks: HealthCheck[];
};

const PLATFORMS = ["instagram", "facebook", "linkedin"] as const;

export function scorePostHealth(post: Post): ContentHealth {
  const checks: HealthCheck[] = [];

  checks.push({
    label: "Carousel slides",
    ok: post.media_assets.length > 0,
    points: 25,
  });

  for (const platform of PLATFORMS) {
    const caption = post.variants.find((v) => v.platform === platform)?.caption?.trim() ?? "";
    checks.push({
      label: `${platform.charAt(0).toUpperCase()}${platform.slice(1)} caption`,
      ok: caption.length >= 40,
      points: 20,
    });
  }

  const allText = post.variants.map((v) => v.caption ?? "").join(" ").toLowerCase();
  checks.push({
    label: "Brand hashtags",
    ok: BRAND_HASHTAGS.some((tag) => allText.includes(tag.toLowerCase())),
    points: 15,
  });

  const score = checks.filter((c) => c.ok).reduce((sum, c) => sum + c.points, 0);
  const grade =
    score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 45 ? "Needs work" : "Draft";

  return { score, grade, checks };
}

export function healthColor(score: number): string {
  if (score >= 85) return "text-emerald-600";
  if (score >= 70) return "text-teal";
  if (score >= 45) return "text-amber-600";
  return "text-gray-500";
}

export function healthRingColor(score: number): string {
  if (score >= 85) return "stroke-emerald-500";
  if (score >= 70) return "stroke-teal";
  if (score >= 45) return "stroke-amber-500";
  return "stroke-gray-300";
}
