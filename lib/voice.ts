import type { FailReason } from "./types";

/**
 * HOLD!'s voice: a chalky, encouraging friend at the wall. Short lines,
 * never preachy. `seed` keeps a line stable while the screen re-renders.
 */

const pick = <T,>(list: readonly T[], seed: number) => list[Math.abs(Math.floor(seed)) % list.length];

export function greeting(now: Date, persona?: string) {
  const h = now.getHours();
  const part = h < 5 ? "Up late" : h < 12 ? "Morning" : h < 17 ? "Afternoon" : h < 22 ? "Evening" : "Night shift";
  return persona ? `${part}, ${persona}.` : `${part}!`;
}

export function homeTitle(seed: number) {
  return pick(["Ready to climb?", "Chalk up?", "The wall's waiting.", "Let's get after it.", "Send o'clock?"], seed);
}

export function homeLine(seed: number, opts: { projects: number; daysSince?: number }) {
  if (opts.daysSince !== undefined && opts.daysSince >= 10) return "It's been a minute. The holds missed you.";
  if (opts.projects > 0)
    return pick(
      [
        `${opts.projects} ${opts.projects === 1 ? "project is" : "projects are"} still waiting for you.`,
        "Unfinished business on the wall. Shall we?",
        "Those projects won't send themselves.",
      ],
      seed,
    );
  return pick(["Fresh wall, fresh skin. Pick something fun.", "No projects open. Go find a new nemesis."], seed);
}

export function sessionLine(seed: number, s: { climbs: number; sends: number; falls: number }) {
  if (s.climbs === 0) return pick(["Warm up easy. Log the flashes too.", "First climb's the hardest to start.", "Start gentle. Fingers first."], seed);
  if (s.sends === 0 && s.falls >= 6) return pick(["Lots of falls, lots of learning. Keep at it.", "Tough set. You're still pulling on."], seed);
  if (s.sends >= 5) return pick(["You're on one today!", `${s.sends} sends. Somebody's feeling strong.`], seed);
  if (s.sends > 0) return pick(["Nice rhythm. What's next?", "One down. Find the next one.", "Ticking them off."], seed);
  return pick(["Shake it out between goes.", "Take your time. Read it first."], seed);
}

const FALL: Record<FailReason | "none", string[]> = {
  beta: ["Wrong beta, right effort. New plan?", "Try it a different way.", "Watch someone else's feet."],
  strength: ["Arms said no. Shake them out.", "That hold fights back. Rest up.", "Power fades. Give it a minute."],
  commit: ["Next go, go for it.", "You've got it. Just jump.", "Commit and it sticks."],
  foot: ["Feet first. Trust the rubber.", "Press the toe, then move.", "Quiet feet next go."],
  precision: ["So close! Aim, then fire.", "Millimetres. Again.", "Eyes on the hold the whole way."],
  fatigue: ["Tired is data. Take a real rest.", "Long rest. Then one good go.", "Save some skin for next time."],
  none: ["Closer. Shake it out.", "Falls are reps.", "Again, when you're ready.", "That one taught you something."],
};

export const fallLine = (seed: number, reason?: FailReason) => pick(FALL[reason ?? "none"], seed);

export function sendLine(seed: number, attemptsToSend: number, sessions: number) {
  if (attemptsToSend === 1) return pick(["First go! Showing off.", "Flash! Didn't even chalk twice.", "Flashed it. Next!"], seed);
  if (sessions >= 3) return pick(["Project down! That one's been coming.", "Sessions of work, one perfect go."], seed);
  if (attemptsToSend >= 8) return pick(["It finally went! Stubborn wins.", "That's the one. Never in doubt."], seed);
  return pick(["Sent! Tick it.", "Top! Clean.", "That's a send."], seed);
}

export const restLine = (seed: number) => pick(["Breathe. Chalk. Look at the next move.", "Rest is part of the send.", "Shake out. Sip water."], seed);
export const readyLine = (seed: number) => pick(["Rested. Go get it.", "Fresh arms. Your go.", "Ready when you are."], seed);
export const firstGoLine = (seed: number) => pick(["Read it, then pull on.", "Look for the feet first.", "Guess your attempts, then prove it."], seed);

export const returnLine = (seed: number, total: number) =>
  pick([`Go ${total + 1}. You know the moves now.`, "Back for more. This could be the one.", "Same climb, smarter you."], seed);

/** After a send, how the guess made before the first go turned out. */
export function guessLine(seed: number, verdict: "right" | "harder" | "easier") {
  if (verdict === "right") return pick(["You read that one like a book.", "Spot on. Trust your eyes.", "Exactly as predicted."], seed);
  if (verdict === "harder") return pick(["Sneaky one. It fought back.", "Harder than it looked. Noted.", "The wall had other plans."], seed);
  return pick(["Easier than it looked. You're stronger than you think.", "You undersold yourself.", "Give yourself more credit next time."], seed);
}

export function recapTitle(sends: number, attempts: number) {
  if (attempts === 0) return "Session done";
  if (sends === 0) return "Honest work";
  if (sends >= 8) return "What a session!";
  return "Session done!";
}

export function recapLine(s: { sends: number; falls: number; flashes: number; topGrade: number | null }) {
  if (s.sends === 0 && s.falls > 0) return `${s.falls} falls and not one wasted. That's how projects go down.`;
  if (s.flashes >= 3) return `${s.flashes} flashes. You were reading them like menus.`;
  if (s.sends > 0 && s.falls > s.sends * 3) return "You fought for every send today.";
  if (s.sends > 0) return "Solid session. Skin intact?";
  return "Rest up. See you on the wall.";
}
