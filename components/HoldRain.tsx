"use client";

import { Hold } from "./Hold";
import type { Hold as HoldKind } from "@/lib/types";

const PIECES: { kind: HoldKind; fill: string; shade: string; left: number; size: number; delay: number; dur: number; spin: number }[] = [
  { kind: "jug", fill: "#FFDD55", shade: "#E8BE2A", left: 6, size: 30, delay: 0, dur: 1.5, spin: 160 },
  { kind: "pinch", fill: "#5FDDB0", shade: "#3FC998", left: 18, size: 26, delay: 0.18, dur: 1.7, spin: -140 },
  { kind: "volume", fill: "#FF9CC2", shade: "#F582AD", left: 31, size: 32, delay: 0.06, dur: 1.6, spin: 120 },
  { kind: "pocket", fill: "#B79BFF", shade: "#A080F5", left: 44, size: 26, delay: 0.3, dur: 1.5, spin: -200 },
  { kind: "sloper", fill: "#FFA45C", shade: "#F58F40", left: 57, size: 30, delay: 0.1, dur: 1.8, spin: 90 },
  { kind: "jug", fill: "#7EB3FF", shade: "#5E9EF5", left: 70, size: 28, delay: 0.24, dur: 1.6, spin: -110 },
  { kind: "pinch", fill: "#FF8A7A", shade: "#F06C5B", left: 82, size: 26, delay: 0.04, dur: 1.7, spin: 180 },
  { kind: "volume", fill: "#FFDD55", shade: "#E8BE2A", left: 92, size: 24, delay: 0.36, dur: 1.5, spin: -150 },
  { kind: "pocket", fill: "#5FDDB0", shade: "#3FC998", left: 12, size: 22, delay: 0.5, dur: 1.4, spin: 130 },
  { kind: "sloper", fill: "#7EB3FF", shade: "#5E9EF5", left: 64, size: 22, delay: 0.46, dur: 1.4, spin: -90 },
];

/** A short shower of colourful holds for a send. Remount (change its key) to play again. */
export function HoldRain() {
  return (
    <div aria-hidden className="hold-rain pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="hold-rain-piece"
          style={
            {
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              "--spin": `${p.spin}deg`,
            } as React.CSSProperties
          }
        >
          <Hold kind={p.kind} fill={p.fill} shade={p.shade} size={p.size} viewBox={p.kind === "crimp" ? "0 11 40 17" : undefined} />
        </span>
      ))}
    </div>
  );
}
