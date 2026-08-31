"""Seed demo posts + schedule for manager walkthrough.

Usage (from repo root):
  ./start.sh demo
"""

from __future__ import annotations

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from PIL import Image, ImageDraw, ImageFont
from sqlalchemy import delete, select

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.deps import DEV_EMAIL, _get_or_create_dev_user
from app.core.database import async_session
from app.models import (
    ApprovalStatus,
    MediaAsset,
    Platform,
    Post,
    PostStatus,
    PostVariant,
    PublishAttempt,
    PublishStatus,
    ScheduleEntry,
    ScheduleStatus,
    User,
)
from app.services.storage import post_media_dir

CARDINAL = (153, 0, 0)
TEAL = (32, 83, 105)
GOLD = (212, 176, 140)
LAVENDER = (120, 100, 160)
WHITE = (255, 255, 255)
GRAY = (240, 240, 240)
SUBTLE = (220, 230, 235)

# Helper for captions
def _caps(ig: str, fb: str, li: str | None = None) -> dict:
    caps = {Platform.INSTAGRAM: ig, Platform.FACEBOOK: fb}
    if li:
        caps[Platform.LINKEDIN] = li
    return caps


DEMO_POSTS = [
    {
        "title": "Exercise & APOE4",
        "status": PostStatus.SCHEDULED,
        "template": "exercise-apoe4",
        "created_days_ago": 2,
        "color": CARDINAL,
        "slides": [
            ("Exercise & APOE4", "Why movement matters for brain health"),
            ("The science", "Regular activity may offset genetic risk factors"),
            ("Start small", "Even 20 minutes a day makes a difference"),
        ],
        "captions": _caps(
            "Moving your body isn't just good for your heart — it's brain fuel. 🧠💪\n\n"
            "Research shows regular exercise may help offset APOE4-related risk. "
            "Small steps, big impact.\n\n#BrainHealth #APOE4 #USCCPBH #ExerciseScience",
            "Exercise and brain health go hand in hand — especially for those carrying the APOE4 gene.\n\n"
            "At USC's Center for Personalized Brain Health, we translate cutting-edge research "
            "into practical tips you can use today.",
            "New research continues to highlight the link between physical activity and cognitive resilience, "
            "particularly for individuals with APOE4.\n\n"
            "At the USC Center for Personalized Brain Health, we're committed to making "
            "personalized brain health accessible.",
        ),
        "schedule": {"days": 1, "hour": 10, "platforms": ["instagram", "facebook", "linkedin"]},
    },
    {
        "title": "Protein Maxing for Brain Health",
        "status": PostStatus.SCHEDULED,
        "template": "protein-maxing",
        "created_days_ago": 3,
        "color": TEAL,
        "slides": [
            ("Protein Maxing", "Fuel your brain the smart way"),
            ("Quality over quantity", "Lean sources + timing = better cognition"),
            ("Daily target", "Spread 25–30g across meals"),
        ],
        "captions": _caps(
            "Your brain runs on protein — but not all sources are equal. 🥚🐟\n\n"
            "Prioritize lean proteins, spread intake across the day, and pair with fiber.\n\n"
            "#Nutrition #BrainFood #CPBH",
            "Protein isn't just for gym gains — it's essential for neurotransmitter production and brain repair.\n\n"
            "Our CPBH team breaks down how to 'protein max' without overcomplicating your meals.",
            "Dietary protein plays a critical role in cognitive function and brain maintenance.\n\n"
            "Our latest post explores practical, evidence-based strategies for optimizing protein intake.",
        ),
        "schedule": {"days": 3, "hour": 14, "platforms": ["instagram", "facebook"]},
    },
    {
        "title": "Mindfulness Minute — Story",
        "status": PostStatus.SCHEDULED,
        "template": "mindfulness",
        "story": True,
        "created_days_ago": 1,
        "color": LAVENDER,
        "slides": [("Mindfulness Minute", "3 breaths before your next meeting 🧘")],
        "captions": {
            Platform.INSTAGRAM: "Pause. Breathe. Reset. Three mindful breaths can sharpen focus in under a minute. 🧘‍♀️ #Mindfulness #CPBH",
            Platform.FACEBOOK: "Try this today: before your next meeting, take three slow breaths. Small reset, big clarity.",
        },
        "schedule": {"days": 2, "hour": 11, "platforms": ["instagram"]},
    },
    {
        "title": "Stress & Cortisol",
        "status": PostStatus.SCHEDULED,
        "template": "stress-cortisol",
        "created_days_ago": 4,
        "color": TEAL,
        "slides": [
            ("Stress & Cortisol", "What chronic stress does to your brain"),
            ("The cycle", "Stress → cortisol → inflammation → fog"),
            ("Break the loop", "Walk · journal · talk to someone"),
        ],
        "captions": _caps(
            "Chronic stress isn't just in your head — it reshapes your brain. 🧠⚡\n\n"
            "Learn how cortisol affects memory and what you can do today.\n\n#StressManagement #BrainHealth",
            "When stress becomes chronic, cortisol can impair memory and accelerate brain aging.\n\n"
            "Our CPBH team shares three evidence-backed ways to break the cycle.",
            "Understanding the stress–cortisol–cognition link is essential for long-term brain health.\n\n"
            "Our latest carousel translates the science into practical daily habits.",
        ),
        "schedule": {"days": 5, "hour": 9, "platforms": ["instagram", "facebook", "linkedin"]},
    },
    {
        "title": "Omega-3 & Brain Health",
        "status": PostStatus.SCHEDULED,
        "template": "omega-3",
        "created_days_ago": 5,
        "color": GOLD,
        "slides": [
            ("Omega-3 & Your Brain", "Fatty acids that fuel neurons"),
            ("Best sources", "Salmon · sardines · walnuts · flax"),
        ],
        "captions": _caps(
            "Your brain loves omega-3s — especially DHA. 🐟🧠\n\n"
            "Aim for fatty fish 2× per week or talk to your clinician about supplementation.\n\n"
            "#Omega3 #BrainFood #CPBH",
            "Omega-3 fatty acids support cell membrane health and may reduce inflammation in the brain.\n\n"
            "Simple swaps: add walnuts to breakfast, salmon at dinner.",
            "Emerging research continues to link omega-3 intake with cognitive resilience.\n\n"
            "Our CPBH guide breaks down food-first strategies.",
        ),
        "schedule": {"days": 7, "hour": 16, "platforms": ["linkedin", "facebook"]},
    },
    {
        "title": "Sleep & Cognition",
        "status": PostStatus.PUBLISHED,
        "template": "sleep-cognition",
        "created_days_ago": 14,
        "color": CARDINAL,
        "slides": [
            ("Sleep & Cognition", "Rest is a brain health superpower"),
            ("7–9 hours", "Consistency beats perfection"),
            ("Tip", "Same bedtime, dim lights, no screens 30 min before"),
        ],
        "captions": _caps(
            "Sleep isn't downtime — it's when your brain consolidates memories and clears waste. 😴🧠\n\n"
            "#SleepHealth #BrainHealth #CPBH",
            "Poor sleep doesn't just make you tired — it impairs memory, focus, and long-term brain health.",
            "Sleep quality is one of the most underrated levers for cognitive performance.",
        ),
        "schedule": {"days": -5, "hour": 9, "platforms": ["instagram", "facebook", "linkedin"], "completed": True},
    },
    {
        "title": "Social Connection & Cognition",
        "status": PostStatus.PUBLISHED,
        "template": "social-brain",
        "created_days_ago": 18,
        "color": TEAL,
        "slides": [
            ("Stay Connected", "Social ties protect cognitive health"),
            ("Why it matters", "Loneliness is linked to faster decline"),
            ("One action", "Call one friend this week"),
        ],
        "captions": _caps(
            "Your social life is brain medicine. 💬🧠\n\n"
            "Strong connections are linked to lower dementia risk.\n\n#SocialHealth #CPBH",
            "Loneliness and social isolation are increasingly recognized as risk factors for cognitive decline.\n\n"
            "One small step: reach out to someone today.",
            "Social engagement stimulates multiple brain networks simultaneously — a powerful form of cognitive exercise.",
        ),
        "schedule": {"days": -12, "hour": 11, "platforms": ["instagram", "facebook"], "completed": True},
    },
    {
        "title": "Walking Meetings",
        "status": PostStatus.PUBLISHED,
        "template": "walking-meetings",
        "created_days_ago": 10,
        "color": LAVENDER,
        "slides": [
            ("Walking Meetings", "Move your body, sharpen your mind"),
            ("The data", "Light movement boosts creative thinking"),
        ],
        "captions": _caps(
            "Next 1:1? Take it outside. 🚶‍♀️💡\n\n"
            "Walking meetings boost creativity and reduce afternoon brain fog.\n\n#WorkWell #BrainHealth",
            "Research shows light physical activity during work conversations can improve idea generation.\n\n"
            "Try a 15-minute walking meeting this week.",
            "Integrating movement into the workday is a low-cost intervention for cognitive performance.",
        ),
        "schedule": {"days": -8, "hour": 15, "platforms": ["linkedin"], "completed": True},
    },
    {
        "title": "Hydration & Focus",
        "status": PostStatus.PUBLISHED,
        "template": "hydration",
        "created_days_ago": 21,
        "color": TEAL,
        "slides": [
            ("Hydration & Focus", "Your brain is 75% water"),
            ("Signs of dehydration", "Headache · fatigue · poor focus"),
        ],
        "captions": _caps(
            "Dehydrated brain = sluggish brain. 💧\n\n"
            "Keep a water bottle at your desk and sip all day.\n\n#Hydration #CPBH",
            "Even mild dehydration can impair attention and short-term memory.\n\n"
            "Simple fix: drink a glass of water before your morning coffee.",
        ),
        "schedule": {"days": -18, "hour": 8, "platforms": ["instagram"], "completed": True},
    },
    {
        "title": "Brain Health Tip — Story",
        "status": PostStatus.APPROVED,
        "template": "brain-tip",
        "story": True,
        "created_days_ago": 1,
        "color": GOLD,
        "slides": [("Daily Brain Tip", "Hydrate before you caffeinate ☕💧")],
        "captions": {
            Platform.INSTAGRAM: "Hydrate before you caffeinate. Your brain is 75% water — treat it that way. 💧🧠 #CPBH",
            Platform.FACEBOOK: "Quick tip: drink a glass of water before your morning coffee. Better focus starts with hydration.",
        },
    },
    {
        "title": "Mediterranean Diet Basics",
        "status": PostStatus.READY,
        "template": "med-diet",
        "created_days_ago": 6,
        "color": CARDINAL,
        "slides": [
            ("Mediterranean Diet", "A blueprint for brain longevity"),
            ("Key foods", "Olive oil · fish · leafy greens · nuts"),
            ("Start here", "Swap butter for olive oil this week"),
        ],
        "captions": _caps(
            "The Mediterranean diet isn't a fad — it's one of the most studied patterns for brain longevity. 🫒🐟\n\n"
            "#MediterraneanDiet #BrainHealth",
            "Looking for a sustainable eating pattern that supports brain health?\n\n"
            "The Mediterranean diet consistently ranks among the best.",
            "Evidence continues to support the Mediterranean dietary pattern for cognitive aging.",
        ),
    },
    {
        "title": "APOE4 Explained",
        "status": PostStatus.IN_REVIEW,
        "template": "apoe4-explained",
        "created_days_ago": 2,
        "color": TEAL,
        "slides": [
            ("APOE4 Explained", "Your blueprint for brain health"),
            ("What is APOE4?", "A gene variant linked to Alzheimer's risk"),
            ("What you can do", "Lifestyle still matters — a lot"),
            ("Take action", "Talk to your clinician · get informed"),
        ],
        "captions": _caps(
            "APOE4 isn't a destiny — it's information. 🧬🧠\n\n"
            "Understanding your genetics empowers better brain health choices.\n\n#APOE4 #Genetics #CPBH",
            "Carrying one or two APOE4 copies increases Alzheimer's risk — but lifestyle interventions still make a measurable difference.\n\n"
            "Knowledge is the first step.",
            "APOE4 is the most common genetic risk factor for late-onset Alzheimer's.\n\n"
            "Our CPBH team breaks down what it means and what you can do about it.",
        ),
    },
    {
        "title": "Cognitive Reserve",
        "status": PostStatus.PARTIALLY_PUBLISHED,
        "template": "cognitive-reserve",
        "created_days_ago": 7,
        "color": LAVENDER,
        "slides": [
            ("Cognitive Reserve", "Build your brain's backup system"),
            ("How?", "Learn · socialize · stay curious"),
        ],
        "captions": _caps(
            "Think of cognitive reserve as your brain's savings account. 📚🧠\n\n"
            "Lifelong learning pays dividends.\n\n#CognitiveReserve #CPBH",
            "Education, social engagement, and novel experiences help build cognitive reserve — "
            "a buffer against age-related decline.",
            "The cognitive reserve hypothesis explains why some individuals maintain function despite brain pathology.",
        ),
        "schedule": {"days": -3, "hour": 10, "platforms": ["instagram", "facebook", "linkedin"], "completed": True, "partial_fail": True},
    },
    {
        "title": "Weekly Brain Brief — Aug 25",
        "status": PostStatus.DRAFT,
        "template": "weekly-brief",
        "created_days_ago": 0,
        "color": TEAL,
        "slides": [
            ("Weekly Brain Brief", "Top CPBH insights this week"),
            ("Coming soon", "Research roundup + tips"),
        ],
        "captions": _caps(
            "This week's brain brief is in the works… 📝",
            "Draft — weekly roundup of CPBH research highlights.",
        ),
    },
    {
        "title": "Blood Pressure & Brain",
        "status": PostStatus.READY,
        "template": "blood-pressure",
        "created_days_ago": 4,
        "color": CARDINAL,
        "slides": [
            ("Blood Pressure & Brain", "Hypertension silently affects cognition"),
            ("Target", "Know your numbers · manage with your doctor"),
        ],
        "captions": _caps(
            "High blood pressure doesn't just hurt your heart — it damages small vessels in the brain. ❤️🧠\n\n"
            "#HeartBrain #CPBH",
            "Midlife hypertension is a modifiable risk factor for dementia.\n\n"
            "Get checked. Know your numbers.",
            "Vascular health and brain health are deeply intertwined. Our latest post explains the connection.",
        ),
    },
]


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        if Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def _draw_slide(title: str, subtitle: str, *, story: bool = False, bg: tuple = CARDINAL) -> Image.Image:
    size = (1080, 1920) if story else (1080, 1080)
    img = Image.new("RGB", size, bg)
    draw = ImageDraw.Draw(img)

    draw.rectangle([40, 40, size[0] - 40, size[1] - 40], outline=WHITE, width=3)
    draw.text((80, 80), "USC CPBH", fill=WHITE, font=_font(28))

    title_font = _font(56 if not story else 64)
    sub_font = _font(36 if not story else 40)

    y = size[1] // 2 - 80
    draw.text((80, y), title, fill=WHITE, font=title_font)
    draw.text((80, y + 90), subtitle, fill=SUBTLE if bg != CARDINAL else GRAY, font=sub_font)

    return img


