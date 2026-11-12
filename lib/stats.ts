import { ANGLES, FAIL_REASONS, GUESSES, HOLDS, READ_RESULTS, STYLES } from "./constants";
import type { Attempt, Climb, FailReason, Session } from "./types";

/** One climb with its whole attempt history, oldest first. */
export interface ClimbStat {
  climb: Climb;
  attempts: Attempt[];
  total: number;
  falls: number;
  sent: boolean;
  /** Attempts it took to send, counting the send itself. */
  attemptsToSend?: number;
  flash: boolean;
  sessions: number;
  firstAt?: number;
  lastAt?: number;
  sentAt?: number;
}

export function climbStats(climbs: Climb[], attempts: Attempt[]): ClimbStat[] {
  const byClimb = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const list = byClimb.get(a.climbId);
    if (list) list.push(a);
    else byClimb.set(a.climbId, [a]);
  }
  return climbs.map((climb) => {
    const list = (byClimb.get(climb.id) ?? []).sort((a, b) => a.at - b.at);
    const sendIndex = list.findIndex((a) => a.result === "send");
    const sent = sendIndex >= 0;
    return {
      climb,
      attempts: list,
      total: list.length,
      falls: list.filter((a) => a.result === "fall").length,
      sent,
      attemptsToSend: sent ? sendIndex + 1 : undefined,
      flash: sendIndex === 0,
      sessions: new Set(list.map((a) => a.sessionId)).size,
      firstAt: list[0]?.at,
      lastAt: list[list.length - 1]?.at,
      sentAt: sent ? list[sendIndex].at : undefined,
    };
  });
}

/** Stats limited to a time window. `since` of 0 means all time. */
export interface Window {
  since: number;
  until: number;
}

const inWindow = (t: number | undefined, w: Window) =>
  t !== undefined && t >= w.since && t < w.until;

const triedIn = (s: ClimbStat, w: Window) =>
  s.attempts.some((a) => inWindow(a.at, w));

const sentIn = (s: ClimbStat, w: Window) => inWindow(s.sentAt, w);

export interface Summary {
  sessions: number;
  climbs: number;
  attempts: number;
  sends: number;
  flashes: number;
  /** Share of climbs first tried in the window that went first go. */
  flashRate: number | null;
  topGrade: number | null;
}

export function summary(
  stats: ClimbStat[],
  sessions: Session[],
  w: Window,
): Summary {
  const tried = stats.filter((s) => triedIn(s, w));
  const sent = stats.filter((s) => sentIn(s, w));
  const fresh = stats.filter((s) => inWindow(s.firstAt, w));
  const flashes = fresh.filter((s) => s.flash).length;
  return {
    sessions: sessions.filter((s) => inWindow(s.startedAt, w)).length,
    climbs: tried.length,
    attempts: tried.reduce(
      (n, s) => n + s.attempts.filter((a) => inWindow(a.at, w)).length,
      0,
    ),
    sends: sent.length,
    flashes,
    flashRate: fresh.length ? flashes / fresh.length : null,
    topGrade: sent.length ? Math.max(...sent.map((s) => s.climb.grade)) : null,
  };
}

export interface PyramidRow {
  grade: number;
  flashes: number;
  sends: number;
  open: number;
}

/** Sends per grade, hardest first, with unsent projects alongside. */
export function pyramid(stats: ClimbStat[], w: Window): PyramidRow[] {
  const rows = new Map<number, PyramidRow>();
  const row = (grade: number) => {
    let r = rows.get(grade);
    if (!r) {
      r = { grade, flashes: 0, sends: 0, open: 0 };
      rows.set(grade, r);
    }
    return r;
  };
  for (const s of stats) {
    if (sentIn(s, w)) {
      if (s.flash) row(s.climb.grade).flashes++;
      else row(s.climb.grade).sends++;
    } else if (!s.sent && triedIn(s, w)) {
      row(s.climb.grade).open++;
    }
  }
  if (rows.size === 0) return [];
  const grades = [...rows.keys()];
  const out: PyramidRow[] = [];
  for (let g = Math.max(...grades); g >= Math.min(...grades); g--) {
    out.push(rows.get(g) ?? { grade: g, flashes: 0, sends: 0, open: 0 });
  }
  return out;
}

export type Dimension = "angle" | "holds" | "styles";

export interface TagRow {
  dimension: Dimension;
  id: string;
  label: string;
  tried: number;
  sent: number;
  sendRate: number;
  topSent: number | null;
  /** Mean attempts per sent climb. */
  attemptsPerSend: number | null;
}

const DIMENSIONS: Record<
  Dimension,
  { tags: { id: string; label: string }[]; of: (c: Climb) => string[] }
> = {
  angle: { tags: ANGLES, of: (c) => [c.angle] },
  holds: { tags: HOLDS, of: (c) => c.holds },
  styles: { tags: STYLES, of: (c) => c.styles },
};

