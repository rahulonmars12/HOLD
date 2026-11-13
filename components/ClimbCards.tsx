import Link from "next/link";
import { ANGLES, HOLDS, STYLES, gradeLabel, holdHex, holdShade, isDark, labelOf } from "@/lib/constants";
import type { Attempt, Climb, Hold as HoldKind } from "@/lib/types";
import { Hold } from "./Hold";
import { CompactTally, FallCount } from "./Tally";

export const mainHold = (c: Pick<Climb, "holds">): HoldKind => c.holds[0] ?? "jug";

/** "Overhang, crimps, power" */
export function describeClimb(climb: Pick<Climb, "angle" | "holds" | "styles">) {
  return [
    labelOf(ANGLES, climb.angle),
    ...climb.holds.map((h) => labelOf(HOLDS, h).toLowerCase()),
    ...climb.styles.map((s) => (STYLES.find((x) => x.id === s)?.short ?? s).toLowerCase()),
  ].join(", ");
}

/** A rounded square in the climb's hold colour with its grade. */
export function GradeChip({ climb, size = 56 }: { climb: Pick<Climb, "grade" | "color" | "holds">; size?: number }) {
  const dark = isDark(climb.color);
  return (
    <span
      className="on-color relative flex flex-none items-center justify-center overflow-hidden display"
      style={{
        width: size,
        height: size,
        borderRadius: `${size * 0.4}px ${size * 0.26}px ${size * 0.36}px ${size * 0.22}px / ${size * 0.3}px ${size * 0.38}px ${size * 0.24}px ${size * 0.36}px`,
        background: holdHex(climb.color),
        color: dark ? "#FFFFFF" : "#1E1B3A",
        fontSize: size * 0.34,
        boxShadow: climb.color === "white" ? "inset 0 0 0 2px #C9D1E8" : undefined,
      }}
    >
      <Hold
        kind={mainHold(climb)}
        fill={holdShade(climb.color)}
        plain
        size={size * 0.7}
        style={{ position: "absolute", right: -size * 0.2, top: -size * 0.2 }}
      />
      <span className="relative">{gradeLabel(climb.grade)}</span>
    </span>
  );
}

/** Large colour tile for the current session's grid. */
export function ClimbTile({ climb, attempts }: { climb: Climb; attempts: Attempt[] }) {
  const dark = isDark(climb.color);
  return (
    <Link
      href={`/climb?id=${climb.id}`}
      className="on-color tile flex h-[9.25rem] flex-col p-4 active:scale-[0.98]"
      style={{
        background: holdHex(climb.color),
        color: dark ? "#FFFFFF" : "#1E1B3A",
        boxShadow: climb.color === "white" ? "inset 0 0 0 2px #E1E6F5" : undefined,
      }}
    >
      <Hold
        kind={mainHold(climb)}
        fill={holdShade(climb.color)}
        plain
        size={96}
        rotate={-14}
        style={{ position: "absolute", right: -30, top: -28 }}
      />
      <span className="relative display text-[2.375rem] leading-none">{gradeLabel(climb.grade)}</span>
      <span className="relative mt-1.5 line-clamp-2 text-sm font-semibold leading-tight">
        {climb.name || describeClimb(climb)}
      </span>
      <span className={`relative mt-auto ${dark ? "invert" : ""}`}>
        {attempts.length > 0 ? (
          <CompactTally attempts={attempts} />
        ) : (
          <span className="text-sm font-semibold">Not tried yet</span>
        )}
      </span>
    </Link>
  );
}

/** A climb as a white row: grade chip, description, and falls with a tick. */
export function ClimbRow({
  climb,
  attempts,
  note,
  href = `/climb?id=${climb.id}`,
  right,
}: {
  climb: Climb;
  attempts: Attempt[];
  note?: string;
  href?: string;
  right?: React.ReactNode;
}) {
  return (
    <Link href={href} className="flex items-center gap-3.5 rounded-[1.5rem] bg-white py-2 pl-2 pr-4 active:opacity-80">
      <GradeChip climb={climb} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-bold">{climb.name || describeClimb(climb)}</span>
        {note && <span className="muted block truncate text-[0.8125rem]">{note}</span>}
      </span>
      {right ?? (attempts.length > 0 && <FallCount attempts={attempts} />)}
    </Link>
  );
}
