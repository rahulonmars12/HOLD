"use client";

import { useId, type CSSProperties } from "react";
import type { Rarity } from "@/lib/achievements";
import { byId } from "@/lib/achievements";
import type { Hold as HoldKind } from "@/lib/types";
import { SHAPES } from "./Hold";

/**
 * Achievement coins, each symbol built only from the app's hold shapes. The
 * pieces stay separate so the unlock can fly them in and snap them together.
 */

const COLORS = {
  yellow: ["#FFDD55", "#E8BE2A"],
  orange: ["#FFA45C", "#F58F40"],
  coral: ["#FF8A7A", "#F06C5B"],
  pink: ["#FF9CC2", "#F582AD"],
  lilac: ["#B79BFF", "#A080F5"],
  blue: ["#7EB3FF", "#5E9EF5"],
  mint: ["#5FDDB0", "#3FC998"],
  white: ["#FFFFFF", "#DDE3F2"],
  grey: ["#8C8AA6", "#76748F"],
  navy: ["#1E1B3A", "#1E1B3A"],
  night: ["#3A3478", "#3A3478"],
} as const;
type ColorKey = keyof typeof COLORS;

type Piece =
  | { k: HoldKind; c: ColorKey; x: number; y: number; s: number; r?: number; bolt?: boolean }
  | { line: [number, number, number, number]; c: ColorKey; w?: number; dash?: boolean };

const H = (k: HoldKind, c: ColorKey, x: number, y: number, s: number, r = 0, bolt = true): Piece => ({ k, c, x, y, s, r, bolt });
const L = (x1: number, y1: number, x2: number, y2: number, c: ColorKey = "navy", w = 4, dash = false): Piece => ({
  line: [x1, y1, x2, y2],
  c,
  w,
  dash,
});

const NIGHT = "#3A3478";

