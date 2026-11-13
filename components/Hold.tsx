import type { CSSProperties } from "react";
import type { Hold as HoldKind } from "@/lib/types";

/**
 * Climbing holds drawn in a 40×40 box: the app's graphic motif. Each shape
 * has a body, an optional detail in a darker shade (the jug's incut lip,
 * the crimp's edge, the pinch's ridge, the pocket's hole, the volume's
 * facet), and a bolt hole.
 */
export const SHAPES: Record<
  HoldKind,
  { body: string; detail?: (shade: string) => React.ReactNode; bolt: [number, number] }
> = {
  jug: {
    body: "M3 18 C3 9 11 5 20 5 C29 5 37 9 37 18 C37 29 29 36 20 36 C11 36 3 29 3 18 Z",
    detail: (s) => <path d="M9 15 C13 10 27 10 31 15 C27 19 13 19 9 15 Z" fill={s} />,
    bolt: [20, 27],
  },
  crimp: {
    body: "M2 19 C9 14 31 13 38 16 C39 20 37 23 34 24 C25 26 14 26 5 25 C2 24 1 21 2 19 Z",
    detail: (s) => (
      <path d="M6 19 C14 16 28 16 34 18" fill="none" stroke={s} strokeWidth="2.5" strokeLinecap="round" />
    ),
    bolt: [20, 22],
  },
  sloper: {
    body: "M3 34 C3 18 12 7 22 7 C32 7 38 18 37 34 Z",
    detail: (s) => <path d="M11 34 C12 24 17 17 23 17 C30 17 33 25 33 34 Z" fill={s} />,
    bolt: [22, 27],
  },
  pinch: {
    body: "M20 2 C28 2 31 12 30 20 C29 30 27 38 20 38 C13 38 11 30 10 20 C9 12 12 2 20 2 Z",
    detail: (s) => <path d="M20 7 V33" stroke={s} strokeWidth="3" strokeLinecap="round" />,
    bolt: [20, 20],
  },
  pocket: {
    body: "M4 20 C4 10 12 4 21 4 C31 4 37 11 36 21 C35 31 28 36 20 36 C11 36 4 30 4 20 Z",
    detail: () => <ellipse cx="18" cy="17" rx="9" ry="6" fill="#1E1B3A" />,
    bolt: [26, 28],
  },
  volume: {
    body: "M3 34 L14 4 L38 13 L34 36 Z",
    detail: (s) => (
      <>
        <path d="M22 22 L38 13 L34 36 Z" fill={s} />
        <path d="M14 4 L22 22 L3 34" fill="none" stroke={s} strokeWidth="1.5" />
      </>
    ),
    bolt: [22, 22],
  },
};

export function Hold({
  kind,
  fill,
  shade,
  size = 40,
  bolt = "#1E1B3A",
  rotate = 0,
  plain = false,
  className,
  style,
  viewBox = "0 0 40 40",
}: {
  kind: HoldKind;
  fill: string;
  shade?: string;
  size?: number | string;
  /** Bolt hole colour, or false for none. */
  bolt?: string | false;
  rotate?: number;
  /** Body only, no detail or bolt: for silhouettes. */
  plain?: boolean;
  className?: string;
  style?: CSSProperties;
  viewBox?: string;
}) {
  const shape = SHAPES[kind];
  const [bx, by] = shape.bolt;
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox={viewBox}
      className={className}
      style={{ ...style, transform: rotate ? `rotate(${rotate}deg)` : style?.transform }}
    >
      <path d={shape.body} fill={fill} />
      {!plain && shade && shape.detail?.(shade)}
      {!plain && bolt && <circle cx={bx} cy={by} r={kind === "volume" ? 2 : 2.2} fill={bolt} />}
    </svg>
  );
}

/** The big decorative hold in a page's top corner. */
export function CornerHold({
  kind,
  fill,
  shade,
  rotate = 12,
  size = 240,
  right = -80,
  top = -72,
}: {
  kind: HoldKind;
  fill: string;
  shade: string;
  rotate?: number;
  size?: number;
  right?: number;
  top?: number;
}) {
  return (
    <div aria-hidden className="pointer-events-none absolute" style={{ right, top }}>
      {/* Titles often run over this hold, so its bolt is tonal instead of navy and never fights the text. */}
      <Hold kind={kind} fill={fill} shade={shade} bolt={shade} size={size} rotate={rotate} />
    </div>
  );
}
