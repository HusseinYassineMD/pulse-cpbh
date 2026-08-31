import { assetPath } from "./base-path";
import type { DashboardResponse, Post, PostStatus, Template } from "./types";
import type { PublishAttempt, ScheduleItem } from "./schedule-types";

export const DEMO_POST_IDS = [
  "a1000001-0000-4000-8000-000000000001",
  "a1000001-0000-4000-8000-000000000002",
  "a1000001-0000-4000-8000-000000000003",
  "a1000001-0000-4000-8000-000000000004",
  "a1000001-0000-4000-8000-000000000005",
  "a1000001-0000-4000-8000-000000000006",
  "a1000001-0000-4000-8000-000000000007",
  "a1000001-0000-4000-8000-000000000008",
  "a1000001-0000-4000-8000-000000000009",
  "a1000001-0000-4000-8000-00000000000a",
  "a1000001-0000-4000-8000-00000000000b",
  "a1000001-0000-4000-8000-00000000000c",
  "a1000001-0000-4000-8000-00000000000d",
  "a1000001-0000-4000-8000-00000000000e",
  "a1000001-0000-4000-8000-00000000000f",
] as const;

type SlideColor = "cardinal" | "teal" | "gold" | "lavender";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

function isoDaysFromNow(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function slideUrl(color: SlideColor, story = false): string {
  if (story) {
    return assetPath(color === "gold" ? "/demo/story-gold.svg" : "/demo/story-lavender.svg");
  }
  return assetPath(`/demo/slide-${color}.svg`);
}

function mediaAssets(postId: string, color: SlideColor, count: number, story = false) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${postId}-media-${i + 1}`,
    s3_key: story ? "story_01.png" : `slide_${String(i + 1).padStart(2, "0")}.png`,
    mime_type: "image/svg+xml",
    sort_order: i,
    alt_text: `Slide ${i + 1}`,
    url: slideUrl(color, story),
  }));
}

function caps(ig: string, fb: string, li?: string) {
  const variants = [
    { platform: "instagram", caption: ig },
    { platform: "facebook", caption: fb },
  ];
  if (li) variants.push({ platform: "linkedin", caption: li });
  return variants;
}

function buildVariants(postId: string, entries: { platform: string; caption: string }[]) {
  return entries.map((v, i) => ({
    id: `${postId}-variant-${i + 1}`,
    platform: v.platform,
    caption: v.caption,
    ai_suggested_caption: null,
    hashtags: null,
    approval_status: "approved",
  }));
}

interface PostSpec {
  id: string;
  title: string;
  status: PostStatus;
  template: string;
  createdDaysAgo: number;
  color: SlideColor;
  slideCount: number;
  story?: boolean;
  captions: { platform: string; caption: string }[];
}

const SPECS: PostSpec[] = [
  {
    id: DEMO_POST_IDS[0],
    title: "Exercise & APOE4",
    status: "scheduled",
    template: "exercise-apoe4",
    createdDaysAgo: 2,
    color: "cardinal",
    slideCount: 3,
    captions: caps(
      "Moving your body isn't just good for your heart — it's brain fuel. 🧠💪\n\nResearch shows regular exercise may help offset APOE4-related risk.\n\n#BrainHealth #APOE4 #USCCPBH",
      "Exercise and brain health go hand in hand — especially for those carrying the APOE4 gene.\n\nAt USC's Center for Personalized Brain Health, we translate cutting-edge research into practical tips.",
      "New research continues to highlight the link between physical activity and cognitive resilience, particularly for individuals with APOE4."
    ),
  },
  {
    id: DEMO_POST_IDS[1],
    title: "Protein Maxing for Brain Health",
    status: "scheduled",
    template: "protein-maxing",
    createdDaysAgo: 3,
    color: "teal",
    slideCount: 3,
    captions: caps(
      "Your brain runs on protein — but not all sources are equal. 🥚🐟\n\n#Nutrition #BrainFood #CPBH",
      "Protein isn't just for gym gains — it's essential for neurotransmitter production and brain repair.",
      "Dietary protein plays a critical role in cognitive function and brain maintenance."
    ),
  },
  {
    id: DEMO_POST_IDS[2],
    title: "Mindfulness Minute — Story",
    status: "scheduled",
    template: "mindfulness",
    createdDaysAgo: 1,
    color: "lavender",
    slideCount: 1,
    story: true,
    captions: [
      { platform: "instagram", caption: "Pause. Breathe. Reset. Three mindful breaths can sharpen focus in under a minute. 🧘‍♀️ #Mindfulness #CPBH" },
      { platform: "facebook", caption: "Try this today: before your next meeting, take three slow breaths. Small reset, big clarity." },
    ],
  },
  {
    id: DEMO_POST_IDS[3],
    title: "Stress & Cortisol",
    status: "scheduled",
    template: "stress-cortisol",
    createdDaysAgo: 4,
    color: "teal",
    slideCount: 3,
    captions: caps(
      "Chronic stress isn't just in your head — it reshapes your brain. 🧠⚡\n\n#StressManagement #BrainHealth",
      "When stress becomes chronic, cortisol can impair memory and accelerate brain aging.",
      "Understanding the stress–cortisol–cognition link is essential for long-term brain health."
    ),
  },
  {
    id: DEMO_POST_IDS[4],
    title: "Omega-3 & Brain Health",
    status: "scheduled",
    template: "omega-3",
    createdDaysAgo: 5,
    color: "gold",
    slideCount: 2,
    captions: caps(
      "Your brain loves omega-3s — especially DHA. 🐟🧠\n\n#Omega3 #BrainFood #CPBH",
      "Omega-3 fatty acids support cell membrane health and may reduce inflammation in the brain.",
      "Emerging research continues to link omega-3 intake with cognitive resilience."
    ),
  },
  {
    id: DEMO_POST_IDS[5],
    title: "Sleep & Cognition",
    status: "published",
    template: "sleep-cognition",
    createdDaysAgo: 14,
    color: "cardinal",
    slideCount: 3,
    captions: caps(
      "Sleep isn't downtime — it's when your brain consolidates memories and clears waste. 😴🧠\n\n#SleepHealth #BrainHealth #CPBH",
      "Poor sleep doesn't just make you tired — it impairs memory, focus, and long-term brain health.",
      "Sleep quality is one of the most underrated levers for cognitive performance."
    ),
  },
  {
    id: DEMO_POST_IDS[6],
    title: "Social Connection & Cognition",
    status: "published",
    template: "social-brain",
    createdDaysAgo: 18,
    color: "teal",
    slideCount: 3,
    captions: caps(
      "Your social life is brain medicine. 💬🧠\n\n#SocialHealth #CPBH",
      "Loneliness and social isolation are increasingly recognized as risk factors for cognitive decline.",
      "Social engagement stimulates multiple brain networks simultaneously."
    ),
  },
  {
    id: DEMO_POST_IDS[7],
    title: "Walking Meetings",
    status: "published",
    template: "walking-meetings",
    createdDaysAgo: 10,
    color: "lavender",
    slideCount: 2,
    captions: caps(
      "Next 1:1? Take it outside. 🚶‍♀️💡\n\n#WorkWell #BrainHealth",
      "Research shows light physical activity during work conversations can improve idea generation.",
      "Integrating movement into the workday is a low-cost intervention for cognitive performance."
    ),
  },
  {
    id: DEMO_POST_IDS[8],
    title: "Hydration & Focus",
    status: "published",
    template: "hydration",
    createdDaysAgo: 21,
    color: "teal",
    slideCount: 2,
    captions: caps(
      "Dehydrated brain = sluggish brain. 💧\n\n#Hydration #CPBH",
      "Even mild dehydration can impair attention and short-term memory."
    ),
  },
  {
    id: DEMO_POST_IDS[9],
    title: "Brain Health Tip — Story",
    status: "approved",
    template: "brain-tip",
    createdDaysAgo: 1,
    color: "gold",
    slideCount: 1,
    story: true,
    captions: [
      { platform: "instagram", caption: "Hydrate before you caffeinate. Your brain is 75% water — treat it that way. 💧🧠 #CPBH" },
      { platform: "facebook", caption: "Quick tip: drink a glass of water before your morning coffee. Better focus starts with hydration." },
    ],
  },
  {
    id: DEMO_POST_IDS[10],
    title: "Mediterranean Diet Basics",
    status: "ready",
    template: "med-diet",
    createdDaysAgo: 6,
    color: "cardinal",
    slideCount: 3,
    captions: caps(
      "The Mediterranean diet isn't a fad — it's one of the most studied patterns for brain longevity. 🫒🐟",
      "Looking for a sustainable eating pattern that supports brain health?",
      "Evidence continues to support the Mediterranean dietary pattern for cognitive aging."
    ),
  },
  {
    id: DEMO_POST_IDS[11],
    title: "APOE4 Explained",
    status: "in_review",
    template: "apoe4-explained",
    createdDaysAgo: 2,
    color: "teal",
    slideCount: 4,
    captions: caps(
      "APOE4 isn't a destiny — it's information. 🧬🧠\n\n#APOE4 #Genetics #CPBH",
      "Carrying one or two APOE4 copies increases Alzheimer's risk — but lifestyle interventions still make a measurable difference.",
      "APOE4 is the most common genetic risk factor for late-onset Alzheimer's."
    ),
  },
  {
    id: DEMO_POST_IDS[12],
    title: "Cognitive Reserve",
    status: "partially_published",
    template: "cognitive-reserve",
    createdDaysAgo: 7,
    color: "lavender",
    slideCount: 2,
    captions: caps(
      "Think of cognitive reserve as your brain's savings account. 📚🧠\n\n#CognitiveReserve #CPBH",
      "Education, social engagement, and novel experiences help build cognitive reserve.",
      "The cognitive reserve hypothesis explains why some individuals maintain function despite brain pathology."
    ),
  },
  {
    id: DEMO_POST_IDS[13],
    title: "Weekly Brain Brief — Aug 25",
    status: "draft",
    template: "weekly-brief",
    createdDaysAgo: 0,
    color: "teal",
    slideCount: 2,
    captions: caps("This week's brain brief is in the works… 📝", "Draft — weekly roundup of CPBH research highlights."),
  },
  {
    id: DEMO_POST_IDS[14],
    title: "Blood Pressure & Brain",
    status: "ready",
    template: "blood-pressure",
    createdDaysAgo: 4,
    color: "cardinal",
    slideCount: 2,
    captions: caps(
      "High blood pressure doesn't just hurt your heart — it damages small vessels in the brain. ❤️🧠",
      "Midlife hypertension is a modifiable risk factor for dementia.",
      "Vascular health and brain health are deeply intertwined."
    ),
  },
];

function specToPost(spec: PostSpec): Post {
  const created = isoDaysAgo(spec.createdDaysAgo);
  const hasMedia = spec.status !== "draft";
  return {
    id: spec.id,
    title: spec.title,
    status: spec.status,
    post_creator_id: spec.template,
    source_config: { demo: true, type: spec.story ? "story" : "carousel" },
    created_at: created,
    updated_at: created,
    variants: hasMedia ? buildVariants(spec.id, spec.captions) : [],
    media_assets: hasMedia ? mediaAssets(spec.id, spec.color, spec.slideCount, spec.story) : [],
  };
}

interface ScheduleSpec {
  id: string;
  postId: string;
  postTitle: string;
  days: number;
  hour: number;
  platforms: string[];
  completed?: boolean;
}

const SCHEDULE_SPECS: ScheduleSpec[] = [
  { id: "sched-001", postId: DEMO_POST_IDS[0], postTitle: "Exercise & APOE4", days: 1, hour: 10, platforms: ["instagram", "facebook", "linkedin"] },
  { id: "sched-002", postId: DEMO_POST_IDS[1], postTitle: "Protein Maxing for Brain Health", days: 3, hour: 14, platforms: ["instagram", "facebook"] },
  { id: "sched-003", postId: DEMO_POST_IDS[2], postTitle: "Mindfulness Minute — Story", days: 2, hour: 11, platforms: ["instagram"] },
  { id: "sched-004", postId: DEMO_POST_IDS[3], postTitle: "Stress & Cortisol", days: 5, hour: 9, platforms: ["instagram", "facebook", "linkedin"] },
  { id: "sched-005", postId: DEMO_POST_IDS[4], postTitle: "Omega-3 & Brain Health", days: 7, hour: 16, platforms: ["linkedin", "facebook"] },
  { id: "sched-006", postId: DEMO_POST_IDS[5], postTitle: "Sleep & Cognition", days: -5, hour: 9, platforms: ["instagram", "facebook", "linkedin"], completed: true },
  { id: "sched-007", postId: DEMO_POST_IDS[6], postTitle: "Social Connection & Cognition", days: -12, hour: 11, platforms: ["instagram", "facebook"], completed: true },
  { id: "sched-008", postId: DEMO_POST_IDS[7], postTitle: "Walking Meetings", days: -8, hour: 15, platforms: ["linkedin"], completed: true },
  { id: "sched-009", postId: DEMO_POST_IDS[8], postTitle: "Hydration & Focus", days: -18, hour: 8, platforms: ["instagram"], completed: true },
  { id: "sched-00a", postId: DEMO_POST_IDS[12], postTitle: "Cognitive Reserve", days: -3, hour: 10, platforms: ["instagram", "facebook", "linkedin"], completed: true },
];

export interface DemoStore {
  posts: Post[];
  schedule: ScheduleItem[];
  publishAttempts: Record<string, PublishAttempt[]>;
}

export function createDemoStore(): DemoStore {
  const posts = SPECS.map(specToPost);
  const schedule: ScheduleItem[] = SCHEDULE_SPECS.map((s) => ({
    id: s.id,
    post_id: s.postId,
    post_title: s.postTitle,
    scheduled_at: isoDaysFromNow(s.days, s.hour),
    timezone: "America/Los_Angeles",
    status: s.completed ? "completed" : "pending",
    platform_targets: s.platforms,
  }));

  const publishAttempts: Record<string, PublishAttempt[]> = {
    [DEMO_POST_IDS[12]]: [
      { id: "pa-1", platform: "instagram", status: "success", platform_post_id: "demo_ig", error_message: null, attempted_at: isoDaysFromNow(-3, 10) },
      { id: "pa-2", platform: "facebook", status: "failed", platform_post_id: null, error_message: "Demo: simulated publish failure", attempted_at: isoDaysFromNow(-3, 10) },
      { id: "pa-3", platform: "linkedin", status: "success", platform_post_id: "demo_li", error_message: null, attempted_at: isoDaysFromNow(-3, 10) },
    ],
  };

  return { posts, schedule, publishAttempts };
}

export function buildDashboard(posts: Post[]): DashboardResponse {
  const stats = {
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => ["published", "partially_published"].includes(p.status)).length,
    in_review: posts.filter((p) => p.status === "in_review").length,
    drafts: posts.filter((p) => p.status === "draft").length,
    total: posts.length,
  };

  const recent_posts = [...posts]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)
    .map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      created_at: p.created_at,
      platform_count: p.variants.length,
    }));

  return { stats, recent_posts };
}

export const DEMO_TEMPLATES: Template[] = [
  { post_creator_id: "exercise-apoe4", title: "Exercise & APOE4", slide_count: 4, platforms: ["instagram", "facebook", "linkedin"] },
  { post_creator_id: "protein-maxing", title: "Protein Maxing", slide_count: 3, platforms: ["instagram", "facebook", "linkedin"] },
  { post_creator_id: "mindfulness", title: "Mindfulness Minute", slide_count: 1, platforms: ["instagram"] },
  { post_creator_id: "apoe4-explained", title: "APOE4 Explained", slide_count: 4, platforms: ["instagram", "facebook", "linkedin"] },
  { post_creator_id: "med-diet", title: "Mediterranean Diet", slide_count: 3, platforms: ["instagram", "facebook", "linkedin"] },
];

export const DEMO_USER = {
  id: "demo-user-001",
  email: "dev@pulse.local",
  name: "CPBH Demo",
  role: "admin" as const,
  created_at: isoDaysAgo(30),
};
