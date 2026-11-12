import Link from "next/link";
import { ANGLES, HOLDS, HOLD_COLORS, STYLES, gradeLabel, holdHex, labelOf } from "@/lib/constants";
import type { Attempt, Climb } from "@/lib/types";
import { Tally } from "./Tally";

/** "Blue overhang, crimps, power" — how you would point a climb out to a friend. */
export function describeClimb(climb: Climb) {
  const parts = [
    `${labelOf(HOLD_COLORS, climb.color)} ${labelOf(ANGLES, climb.angle).toLowerCase()}`,
    ...climb.holds.map((h) => labelOf(HOLDS, h).toLowerCase()),
    ...climb.styles.map((s) => labelOf(STYLES, s).toLowerCase()),
  ];
  return parts.join(", ");
}

/**
 * One climb as a row, styled after the tape tag at the start of a problem:
 * a stripe in the hold colour, the grade, then the tally of attempts.
 */
export function ClimbTag({
  climb,
  attempts,
  fresh,
  note,
}: {
  climb: Climb;
  attempts: Attempt[];
  fresh?: Set<string>;
  note?: string;
}) {
  return (
    <Link
      href={`/climb?id=${climb.id}`}
      className="flex items-stretch gap-3 overflow-hidden rounded-xl bg-mat-2 pr-3 active:bg-mat-3"
    >
      <span
        aria-hidden
        className="w-2.5 shrink-0"
        style={{
          background: holdHex(climb.color),
          boxShadow:
            climb.color === "black" ? "inset -1px 0 0 var(--color-mat-4)" : undefined,
        }}
      />
      <span className="grade w-14 shrink-0 self-center text-[2.5rem]">
        {gradeLabel(climb.grade)}
      </span>
      <span className="min-w-0 flex-1 py-3">
        <span className="line-clamp-2 block font-medium leading-snug">
          {climb.name || describeClimb(climb)}
        </span>
        <span className="mt-1.5 flex min-h-6 items-center gap-2">
          {attempts.length > 0 ? (
            <Tally attempts={attempts} size={18} fresh={fresh} />
          ) : (
            <span className="muted text-sm">No attempts yet</span>
          )}
        </span>
        {note && <span className="muted mt-1 block text-sm">{note}</span>}
      </span>
    </Link>
  );
}