export function tagProfile(
  stats: ClimbStat[],
  dimension: Dimension,
  w: Window,
): TagRow[] {
  const { tags, of } = DIMENSIONS[dimension];
  return tags
    .map(({ id, label }) => {
      const tried = stats.filter(
        (s) => triedIn(s, w) && of(s.climb).includes(id),
      );
      const sent = tried.filter((s) => sentIn(s, w));
      return {
        dimension,
        id,
        label,
        tried: tried.length,
        sent: sent.length,
        sendRate: tried.length ? sent.length / tried.length : 0,
        topSent: sent.length
          ? Math.max(...sent.map((s) => s.climb.grade))
          : null,
        attemptsPerSend: sent.length
          ? sent.reduce((n, s) => n + (s.attemptsToSend ?? 0), 0) / sent.length
          : null,
      };
    })
    .filter((r) => r.tried > 0)
    .sort(
      (a, b) =>
        (b.topSent ?? -1) - (a.topSent ?? -1) || b.sendRate - a.sendRate,
    );
}

/** Needs this many climbs in a tag before it is called a weakness. */
export const MIN_SAMPLE = 3;

export interface Gap {
  row: TagRow;
  /** Grades between this tag's best send and the overall best send. */
  grades: number;
  overallTop: number;
}

/**
 * The tag where the climber's best send sits furthest below their overall
 * best. Returns null until there is enough data to say so.
 */
export function biggestGap(rows: TagRow[], overallTop: number | null): Gap | null {
  if (overallTop === null) return null;
  const candidates = rows
    .filter((r) => r.tried >= MIN_SAMPLE)
    .map((r) => ({
      row: r,
      grades: overallTop - (r.topSent ?? Math.max(overallTop - 4, 0)),
      overallTop,
    }))
    .filter((g) => g.grades >= 2)
    .sort((a, b) => b.grades - a.grades || a.row.sendRate - b.row.sendRate);
  return candidates[0] ?? null;
}

export interface ReasonRow {
  id: FailReason;
  label: string;
  pointer: string;
  count: number;
  share: number;
}

export interface Reasons {
  rows: ReasonRow[];
  labelled: number;
  unlabelled: number;
}

export function failReasons(attempts: Attempt[], w: Window): Reasons {
  const falls = attempts.filter(
    (a) => a.result === "fall" && inWindow(a.at, w),
  );
  const labelled = falls.filter((a) => a.reason);
  const rows = FAIL_REASONS.map((r) => {
    const count = labelled.filter((a) => a.reason === r.id).length;
    return {
      ...r,
      count,
      share: labelled.length ? count / labelled.length : 0,
    };
  }).sort((a, b) => b.count - a.count);
  return {
    rows,
    labelled: labelled.length,
    unlabelled: falls.length - labelled.length,
  };
}

export interface Reading {
  /** Climbs with a "did the read hold up" answer. */
  reviewed: number;
  /** 0 to 1, where yes counts 1, partly 0.5 and no 0. */
  score: number | null;
  counts: { yes: number; partly: number; no: number };
  /** Climbs with an attempt guess that can be judged. */
  guessed: number;
  right: number;
  harder: number;
  easier: number;
}

export function reading(stats: ClimbStat[], w: Window): Reading {
  const out: Reading = {
    reviewed: 0,
    score: null,
    counts: { yes: 0, partly: 0, no: 0 },
    guessed: 0,
    right: 0,
    harder: 0,
    easier: 0,
  };
  let scoreSum = 0;
  for (const s of stats) {
    const { climb } = s;
    if (climb.read && sentIn(s, w)) {
      out.reviewed++;
      out.counts[climb.read]++;
      scoreSum += READ_RESULTS.find((r) => r.id === climb.read)?.score ?? 0;
    }
    const guess = GUESSES.find((g) => g.id === climb.guess);
    if (!guess) continue;
    if (sentIn(s, w) && s.attemptsToSend !== undefined) {
      out.guessed++;
      if (s.attemptsToSend > guess.max) out.harder++;
      else if (s.attemptsToSend < guess.min) out.easier++;
      else out.right++;
    } else if (!s.sent && triedIn(s, w) && s.total > guess.max) {
      // Still unsent and already past the guess: it was harder than it looked.
      out.guessed++;
      out.harder++;
    }
  }
  out.score = out.reviewed ? scoreSum / out.reviewed : null;
  return out;
}

export interface SessionStat {
  session: Session;
  attempts: number;
  climbs: number;
  sends: number;
  topSend: number | null;
  climbIds: string[];
}

export function sessionStats(
  sessions: Session[],
  climbs: Climb[],
  attempts: Attempt[],
): SessionStat[] {
  const gradeOf = new Map(climbs.map((c) => [c.id, c.grade]));
  return [...sessions]
    .sort((a, b) => b.startedAt - a.startedAt)
    .map((session) => {
      const mine = attempts
        .filter((a) => a.sessionId === session.id)
        .sort((a, b) => a.at - b.at);
      const sends = mine.filter((a) => a.result === "send");
      const sendGrades = sends
        .map((a) => gradeOf.get(a.climbId))
        .filter((g): g is number => g !== undefined);
      return {
        session,
        attempts: mine.length,
        climbs: new Set(mine.map((a) => a.climbId)).size,
        sends: sends.length,
        topSend: sendGrades.length ? Math.max(...sendGrades) : null,
        climbIds: [...new Set(mine.map((a) => a.climbId))],
      };
    });
}
