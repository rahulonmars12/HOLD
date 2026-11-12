import type { Attempt } from "@/lib/types";

/**
 * Attempts drawn the way climbers count them: chalk tally strokes, bundled in
 * fives, with the send as a yellow tick. `fresh` marks attempts from the
 * current session so they read brighter than older ones.
 */
export function Tally({
  attempts,
  size = 22,
  fresh,
  animateLast = false,
}: {
  attempts: Pick<Attempt, "id" | "result">[];
  size?: number;
  fresh?: Set<string>;
  animateLast?: boolean;
}) {
  if (attempts.length === 0) return null;

  const gap = size * 0.34;
  const groupGap = size * 0.6;
  const stroke = Math.max(2, size * 0.13);
  const pad = stroke;

  // Small fixed wobble so strokes look hand-drawn but never jump on re-render.
  const lean = (i: number) => (((i * 37) % 7) - 3) * size * 0.012;

  let x = pad + gap * 0.5;
  let fallsInGroup = 0;
  let groupStart = x;
  const marks: React.ReactNode[] = [];

  attempts.forEach((a, i) => {
    const isLast = i === attempts.length - 1;
    const dim = fresh && !fresh.has(a.id);
    const cls = animateLast && isLast ? "tick-new" : undefined;

    if (a.result === "send") {
      if (fallsInGroup > 0) x += groupGap * 0.5;
      marks.push(
        <path
          key={a.id}
          className={cls}
          d={`M${x} ${pad + size * 0.55} l${size * 0.28} ${size * 0.4} l${size * 0.5} ${-size * 0.85}`}
          fill="none"
          stroke="var(--color-tape)"
          strokeWidth={stroke * 1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />,
      );
      x += size * 0.78 + groupGap;
      fallsInGroup = 0;
      groupStart = x;
      return;
    }

    if (fallsInGroup === 4) {
      // Fifth fall: the diagonal that closes the bundle.
      marks.push(
        <line
          key={a.id}
          className={cls}
          x1={groupStart - gap * 0.5}
          y1={pad + size * 0.78}
          x2={x - gap * 0.5}
          y2={pad + size * 0.2}
          stroke="var(--color-chalk)"
          strokeOpacity={dim ? 0.45 : 1}
          strokeWidth={stroke}
          strokeLinecap="round"
        />,
      );
      x += groupGap;
      fallsInGroup = 0;
      groupStart = x;
      return;
    }

    marks.push(
      <line
        key={a.id}
        className={cls}
        x1={x + lean(i)}
        y1={pad}
        x2={x - lean(i)}
        y2={pad + size}
        stroke="var(--color-chalk)"
        strokeOpacity={dim ? 0.45 : 1}
        strokeWidth={stroke}
        strokeLinecap="round"
      />,
    );
    x += gap;
    fallsInGroup++;
  });

  const width = Math.max(x - gap + pad, pad * 2);
  const height = size + pad * 2;
  const falls = attempts.filter((a) => a.result === "fall").length;
  const sent = attempts.some((a) => a.result === "send");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${falls} ${falls === 1 ? "fall" : "falls"}${sent ? ", then sent" : ""}`}
      className="h-auto max-w-full"
    >
      {marks}
    </svg>
  );
}
