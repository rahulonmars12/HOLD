import { earnedIds, progressAll } from "./achievements";
import { colorLabel, gradeLabel } from "./constants";
import { climbStats } from "./stats";
import type { Attempt, Climb, CustomColor, Session } from "./types";

/** Everything worth saying about one finished session. */
export interface Recap {
  session: Session;
  minutes: number;
  climbs: number;
  attempts: number;
  sends: number;
  flashes: number;
  falls: number;
  top: Climb | null;
  highlights: string[];
  newPins: string[];
}

const nameOfClimb = (c: Climb, custom: CustomColor[]) => c.name || `${colorLabel(c.color, custom).toLowerCase()} ${gradeLabel(c.grade)}`;

export function buildRecap(
  sessionId: string,
  sessions: Session[],
  climbs: Climb[],
  attempts: Attempt[],
  crew: string[],
  custom: CustomColor[] = [],
): Recap | null {
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const mine = attempts.filter((a) => a.sessionId === sessionId).sort((a, b) => a.at - b.at);
  const byClimb = new Map<string, Attempt[]>();
  for (const a of mine) byClimb.set(a.climbId, [...(byClimb.get(a.climbId) ?? []), a]);
  const all = climbStats(climbs, attempts);
  const sentHere = all.filter((s) => s.sent && mine.some((a) => a.climbId === s.climb.id && a.result === "send"));
  const flashes = sentHere.filter((s) => s.flash).length;
  const top = sentHere.slice().sort((a, b) => b.climb.grade - a.climb.grade)[0]?.climb ?? null;

  const highlights: string[] = [];
  if (top) highlights.push(`Top send: the ${nameOfClimb(top, custom)}`);
  const stubborn = sentHere.filter((s) => (s.attemptsToSend ?? 0) >= 4).sort((a, b) => (b.attemptsToSend ?? 0) - (a.attemptsToSend ?? 0))[0];
  if (stubborn) highlights.push(`Sent the ${nameOfClimb(stubborn.climb, custom)} on go ${stubborn.attemptsToSend}`);
  const project = sentHere.find((s) => s.sessions >= 2);
  if (project && project !== stubborn) highlights.push(`Closed a project: the ${nameOfClimb(project.climb, custom)}, ${project.sessions} sessions in the making`);
  if (flashes >= 2) highlights.push(`${flashes} flashes`);
  const fought = [...byClimb.entries()]
    .filter(([id]) => !sentHere.some((s) => s.climb.id === id))
    .sort((a, b) => b[1].length - a[1].length)[0];
  if (fought && fought[1].length >= 3) {
    const c = climbs.find((x) => x.id === fought[0]);
    if (c) highlights.push(`${fought[1].length} goes on the ${nameOfClimb(c, custom)}. It's a project now.`);
  }

  // What changed because of this session: compare the log with and without it.
  const before = attempts.filter((a) => a.sessionId !== sessionId);
  const sessionsBefore = sessions.filter((s) => s.id !== sessionId);
  const had = new Set(earnedIds(progressAll(sessionsBefore, climbs, before, crew)));
  const newPins = earnedIds(progressAll(sessions, climbs, attempts, crew)).filter((id) => !had.has(id));

  return {
    session,
    minutes: Math.max(0, Math.round(((session.endedAt ?? session.startedAt) - session.startedAt) / 60000)),
    climbs: byClimb.size,
    attempts: mine.length,
    sends: sentHere.length,
    flashes,
    falls: mine.filter((a) => a.result === "fall").length,
    top,
    highlights: highlights.slice(0, 3),
    newPins,
  };
}