/** Face colour and pieces for each achievement. */
const DESIGNS: Record<string, { face: string; pieces: Piece[] }> = {
  "first-climb": { face: "#D6E6FF", pieces: [H("sloper", "lilac", 66, 140, 84), H("sloper", "pink", 112, 130, 112), L(114, 96, 114, 46), H("crimp", "coral", 132, 54, 40, 8, false)] },
  "first-send": { face: "#C9F3E3", pieces: [H("crimp", "mint", 76, 110, 62, 48), H("crimp", "mint", 118, 92, 104, -52)] },
  "first-flash": { face: NIGHT, pieces: [H("crimp", "yellow", 58, 132, 40, -38, false), H("crimp", "yellow", 52, 112, 52, -38, false), H("crimp", "yellow", 64, 90, 40, -38, false), H("jug", "yellow", 118, 82, 74, -20)] },
  "first-session": { face: "#E7DEFF", pieces: [H("pocket", "white", 100, 124, 84, 180, false), H("jug", "white", 84, 66, 30, -10, false), H("jug", "white", 110, 56, 38, 12, false), H("jug", "white", 128, 74, 26, 30, false)] },
  "top-grade": { face: "#FFDCEA", pieces: [H("pinch", "yellow", 64, 92, 46, -22), H("pinch", "yellow", 136, 92, 46, 22), H("pinch", "orange", 100, 80, 56), H("crimp", "yellow", 100, 122, 112)] },
  stubborn: { face: "#FFE1C7", pieces: [H("crimp", "blue", 100, 150, 104), H("sloper", "orange", 96, 124, 56), H("pocket", "mint", 104, 90, 42, 10), H("pinch", "pink", 98, 58, 32, -12), H("jug", "yellow", 100, 34, 22, 8, false)] },
  "project-slayer": { face: "#E7DEFF", pieces: [H("volume", "lilac", 96, 122, 116, -8), L(118, 82, 118, 36), H("crimp", "yellow", 136, 44, 40, 8, false)] },
  comeback: { face: "#FFDAD4", pieces: [H("crimp", "white", 82, 152, 92), H("jug", "coral", 66, 116, 30, -20), H("jug", "coral", 98, 82, 36, 0), H("jug", "coral", 138, 64, 44, 20)] },
  "thousand-falls": { face: "#D6E6FF", pieces: [H("crimp", "white", 100, 150, 150), H("jug", "yellow", 64, 70, 34, -30), H("pinch", "pink", 104, 54, 30, 40), H("pocket", "mint", 140, 82, 32, 15), H("volume", "orange", 92, 104, 34, -20), H("sloper", "lilac", 128, 118, 28, 10)] },
  "ten-sessions": {
    face: "#FFF3BF",
    pieces: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) =>
      H("jug", (["orange", "pink", "mint", "blue", "lilac"] as ColorKey[])[i % 5], 52 + (i % 5) * 24, i < 5 ? 84 : 118, 22, (i * 37) % 40 - 20, false),
    ),
  },
  streak: { face: "#FFE1C7", pieces: [H("pinch", "coral", 100, 100, 104), H("pinch", "yellow", 100, 116, 58, 0, false), H("jug", "orange", 64, 132, 26, -20), H("jug", "orange", 136, 132, 26, 20)] },
  century: {
    face: "#C9F3E3",
    pieces: Array.from({ length: 12 }, (_, i) => {
      const a = (-Math.PI / 2) + (i * Math.PI) / 6;
      const kinds: HoldKind[] = ["jug", "pinch", "pocket", "sloper", "volume", "jug"];
      const cols: ColorKey[] = ["yellow", "pink", "blue", "orange", "lilac", "coral"];
      return H(kinds[i % 6], cols[i % 6], 100 + 50 * Math.cos(a), 100 + 50 * Math.sin(a), 26, i * 30, false);
    }),
  },
  marathon: { face: "#FFDCEA", pieces: [H("crimp", "navy", 100, 46, 86, 0, false), H("volume", "yellow", 100, 76, 64, 225, false), H("volume", "orange", 100, 124, 64, 45, false), H("crimp", "navy", 100, 154, 86, 0, false)] },
  "night-owl": { face: NIGHT, pieces: [H("sloper", "yellow", 92, 104, 96, -100), H("jug", "night", 120, 88, 74, 0, false), H("jug", "white", 140, 132, 16, 0, false), H("jug", "white", 150, 64, 12, 0, false)] },
  "early-bird": { face: "#D6E6FF", pieces: [H("sloper", "yellow", 100, 120, 104), H("pinch", "orange", 46, 104, 24, -70, false), H("pinch", "orange", 62, 66, 24, -38, false), H("pinch", "orange", 100, 48, 24, 0, false), H("pinch", "orange", 138, 66, 24, 38, false), H("pinch", "orange", 154, 104, 24, 70, false), H("crimp", "blue", 100, 150, 140, 0, false)] },
  "slab-wizard": { face: "#C9F3E3", pieces: [H("volume", "navy", 100, 104, 104, 18, false), H("crimp", "lilac", 100, 148, 128, 0, false), H("pocket", "yellow", 64, 62, 20, 0, false), H("pocket", "yellow", 140, 56, 16, 0, false), H("pocket", "yellow", 146, 104, 14, 0, false)] },
  "roof-rat": { face: "#E4E3EE", pieces: [H("crimp", "blue", 100, 44, 160, 180), H("jug", "orange", 82, 84, 50, 180), H("pinch", "pink", 128, 92, 40, 180), H("pocket", "mint", 104, 128, 24, 0, false)] },
  "crimp-lord": { face: "#D6E6FF", pieces: [H("pinch", "yellow", 78, 82, 34, -20), H("pinch", "yellow", 122, 82, 34, 20), H("pinch", "yellow", 100, 74, 40), H("crimp", "yellow", 100, 98, 70, 0, false), H("crimp", "blue", 100, 128, 140)] },
  "sloper-whisperer": { face: "#FFE1C7", pieces: [H("sloper", "orange", 100, 128, 112), H("pinch", "pink", 92, 62, 34, -38, false), H("pinch", "pink", 108, 62, 34, 38, false)] },
  "all-rounder": {
    face: "#FFFFFF",
    pieces: ([["jug", "yellow"], ["crimp", "blue"], ["sloper", "orange"], ["pinch", "mint"], ["pocket", "lilac"], ["volume", "pink"]] as [HoldKind, ColorKey][]).map(([k, c], i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      return H(k, c, 100 + 44 * Math.cos(a), 100 + 44 * Math.sin(a), k === "crimp" ? 56 : 44, i * 20 - 30);
    }),
  },
  "called-it": { face: "#E7DEFF", pieces: [H("crimp", "lilac", 100, 146, 96, 0, false), H("jug", "blue", 100, 92, 104, 0, false), H("crimp", "navy", 88, 98, 30, 48, false), H("crimp", "navy", 108, 90, 46, -52, false)] },
  "mind-reader": { face: "#FFDCEA", pieces: [H("jug", "yellow", 100, 92, 92, 180, false), H("crimp", "grey", 100, 138, 50, 0, false), H("crimp", "grey", 100, 148, 40, 0, false), H("pinch", "orange", 46, 72, 22, -60, false), H("pinch", "orange", 100, 34, 22, 0, false), H("pinch", "orange", 154, 72, 22, 60, false)] },
  "beta-scribe": { face: "#FFF3BF", pieces: [L(58, 146, 92, 112, "navy", 3, true), L(92, 112, 120, 88, "navy", 3, true), L(120, 88, 146, 54, "navy", 3, true), H("jug", "orange", 58, 146, 34), H("pinch", "pink", 92, 112, 30, 30), H("pocket", "mint", 120, 88, 30), H("crimp", "blue", 146, 54, 44, -30)] },
  "same-wall": { face: "#C9F3E3", pieces: [H("jug", "yellow", 76, 120, 64, -8), H("jug", "pink", 124, 120, 64, 8), H("pinch", "coral", 94, 58, 28, -38, false), H("pinch", "coral", 106, 58, 28, 38, false)] },
  "send-train": { face: "#D6E6FF", pieces: [H("crimp", "navy", 100, 140, 150, 0, false), H("jug", "yellow", 56, 116, 44), H("jug", "pink", 100, 116, 44), H("jug", "mint", 144, 116, 44), H("crimp", "white", 56, 74, 30, 0, false), H("crimp", "white", 40, 60, 22, 0, false)] },
  "flash-mob": {
    face: "#FFDAD4",
    pieces: [
      H("crimp", "yellow", 34, 86, 30, -38, false), H("jug", "yellow", 66, 70, 40, -20),
      H("crimp", "yellow", 72, 132, 30, -38, false), H("jug", "pink", 104, 116, 40, -20),
      H("crimp", "yellow", 110, 64, 30, -38, false), H("jug", "orange", 142, 48, 40, -20),
    ],
  },
  collector: { face: NIGHT, pieces: [H("jug", "yellow", 100, 88, 100, 180, false), H("pinch", "yellow", 52, 82, 40, -30, false), H("pinch", "yellow", 148, 82, 40, 30, false), H("crimp", "yellow", 100, 136, 40, 90, false), H("crimp", "orange", 100, 154, 84, 0, false), H("pocket", "white", 58, 46, 12, 0, false), H("pocket", "white", 146, 44, 14, 0, false)] },
};

