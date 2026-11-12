import { GUESSES, gymKey } from "./constants";
import { climbStats } from "./stats";
import type { Attempt, Climb, Session } from "./types";

/**
 * 27 collectable achievements. Each one is checked against the whole log;
 * the crew ones need buddies, so they are worked out online and passed in.
 */

export type Rarity = "bronze" | "silver" | "gold" | "holo";
export type Category = "Firsts" | "Persistence" | "Habits" | "Style" | "Climbing IQ" | "Crew";

export interface AchievementDef {
  id: string;
  no: number;
  name: string;
  category: Category;
  rarity: Rarity;
  /** What earns it, shown on locked slots. */
  hint: string;
  /** Shown when unlocked. */
  done: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-climb", no: 1, name: "First Climb", category: "Firsts", rarity: "bronze", hint: "Log your first attempt", done: "You logged your first attempt. Every send starts with a fall." },
  { id: "first-send", no: 2, name: "First Send", category: "Firsts", rarity: "bronze", hint: "Send a climb", done: "Your first send in HOLD!. Tick." },
  { id: "first-flash", no: 3, name: "First Flash", category: "Firsts", rarity: "silver", hint: "Send a climb first go", done: "First go, first send. That's a flash." },
  { id: "first-session", no: 4, name: "First Session", category: "Firsts", rarity: "bronze", hint: "Finish a session", done: "Session one in the books. Chalk up for the next." },
  { id: "top-grade", no: 5, name: "New Top Grade", category: "Firsts", rarity: "gold", hint: "Send harder than your best so far", done: "You sent a grade you'd never sent before." },
  { id: "stubborn", no: 6, name: "Stubborn", category: "Persistence", rarity: "silver", hint: "Send a climb after 10+ attempts", done: "Ten goes or more, and you still sent it." },
  { id: "project-slayer", no: 7, name: "Project Slayer", category: "Persistence", rarity: "gold", hint: "Send a climb across 3+ sessions", done: "Three sessions of work, one send. Projects fall to you." },
  { id: "comeback", no: 8, name: "Comeback", category: "Persistence", rarity: "silver", hint: "Send after 5 falls in one session", done: "Five falls, then the send. You bounced back." },
  { id: "thousand-falls", no: 9, name: "Thousand Falls", category: "Persistence", rarity: "holo", hint: "Fall 1,000 times", done: "A thousand falls. Every one of them taught you something." },
  { id: "ten-sessions", no: 10, name: "Ten Sessions", category: "Habits", rarity: "bronze", hint: "Climb 10 sessions", done: "Ten sessions logged. It's a habit now." },
  { id: "streak", no: 11, name: "Four-Week Streak", category: "Habits", rarity: "silver", hint: "Climb 4 weeks in a row", done: "Four weeks in a row on the wall." },
  { id: "century", no: 12, name: "Century", category: "Habits", rarity: "silver", hint: "Log 100 attempts", done: "One hundred attempts and counting." },
  { id: "marathon", no: 13, name: "Marathon", category: "Habits", rarity: "gold", hint: "A session of 3 hours or more", done: "Three hours on the wall in one go." },
  { id: "night-owl", no: 14, name: "Night Owl", category: "Habits", rarity: "bronze", hint: "Start a session after 9pm", done: "Late-night sends hit different." },
  { id: "early-bird", no: 15, name: "Early Bird", category: "Habits", rarity: "bronze", hint: "Start a session before 8am", done: "Climbing before breakfast. Respect." },
  { id: "slab-wizard", no: 16, name: "Slab Wizard", category: "Style", rarity: "silver", hint: "Send 10 slabs", done: "Ten slabs sent on trust and friction." },
  { id: "roof-rat", no: 17, name: "Roof Rat", category: "Style", rarity: "silver", hint: "Send 10 steep or roof climbs", done: "Ten sends on the steepest walls." },
  { id: "crimp-lord", no: 18, name: "Crimp Lord", category: "Style", rarity: "gold", hint: "Send 10 crimpy climbs", done: "Ten crimp sends. Your fingers rule." },
  { id: "sloper-whisperer", no: 19, name: "Sloper Whisperer", category: "Style", rarity: "silver", hint: "Send 10 sloper climbs", done: "Ten sloper sends. They listen to you." },
  { id: "all-rounder", no: 20, name: "All-Rounder", category: "Style", rarity: "holo", hint: "Send on every wall angle", done: "Slab to roof, you've sent them all." },
  { id: "called-it", no: 21, name: "Called It", category: "Climbing IQ", rarity: "silver", hint: "Flash a climb you guessed as a flash", done: "You said flash, and you flashed it." },
  { id: "mind-reader", no: 22, name: "Mind Reader", category: "Climbing IQ", rarity: "gold", hint: "Guess attempts right 5 times", done: "Five spot-on attempt guesses. You read climbs like books." },
  { id: "beta-scribe", no: 23, name: "Beta Scribe", category: "Climbing IQ", rarity: "bronze", hint: "Write what worked after a send", done: "Your first beta note. Future you says thanks." },
  { id: "same-wall", no: 24, name: "Same Wall", category: "Crew", rarity: "bronze", hint: "Climb at the same gym as a buddy, at the same time", done: "You and a buddy, same wall, same time." },
  { id: "send-train", no: 25, name: "Send Train", category: "Crew", rarity: "silver", hint: "Send a climb a buddy also sent", done: "You and a buddy both sent the same climb." },
  { id: "flash-mob", no: 26, name: "Flash Mob", category: "Crew", rarity: "gold", hint: "Flash 3 climbs in one session", done: "Three flashes in one session." },
  { id: "collector", no: 27, name: "Collector", category: "Crew", rarity: "holo", hint: "Unlock every other achievement", done: "Every pin on the board. Legend." },
];

