/**
 * A juicy moving gradient: big soft blobs of colour drifting behind the
 * content, plus an optional spinning halo. Colours come from what's being
 * celebrated (a rarity, a persona). Still with Reduce Motion.
 */

const BLOBS = [
  { left: "-25%", top: "-20%", anim: "aurora-a 14s" },
  { left: "35%", top: "-25%", anim: "aurora-b 17s" },
  { left: "-30%", top: "45%", anim: "aurora-c 19s" },
  { left: "40%", top: "50%", anim: "aurora-d 15s" },
  { left: "5%", top: "15%", anim: "aurora-b 21s" },
];

export function Aurora({
  colors,
  tone = "dark",
  fast = false,
  className = "",
}: {
  colors: string[];
  tone?: "dark" | "light";
  /** Quicker drift, for the build-up of an evolution. */
  fast?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {BLOBS.map((b, i) => {
        const color = colors[i % colors.length];
        return (
          <span
            key={i}
            className="aurora-blob absolute rounded-full"
            style={{
              left: b.left,
              top: b.top,
              width: "95vmax",
              height: "95vmax",
              maxWidth: 900,
              maxHeight: 900,
              background: `radial-gradient(circle at 50% 50%, ${color} 0%, ${color}00 62%)`,
              mixBlendMode: tone === "dark" ? "screen" : "multiply",
              opacity: tone === "dark" ? 0.85 : 0.55,
              animation: `${b.anim} ease-in-out infinite alternate`,
              animationDuration: fast ? "3s" : undefined,
            }}
          />
        );
      })}
      <span
        className="absolute inset-0"
        style={{
          background:
            tone === "dark"
              ? "radial-gradient(120% 80% at 50% 110%, rgb(30 27 58 / 0.65), transparent 60%)"
              : "radial-gradient(120% 80% at 50% 110%, rgb(255 255 255 / 0.5), transparent 60%)",
        }}
      />
    </div>
  );
}

/** A soft, spinning ring of colour behind a coin or character. */
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
        filter: "blur(34px)",
        opacity: 0.9,
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

export const RARITY_COLORS: Record<string, string[]> = {
  bronze: ["#FF8A7A", "#FFA45C", "#FF9CC2", "#F58F40"],
  silver: ["#7EB3FF", "#B79BFF", "#5FDDB0", "#9FC4FF"],
  gold: ["#FFDD55", "#FFA45C", "#FF9CC2", "#FFC93C"],
  holo: ["#FF9CC2", "#7EB3FF", "#5FDDB0", "#FFDD55", "#B79BFF"],
};
