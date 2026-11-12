import type { CSSProperties } from "react";

/**
 * Celebration backgrounds: a deep base with bright colour blobs sweeping
 * around it, rising sparkles and tiny holds, so there's always something
 * moving. Colours are picked to contrast with what's being celebrated.
 */

const BLOBS = [
  { left: "-35%", top: "-30%", anim: "aurora-a 7s" },
  { left: "30%", top: "-35%", anim: "aurora-b 9s" },
  { left: "-40%", top: "40%", anim: "aurora-c 8s" },
  { left: "35%", top: "45%", anim: "aurora-d 10s" },
  { left: "0%", top: "5%", anim: "aurora-b 11s" },
];

export function Aurora({
  colors,
  base = "#120F2C",
  tone = "dark",
  fast = false,
  rainbow = false,
  particles = tone === "dark",
  className = "",
}: {
  colors: string[];
  base?: string;
  tone?: "dark" | "light";
  /** Quicker sweep, for the build-up of an evolution. */
  fast?: boolean;
  /** Cycle the hues, for holographic pins. */
  rainbow?: boolean;
  particles?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={tone === "dark" ? { background: base } : undefined}
    >
      <div className={`absolute inset-0 ${rainbow ? "aurora-rainbow" : ""}`}>
        {BLOBS.map((b, i) => {
          const color = colors[i % colors.length];
          return (
            <span
              key={i}
              className="aurora-blob absolute rounded-full"
              style={{
                left: b.left,
                top: b.top,
                width: "90vmax",
                height: "90vmax",
                maxWidth: 820,
                maxHeight: 820,
                background: `radial-gradient(circle at 50% 50%, ${color} 0%, ${color}00 60%)`,
                mixBlendMode: tone === "dark" ? "screen" : "multiply",
                opacity: tone === "dark" ? 0.95 : 0.5,
                animation: `${b.anim} ease-in-out infinite alternate`,
                animationDuration: fast ? "1.6s" : undefined,
              }}
            />
          );
        })}
      </div>
      {tone === "dark" && (
        // Darker in the middle so the coin or character stands out.
        <span
          className="absolute inset-0"
          style={{ background: `radial-gradient(48% 34% at 50% 34%, ${base}CC, ${base}00 100%)` }}
        />
      )}
      {particles && <Particles />}
    </div>
  );
}

const SPARKS = Array.from({ length: 22 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 97.3 + n * 13.1) + 1) / 2);
  return {
    left: Math.round(r(1) * 100),
    size: 4 + Math.round(r(2) * 8),
    dur: 5 + r(3) * 6,
    delay: -r(4) * 10,
    sway: Math.round((r(5) - 0.5) * 60),
    star: i % 3 === 0,
    color: ["#FFFFFF", "#FFDD55", "#FF9CC2", "#7EB3FF", "#5FDDB0", "#B79BFF"][i % 6],
  };
});

/** Sparkles and dots that keep rising and twinkling. */
function Particles() {
  return (
    <>
      {SPARKS.map((p, i) => (
        <span
          key={i}
          className="particle absolute bottom-[-20px]"
          style={
            {
              left: `${p.left}%`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
              "--sway": `${p.sway}px`,
            } as CSSProperties
          }
        >
          {p.star ? (
            <svg width={p.size * 2} height={p.size * 2} viewBox="0 0 20 20" className="twinkle" style={{ animationDelay: `${p.delay}s` }}>
              <path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z" fill={p.color} />
            </svg>
          ) : (
            <span className="block rounded-full" style={{ width: p.size, height: p.size, background: p.color, opacity: 0.85 }} />
          )}
        </span>
      ))}
    </>
  );
}

/** A spinning ring of colour behind a coin or character. */
export function Halo({ colors, size = 340, className = "" }: { colors: string[]; size?: number; className?: string }) {
  const stops = [...colors, colors[0]].join(", ");
  return (
    <span
      aria-hidden
      className={`halo pointer-events-none absolute left-1/2 top-1/2 rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        background: `conic-gradient(from 0deg, ${stops})`,
        filter: "blur(30px)",
        opacity: 0.95,
      }}
    />
  );
}

/** A ring of light that bursts outward once, for a big moment. */
export function Burst({ color = "#FFFFFF", delay = 0 }: { color?: string; delay?: number }) {
  return (
    <span
      aria-hidden
      className="burst pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{ boxShadow: `0 0 0 6px ${color}, 0 0 40px 12px ${color}`, animationDelay: `${delay}ms` }}
    />
  );
}

/** Background colours that contrast with each rarity's rim. */
export const RARITY_BG: Record<string, { base: string; colors: string[]; halo: string[] }> = {
  bronze: { base: "#0E1A30", colors: ["#1FB5C9", "#3B82F6", "#22D3A6", "#6366F1"], halo: ["#22D3EE", "#3B82F6", "#34D399"] },
  silver: { base: "#1A0E30", colors: ["#FF4F9A", "#A855F7", "#F97316", "#EC4899"], halo: ["#FF4F9A", "#A855F7", "#FB923C"] },
  gold: { base: "#140F35", colors: ["#7C3AED", "#2563EB", "#DB2777", "#4F46E5"], halo: ["#8B5CF6", "#3B82F6", "#EC4899"] },
  holo: { base: "#0F0C26", colors: ["#FF4F9A", "#3B82F6", "#22D3A6", "#FACC15", "#A855F7"], halo: ["#FF4F9A", "#FACC15", "#22D3A6", "#3B82F6", "#A855F7"] },
};

/** Warm characters get cool backgrounds and the other way round. */
const WARM = new Set(["monkey", "squirrel", "cat", "octopus", "goat"]);
export function personaBg(id: string) {
  return WARM.has(id)
    ? { base: "#0E1A30", colors: ["#3B82F6", "#22D3A6", "#6366F1", "#1FB5C9"], halo: ["#3B82F6", "#22D3EE", "#8B5CF6"] }
    : { base: "#1A0E30", colors: ["#FF4F9A", "#F97316", "#A855F7", "#FACC15"], halo: ["#FF4F9A", "#FB923C", "#A855F7"] };
}