const RIMS: Record<Rarity, { rim: string; edge: string; light: string }> = {
  bronze: { rim: "#E3A57A", edge: "#B9764B", light: "#F6C9A6" },
  silver: { rim: "#D7DDEE", edge: "#A9B2CC", light: "#F4F6FC" },
  gold: { rim: "#FFD54A", edge: "#E0AE1F", light: "#FFF0A8" },
  holo: { rim: "holo", edge: "#9A8FD6", light: "#FFFFFF" },
};
const LOCKED = { rim: "#E3E8F5", edge: "#C9D1E8", light: "#F4F6FC" };

/** Where each piece flies in from: spread around the coin, spinning. */
function startOf(i: number, n: number) {
  const a = (i / n) * Math.PI * 2 + 0.7;
  return { dx: Math.cos(a) * 170, dy: Math.sin(a) * 170, dr: (i % 2 ? 1 : -1) * (120 + i * 25) };
}

function PieceSvg({ p, locked }: { p: Piece; locked: boolean }) {
  if ("line" in p) {
    const [x1, y1, x2, y2] = p.line;
    return (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={locked ? "#D7DDEE" : COLORS[p.c][0]}
        strokeWidth={p.w ?? 4}
        strokeLinecap="round"
        strokeDasharray={p.dash ? "1 8" : undefined}
      />
    );
  }
  const shape = SHAPES[p.k];
  const [fill, shade] = locked ? ["#D7DDEE", "#D7DDEE"] : COLORS[p.c];
  const k = p.s / 40;
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${p.r ?? 0}) scale(${k}) translate(-20 -20)`}>
      <path d={shape.body} fill={fill} />
      {!locked && shape.detail?.(shade)}
      {!locked && p.bolt !== false && <circle cx={shape.bolt[0]} cy={shape.bolt[1]} r={2.2} fill="#1E1B3A" />}
    </g>
  );
}

export function Badge({
  id,
  size = 96,
  locked = false,
  assemble = false,
  className = "",
  label,
}: {
  id: string;
  size?: number;
  locked?: boolean;
  /** Fly the pieces in and lock the rim around them. */
  assemble?: boolean;
  className?: string;
  label?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const def = byId(id);
  const design = DESIGNS[id];
  if (!def || !design) return null;
  const rim = locked ? LOCKED : RIMS[def.rarity];
  const rimFill = rim.rim === "holo" ? `url(#holo-${uid})` : rim.rim;
  const face = locked ? "#F4F6FC" : design.face;
  const n = design.pieces.length;

  return (
    <svg
      width={size}
      height={size * 1.06}
      viewBox="0 0 200 212"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={`overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={`holo-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF9CC2" />
          <stop offset="0.2" stopColor="#FFDD55" />
          <stop offset="0.4" stopColor="#5FDDB0" />
          <stop offset="0.6" stopColor="#7EB3FF" />
          <stop offset="0.8" stopColor="#B79BFF" />
          <stop offset="1" stopColor="#FF9CC2" />
        </linearGradient>
        <clipPath id={`face-${uid}`}>
          <circle cx="100" cy="100" r="76" />
        </clipPath>
      </defs>
      <g className={assemble ? "rim-lock" : undefined} style={assemble ? { animationDelay: `${120 + n * 90 + 250}ms` } : undefined}>
        <circle cx="100" cy="110" r="92" fill={rim.edge} />
        <circle cx="100" cy="100" r="92" fill={rimFill} />
        <path d="M40 52 A74 74 0 0 1 100 22" fill="none" stroke={rim.light} strokeWidth="5" strokeLinecap="round" opacity="0.9" />
        <circle cx="100" cy="104" r="77" fill={rim.edge} opacity="0.55" />
      </g>
      <circle cx="100" cy="100" r="76" fill={face} />
      <g clipPath={assemble ? undefined : `url(#face-${uid})`}>
        {design.pieces.map((p, i) => {
          const s = startOf(i, n);
          return (
            <g
              key={i}
              className={assemble ? "piece-in" : undefined}
              style={
                assemble
                  ? ({
                      "--dx": `${s.dx}px`,
                      "--dy": `${s.dy}px`,
                      "--dr": `${s.dr}deg`,
                      animationDelay: `${120 + i * 90}ms`,
                    } as CSSProperties)
                  : undefined
              }
            >
              <PieceSvg p={p} locked={locked} />
            </g>
          );
        })}
      </g>
      {!locked && (
        <g clipPath={`url(#face-${uid})`}>
          <path d="M52 66 A58 58 0 0 1 84 44" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
          {(assemble || def.rarity === "holo") && (
            <rect
              x="-60"
              y="-20"
              width="40"
              height="260"
              fill="#FFFFFF"
              opacity="0.5"
              className={assemble ? "coin-shine" : "coin-shine-loop"}
              style={assemble ? { animationDelay: `${300 + n * 90 + 500}ms` } : undefined}
            />
          )}
        </g>
      )}
      {locked && (
        <g transform="translate(100 168)">
          <circle r="15" fill="#FFFFFF" />
          <path d="M-5 -1 V-4 a5 5 0 0 1 10 0 V-1" fill="none" stroke="#8C8AA6" strokeWidth="2.4" />
          <rect x="-7" y="-1" width="14" height="10" rx="2.5" fill="#8C8AA6" />
        </g>
      )}
    </svg>
  );
}

/** How long the assembly takes, for timing sounds and text around it. */
export function assembleMs(id: string) {
  const n = DESIGNS[id]?.pieces.length ?? 4;
  return { piecesDone: 120 + n * 90 + 700, lock: 120 + n * 90 + 520 };
}

export function piecesOf(id: string) {
  return DESIGNS[id]?.pieces.length ?? 0;
}
