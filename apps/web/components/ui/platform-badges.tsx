import { Instagram, Facebook, Linkedin } from "lucide-react";

const config: Record<string, { class: string; icon: typeof Instagram; label: string }> = {
  instagram: {
    class: "bg-gradient-to-r from-teal to-cyan text-white shadow-sm shadow-teal/15",
    icon: Instagram,
    label: "IG",
  },
  facebook: {
    class: "bg-sky/90 text-white shadow-sm shadow-sky/15",
    icon: Facebook,
    label: "FB",
  },
  linkedin: {
    class: "bg-teal/90 text-white shadow-sm shadow-teal/15",
    icon: Linkedin,
    label: "LI",
  },
};

export function PlatformBadges({ platforms, size = "sm" }: { platforms: string[]; size?: "sm" | "md" }) {
  if (platforms.length === 0) return null;
  const sz = size === "md" ? "px-2.5 py-1 text-xs gap-1.5" : "px-2 py-0.5 text-[10px] gap-1";

  return (
    <div className="flex flex-wrap gap-1.5">
      {platforms.map((p) => {
        const c = config[p];
        if (!c) return null;
        const Icon = c.icon;
        return (
          <span
            key={p}
            className={`inline-flex items-center rounded-full font-bold uppercase tracking-wide ${c.class} ${sz}`}
          >
            <Icon className={size === "md" ? "w-3.5 h-3.5" : "w-3 h-3"} />
            {c.label}
          </span>
        );
      })}
    </div>
  );
}

export function PlatformLabel({ platform }: { platform: string }) {
  const c = config[platform];
  if (!c) return <span className="text-xs capitalize">{platform}</span>;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${c.class}`}>
      <Icon className="w-3.5 h-3.5" />
      {platform}
    </span>
  );
}
