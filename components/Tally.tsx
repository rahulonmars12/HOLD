import type { Attempt } from "@/lib/types";

type Mark = Pick<Attempt, "id" | "result">;

function Tick({ size, animate }: { size: number; animate?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden
      className={animate ? "pop-in" : undefined}
      style={{ flex: "none" }}
    >
      <circle cx="10" cy="10" r="10" fill="currentColor" />
      <path
        d="M5.5 10l3 3 6-6.5"
        fill="none"
        stroke="var(--color-card)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? "tick-draw" : undefined}
      />
    </svg>
  );
}

function Ring({ size, dim, animate }: { size: number; dim?: boolean; animate?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      aria-hidden
      className={animate ? "pop-in" : undefined}
      style={{ flex: "none", opacity: dim ? 0.4 : 1 }}
    >
      <circle cx="10" cy="10" r="7.6" fill="none" stroke="currentColor" strokeWidth={size > 20 ? 2.4 : 2.6} />
    </svg>
  );
}

const label = (attempts: Mark[]) => {
  const falls = attempts.filter((a) => a.result === "fall").length;
  const sent = attempts.some((a) => a.result === "send");
  if (sent && falls === 0) return "Flashed";
  return `${falls} ${falls === 1 ? "fall" : "falls"}${sent ? ", then sent" : ""}`;
};

/** Rings for falls, grouped in fives like tally marks, and a tick for the send. */
export function Tally({
  attempts,
  size = 14,
  fresh,
  animateLast = false,
  pending = false,
}: {
  attempts: Mark[];
  size?: number;
  /** Attempts from the current session; older ones are drawn lighter. */
  fresh?: Set<string>;
  animateLast?: boolean;
  /** Draws a dashed ring for the next attempt. */
  pending?: boolean;
}) {
  if (attempts.length === 0 && !pending) return null;
  const gap = Math.round(size * 0.3);
  const groups: Mark[][] = [];
  for (const a of attempts) {
    const last = groups[groups.length - 1];
    if (a.result === "fall" && last && last.length < 5 && last.every((x) => x.result === "fall")) last.push(a);
    else groups.push([a]);
  }
  return (
    <span role="img" aria-label={label(attempts)} className="flex flex-wrap items-center" style={{ gap: `${gap}px ${gap * 3}px` }}>
      {groups.map((g, gi) => (
        <span key={gi} className="flex items-center" style={{ gap }}>
          {g.map((a, i) => {
            const isLast = animateLast && gi === groups.length - 1 && i === g.length - 1;
            return a.result === "send" ? (
              <Tick key={a.id} size={size * 1.25} animate={isLast} />
            ) : (
              <Ring key={a.id} size={size} dim={fresh ? !fresh.has(a.id) : false} animate={isLast} />
            );
          })}
        </span>
      ))}
      {pending && (
        <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden style={{ flex: "none" }}>
          <circle cx="10" cy="10" r="7.6" fill="none" stroke="#8C8AA6" strokeWidth="2.2" strokeDasharray="3 4" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

/** Tally for small spaces: rings up to ten attempts, then a count. */
export function CompactTally({ attempts }: { attempts: Mark[] }) {
  if (attempts.length === 0) return null;
  if (attempts.length <= 10) return <Tally attempts={attempts} size={13} />;
  return <FallCount attempts={attempts} />;
}

/** "3 falls" with a tick after it when sent. */
export function FallCount({ attempts }: { attempts: Mark[] }) {
  const falls = attempts.filter((a) => a.result === "fall").length;
  const sent = attempts.some((a) => a.result === "send");
  const text = sent && falls === 0 ? "Flash" : `${falls} ${falls === 1 ? "fall" : "falls"}`;
  return (
    <span role="img" aria-label={label(attempts)} className="flex flex-none items-center gap-2 text-sm font-bold">
      {text}
      {sent ? <Tick size={20} /> : <span aria-hidden className="w-5" />}
    </span>
  );
}
