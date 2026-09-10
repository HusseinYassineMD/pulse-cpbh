"use client";

import { Sparkles, Instagram, Facebook, Linkedin } from "lucide-react";

const SLIDES = [
  {
    title: "Exercise & APOE4",
    sub: "Why movement matters",
    bg: "radial-gradient(ellipse 80% 70% at 90% 10%, hsl(22 62% 76%), hsl(248 44% 78%) 55%, hsl(198 46% 74%))",
  },
  {
    title: "Protein Maxing",
    sub: "Fuel your brain",
    bg: "radial-gradient(ellipse 75% 65% at 50% 40%, hsl(248 44% 78%), hsl(230 45% 80%) 50%, hsl(33 44% 72%))",
  },
  {
    title: "Sleep & Cognition",
    sub: "Rest is brain fuel",
    bg: "radial-gradient(ellipse 70% 60% at 10% 90%, hsl(198 46% 74%), hsl(258 36% 72%) 50%, hsl(248 44% 78%))",
  },
];

export function HeroMockup() {
  return (
    <div className="relative hidden lg:block animate-float" aria-hidden="true">
      <div
        className="absolute -inset-4 rounded-3xl blur-2xl opacity-60"
        style={{
          background:
            "radial-gradient(ellipse, hsl(250 38% 88% / 0.4), hsl(25 72% 88% / 0.25), transparent)",
        }}
      />

      <div className="relative w-[280px] mx-auto">
        <div className="rounded-[2.5rem] border-[5px] border-white/80 bg-white/60 backdrop-blur shadow-xl shadow-teal/5 overflow-hidden">
          <div className="h-6 bg-white/50 flex items-center justify-center">
            <div className="w-20 h-1 rounded-full bg-border" />
          </div>

          <div className="aspect-[9/16] relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 z-10 flex items-center gap-2 px-3 py-2 bg-white/80 backdrop-blur border-b border-border/60">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(var(--foreground)), hsl(196 45% 38%))" }}
              >
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[10px] font-semibold text-foreground">@uscpersonalizedbrain</span>
            </div>

            <div className="absolute inset-0 pt-10">
              {SLIDES.map((slide, i) => (
                <div
                  key={slide.title}
                  className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center"
                  style={{
                    background: slide.bg,
                    animation: "slideShow 9s ease-in-out infinite",
                    animationDelay: `${i * 3}s`,
                  }}
                >
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">USC CPBH</p>
                  <div className="cpbh-accent-line mb-3" />
                  <p className="text-lg font-bold leading-tight text-foreground">{slide.title}</p>
                  <p className="text-xs text-muted-foreground mt-2">{slide.sub}</p>
                </div>
              ))}
            </div>

            <div className="absolute bottom-16 inset-x-0 flex justify-center gap-1.5 z-10">
              {SLIDES.map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/25" />
              ))}
            </div>
          </div>
        </div>

        <div className="absolute -left-8 top-1/4 pulse-card px-3 py-2 flex items-center gap-2 shadow-md text-xs font-medium text-foreground">
          <Instagram className="w-4 h-4 text-teal" />
          Scheduled
        </div>
        <div className="absolute -right-6 top-1/2 pulse-card px-3 py-2 flex items-center gap-2 shadow-md text-xs font-medium text-foreground">
          <Facebook className="w-4 h-4 text-sky" />
          3 platforms
        </div>
        <div className="absolute -left-4 bottom-1/4 pulse-card px-3 py-2 flex items-center gap-2 shadow-md text-xs font-medium text-foreground">
          <Linkedin className="w-4 h-4 text-teal" />
          Auto-publish
        </div>
      </div>
    </div>
  );
}