async def _demo_posts(db, user_id) -> list[Post]:
    result = await db.execute(select(Post).where(Post.user_id == user_id))
    return [p for p in result.scalars() if (p.source_config or {}).get("demo")]


async def seed(force: bool = False) -> None:
    async with async_session() as db:
        user = await _get_or_create_dev_user(db)

        existing = await _demo_posts(db, user.id)
        if existing and not force:
            print("Demo data already exists. Run with --force to replace.")
            return

        if force and existing:
            demo_ids = [p.id for p in existing]
            await db.execute(delete(PublishAttempt).where(PublishAttempt.schedule_entry_id.in_(
                select(ScheduleEntry.id).where(ScheduleEntry.post_id.in_(demo_ids))
            )))
            await db.execute(delete(ScheduleEntry).where(ScheduleEntry.post_id.in_(demo_ids)))
            await db.execute(delete(MediaAsset).where(MediaAsset.post_id.in_(demo_ids)))
            await db.execute(delete(PostVariant).where(PostVariant.post_id.in_(demo_ids)))
            await db.execute(delete(Post).where(Post.id.in_(demo_ids)))
            await db.flush()

        now = datetime.now(timezone.utc)
        created = 0

        for spec in DEMO_POSTS:
            created_at = now - timedelta(days=spec.get("created_days_ago", 0))
            post = Post(
                id=uuid4(),
                user_id=user.id,
                title=spec["title"],
                status=spec["status"],
                post_creator_id=spec.get("template"),
                source_config={"demo": True, "type": "story" if spec.get("story") else "carousel"},
                created_at=created_at,
                updated_at=created_at,
            )
            db.add(post)
            await db.flush()

            dest = post_media_dir(post.id)
            is_story = spec.get("story", False)
            slide_bg = spec.get("color", CARDINAL)
            for i, (title, subtitle) in enumerate(spec["slides"]):
                filename = "story_01.png" if is_story else f"slide_{i + 1:02d}.png"
                img = _draw_slide(title, subtitle, story=is_story, bg=slide_bg)
                img.save(dest / filename)
                db.add(
                    MediaAsset(
                        post_id=post.id,
                        s3_key=filename,
                        mime_type="image/png",
                        sort_order=i,
                        alt_text=title,
                    )
                )

            for platform, caption in spec["captions"].items():
                db.add(
                    PostVariant(
                        post_id=post.id,
                        platform=platform,
                        caption=caption,
                        approval_status=ApprovalStatus.APPROVED,
                    )
                )

            sched = spec.get("schedule")
            if sched:
                scheduled_at = (now + timedelta(days=sched["days"])).replace(
                    hour=sched["hour"], minute=0, second=0, microsecond=0
                )
                status = ScheduleStatus.COMPLETED if sched.get("completed") else ScheduleStatus.PENDING
                entry = ScheduleEntry(
                    post_id=post.id,
                    scheduled_at=scheduled_at,
                    timezone="America/Los_Angeles",
                    status=status,
                    platform_targets=sched["platforms"],
                )
                db.add(entry)
                await db.flush()

                if sched.get("completed"):
                    partial_fail = sched.get("partial_fail", False)
                    for i, p in enumerate(sched["platforms"]):
                        failed = partial_fail and p == "facebook"
                        db.add(
                            PublishAttempt(
                                schedule_entry_id=entry.id,
                                platform=Platform(p),
                                status=PublishStatus.FAILED if failed else PublishStatus.SUCCESS,
                                platform_post_id=None if failed else f"demo_{p}_{entry.id.hex[:8]}",
                                error_message="Demo: simulated publish failure" if failed else None,
                                attempted_at=scheduled_at + timedelta(minutes=1),
                            )
                        )

            created += 1

        await db.commit()
        upcoming = sum(1 for s in DEMO_POSTS if s.get("schedule") and not s["schedule"].get("completed"))
        published = sum(1 for s in DEMO_POSTS if s["status"] in (PostStatus.PUBLISHED, PostStatus.PARTIALLY_PUBLISHED))
        print(f"✓ Seeded {created} demo posts for {user.email}")
        print(f"  → {upcoming} upcoming · {published} published · stats & grid should look full")


def main() -> None:
    force = "--force" in sys.argv
    asyncio.run(seed(force=force))


if __name__ == "__main__":
    main()
