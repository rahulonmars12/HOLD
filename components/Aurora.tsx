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
  base = "#F3F5FC",
  tone = "light",
  fast = false,
  rainbow = false,
  particles = false,
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
      style={{ background: base }}
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
                mixBlendMode: tone === "dark" ? "screen" : "normal",
                opacity: tone === "dark" ? 0.95 : 0.85,
                animation: `${b.anim} ease-in-out infinite alternate`,
                animationDuration: fast ? "1.6s" : undefined,
              }}
            />
          );
        })}
      </div>
      {/* Calmer in the middle so the coin or character stands out. */}
      <span
        className="absolute inset-0"
        style={{ background: `radial-gradient(46% 30% at 50% 33%, ${base}B3, ${base}00 100%)` }}
      />
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
    color: ["#FF9CC2", "#FFC93C", "#7EB3FF", "#3FC998", "#B79BFF", "#FFA45C"][i % 6],
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
            <span className="block rounded-full" style={{ width: p.size, height: p.size, background: p.color, opacity: 0.7 }} />
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

/** Light pastel backgrounds that contrast with each rarity's rim. */
export const RARITY_BG: Record<string, { base: string; colors: string[]; halo: string[] }> = {
  bronze: { base: "#F1F8FF", colors: ["#A8E8D8", "#B4D2FF", "#C9F3E3", "#C4C2FF"], halo: ["#5FDDB0", "#7EB3FF", "#B79BFF"] },
  silver: { base: "#FFF4F8", colors: ["#FFC2DB", "#DCCBFF", "#FFD4B5", "#FFB8D2"], halo: ["#FF9CC2", "#B79BFF", "#FFA45C"] },
  gold: { base: "#F5F2FF", colors: ["#D3C6FF", "#BCD6FF", "#FFC9E1", "#C9CEFF"], halo: ["#B79BFF", "#7EB3FF", "#FF9CC2"] },
  holo: { base: "#F8F6FF", colors: ["#FFC2DB", "#BCD6FF", "#BFF0DD", "#FFEA9C", "#DCCBFF"], halo: ["#FF9CC2", "#FFDD55", "#5FDDB0", "#7EB3FF", "#B79BFF"] },
};

/** Warm characters get cool pastels and the other way round. */
const WARM = new Set(["monkey", "squirrel", "cat", "octopus", "goat"]);
export function personaBg(id: string) {
  return WARM.has(id)
    ? { base: "#F1F6FF", colors: ["#B4D2FF", "#A8E8D8", "#C4C2FF", "#BCE3FF"], halo: ["#7EB3FF", "#5FDDB0", "#B79BFF"] }
    : { base: "#FFF5F7", colors: ["#FFC2DB", "#FFD4B5", "#DCCBFF", "#FFEA9C"], halo: ["#FF9CC2", "#FFA45C", "#B79BFF"] };
}

/** The pastels an evolution builds up through. */
export const EVOLVE_COLORS = ["#DCCBFF", "#BCD6FF", "#FFC2DB", "#FFFFFF"];