export const CATEGORIES: Category[] = ["Firsts", "Persistence", "Habits", "Style", "Climbing IQ", "Crew"];
export const RARITY_LABEL: Record<Rarity, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", holo: "Holographic" };
const RARITY_RANK: Record<Rarity, number> = { bronze: 0, silver: 1, gold: 2, holo: 3 };

export const byId = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);
export const rarest = (ids: string[]) =>
  ids.map(byId).filter((a): a is AchievementDef => !!a).sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity] || a.no - b.no)[0];

export interface Progress {
  earned: boolean;
  /** For counted achievements: how far along. */
  have?: number;
  need?: number;
}

const WEEK = 7 * 86_400_000;

/** Monday-based week number, so a streak is about calendar weeks. */
function weekIndex(t: number) {
  const d = new Date(t);
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
  return Math.round(monday / WEEK);
}

export function progressAll(
  sessions: Session[],
  climbs: Climb[],
  attempts: Attempt[],
  crew: string[] = [],
): Record<string, Progress> {
  const stats = climbStats(climbs, attempts);
  const sent = stats.filter((s) => s.sent);
  const falls = attempts.filter((a) => a.result === "fall").length;
  const used = sessions.filter((s) => attempts.some((a) => a.sessionId === s.id));
  const count = (n: number, need: number): Progress => ({ earned: n >= need, have: Math.min(n, need), need });
  const hours = (s: Session) => new Date(s.startedAt).getHours();

  // New top grade: a send harder than every earlier send (not the first one).
  const ordered = sent.slice().sort((a, b) => (a.sentAt ?? 0) - (b.sentAt ?? 0));
  let best = -1;
  let raised = false;
  for (const s of ordered) {
    if (best >= 0 && s.climb.grade > best) raised = true;
    best = Math.max(best, s.climb.grade);
  }

  // Comeback: a send in a session where you'd fallen on it five times.
  const comeback = sent.some((s) => {
    const send = s.attempts.find((a) => a.result === "send");
    if (!send) return false;
    return s.attempts.filter((a) => a.sessionId === send.sessionId && a.result === "fall" && a.at < send.at).length >= 5;
  });

  // Longest run of consecutive weeks with a session.
  const weeks = [...new Set(used.map((s) => weekIndex(s.startedAt)))].sort((a, b) => a - b);
  let run = 0;
  let longest = 0;
  for (let i = 0; i < weeks.length; i++) {
    run = i > 0 && weeks[i] === weeks[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  let guessesRight = 0;
  for (const s of sent) {
    const g = GUESSES.find((x) => x.id === s.climb.guess);
    if (g && s.attemptsToSend && s.attemptsToSend >= g.min && s.attemptsToSend <= g.max) guessesRight++;
  }
  const flashesBySession = new Map<string, number>();
  for (const s of sent) if (s.flash) flashesBySession.set(s.attempts[0].sessionId, (flashesBySession.get(s.attempts[0].sessionId) ?? 0) + 1);
  const angles = new Set(sent.map((s) => s.climb.angle));
  const sentWith = (pred: (c: Climb) => boolean) => sent.filter((s) => pred(s.climb)).length;

  const out: Record<string, Progress> = {
    "first-climb": { earned: attempts.length > 0 },
    "first-send": { earned: sent.length > 0 },
    "first-flash": { earned: sent.some((s) => s.flash) },
    "first-session": { earned: used.some((s) => s.endedAt !== undefined) },
    "top-grade": { earned: raised },
    stubborn: { earned: sent.some((s) => (s.attemptsToSend ?? 0) >= 10) },
    "project-slayer": { earned: sent.some((s) => s.sessions >= 3) },
    comeback: { earned: comeback },
    "thousand-falls": count(falls, 1000),
    "ten-sessions": count(used.length, 10),
    streak: count(longest, 4),
    century: count(attempts.length, 100),
    marathon: { earned: used.some((s) => s.endedAt !== undefined && s.endedAt - s.startedAt >= 3 * 3_600_000) },
    "night-owl": { earned: used.some((s) => hours(s) >= 21) },
    "early-bird": { earned: used.some((s) => hours(s) < 8) },
    "slab-wizard": count(sentWith((c) => c.angle === "slab"), 10),
    "roof-rat": count(sentWith((c) => c.angle === "roof" || c.angle === "steep"), 10),
    "crimp-lord": count(sentWith((c) => c.holds.includes("crimp")), 10),
    "sloper-whisperer": count(sentWith((c) => c.holds.includes("sloper")), 10),
    "all-rounder": count(angles.size, 5),
    "called-it": { earned: sent.some((s) => s.flash && s.climb.guess === "flash") },
    "mind-reader": count(guessesRight, 5),
    "beta-scribe": { earned: climbs.some((c) => !!c.whatWorked) },
    "same-wall": { earned: crew.includes("same-wall") },
    "send-train": { earned: crew.includes("send-train") },
    "flash-mob": { earned: [...flashesBySession.values()].some((n) => n >= 3) },
  };
  const others = ACHIEVEMENTS.filter((a) => a.id !== "collector");
  out.collector = count(others.filter((a) => out[a.id]?.earned).length, others.length);
  return out;
}

export const earnedIds = (p: Record<string, Progress>) => ACHIEVEMENTS.filter((a) => p[a.id]?.earned).map((a) => a.id);

/** For "Same Wall": did any buddy session overlap one of yours at the same gym? */
export function overlapsBuddy(mine: Session[], theirs: { gym_key: string; started_at: number; ended_at: number | null }[]) {
  return mine.some((m) =>
    theirs.some(
      (t) =>
        t.gym_key === gymKey(m.gym) &&
        t.started_at < (m.endedAt ?? m.startedAt + 3 * 3_600_000) &&
        (t.ended_at ?? t.started_at + 3 * 3_600_000) > m.startedAt,
    ),
  );
}
