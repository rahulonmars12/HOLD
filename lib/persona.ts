import { ANGLES, FAIL_REASONS, GUESSES, HOLDS, STYLES, labelOf } from "./constants";
import { climbStats, type ClimbStat } from "./stats";
import type { Angle, Attempt, Climb, FailReason, Hold, Session, Style } from "./types";

/**
 * "You climb like a…": a climbing persona worked out from the last 90 days.
 * Each persona scores the log on what it stands for; the top score is the
 * persona and the runner-up is the "dash of".
 */

export type PersonaId =
  | "gecko"
  | "monkey"
  | "gorilla"
  | "spider"
  | "octopus"
  | "goat"
  | "cat"
  | "tortoise"
  | "badger"
  | "squirrel"
  | "owl"
  | "koala";

export interface PersonaInfo {
  id: PersonaId;
  name: string;
  /** "a" or "an" before the name. */
  article: string;
  tag: string;
  line: string;
  /** Card background, a light tint that sets the character off. */
  tint: string;
  /** What in the log earns it, for the catalog. */
  rule: string;
  /** The persona to borrow from to round out your climbing, and how. */
  edge: { from: PersonaId; tip: string };
}

export const PERSONAS: Record<PersonaId, PersonaInfo> = {
  gecko: {
    id: "gecko", name: "Gecko", article: "a", tag: "Slab and balance", tint: "#C9F3E3",
    line: "Sticky feet, patient hips. You trust friction more than fingers.",
    rule: "Most sends on slab or vertical, balance is a strength, few foot slips.",
    edge: { from: "monkey", tip: "Overhangs trail your slab. Try three steep problems with a big move next session." },
  },
  monkey: {
    id: "monkey", name: "Monkey", article: "a", tag: "Overhang and dynamic", tint: "#FFE1C7",
    line: "Swing first, think later. Big moves on steep walls are your playground.",
    rule: "Most sends on overhangs, dynamic and coordination moves, lots of jugs.",
    edge: { from: "gecko", tip: "Slab is your gap. Pick two slabs a grade below your best and climb them slowly." },
  },
  gorilla: {
    id: "gorilla", name: "Gorilla", article: "a", tag: "Power on steep walls", tint: "#E4E3EE",
    line: "You pull through what others can't hold. Roofs don't scare you.",
    rule: "Sends on steep walls and roofs, power moves, rarely falls because you couldn't hold on.",
    edge: { from: "spider", tip: "Power gets you up, precision saves it. Try a crimpy vertical climb and place every foot." },
  },
  spider: {
    id: "spider", name: "Spider", article: "a", tag: "Crimps and precision", tint: "#E7DEFF",
    line: "Small holds, exact feet. You place every finger like it's planned.",
    rule: "Crimps and pockets lead your sends, body tension, falls are mostly near misses.",
    edge: { from: "monkey", tip: "Commit to a dyno now and then. One big move a session keeps you from getting static." },
  },
  octopus: {
    id: "octopus", name: "Octopus", article: "an", tag: "Compression and hooks", tint: "#FFDCEA",
    line: "Every limb busy. Pinches, hooks and squeezes are your language.",
    rule: "Compression, hooks and pinches, with sends spread across many styles.",
    edge: { from: "spider", tip: "Squeezing is your thing; crimping isn't yet. Add one crimpy climb to each session." },
  },
  goat: {
    id: "goat", name: "Mountain Goat", article: "a", tag: "Flashes and footwork", tint: "#E9EDF8",
    line: "Sure-footed and quick. You read it, you flash it.",
    rule: "A high flash rate and feet that almost never slip.",
    edge: { from: "tortoise", tip: "Flashing is fun; projects make you stronger. Pick one climb you can't flash and give it two sessions." },
  },
  cat: {
    id: "cat", name: "Cat", article: "a", tag: "Careful and quiet", tint: "#FFF3BF",
    line: "You know how many goes it'll take before you pull on.",
    rule: "Your attempt guesses are right most of the time, with few wasted goes.",
    edge: { from: "badger", tip: "You read it well; now trust it. On your next project, go for the crux move every attempt." },
  },
  tortoise: {
    id: "tortoise", name: "Tortoise", article: "a", tag: "Projects across sessions", tint: "#C9F3E3",
    line: "Slow and steady sends. You keep coming back until it goes.",
    rule: "Many attempts per send, and sends that take more than one session.",
    edge: { from: "squirrel", tip: "Mix in volume. Climb five problems below your limit before you start projecting." },
  },
  badger: {
    id: "badger", name: "Honey Badger", article: "a", tag: "Fearless commitment", tint: "#DCDAEA",
    line: "You never back off a move. Falls are just information.",
    rule: "Almost never falls from not committing, and sends after many tries.",
    edge: { from: "owl", tip: "Spend a minute reading before you pull on. Plan the crux beta from the ground." },
  },
  squirrel: {
    id: "squirrel", name: "Squirrel", article: "a", tag: "Tries everything", tint: "#FFDAD4",
    line: "So many climbs, so little time. You sample the whole set.",
    rule: "Lots of different climbs each session, a few attempts on each.",
    edge: { from: "tortoise", tip: "Pick one project per session and give it five good attempts before moving on." },
  },
  owl: {
    id: "owl", name: "Owl", article: "an", tag: "Route reader", tint: "#D6E6FF",
    line: "Your beta usually holds up. You solve it from the ground.",
    rule: "Your beta holds up after the send, and wrong beta rarely costs you.",
    edge: { from: "monkey", tip: "When the plan isn't working, try something wild. One improvised attempt per climb." },
  },
  koala: {
    id: "koala", name: "Koala", article: "a", tag: "Slopers and squeezes", tint: "#E3E8F5",
    line: "You just don't let go. Slopers and compression feel like home.",
    rule: "Slopers and compression lead, and you stay on climbs for many goes.",
    edge: { from: "spider", tip: "Slopers love open hands. Train small edges too: one crimpy problem each session." },
  },
};

export const PERSONA_ORDER = Object.keys(PERSONAS) as PersonaId[];

export const personaImage = (id: PersonaId) => `/personas/${id}.webp`;

export const MIN_SESSIONS = 1;
const WINDOW_DAYS = 90;

export interface Persona {
  id: PersonaId;
  dash: PersonaId;
  facts: { value: string; text: string }[];
  sessions: number;
}

export type PersonaResult = { ready: true; persona: Persona } | { ready: false; sessions: number };

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const pct = (x: number) => `${Math.round(x * 100)}%`;
const lower = (s: string) => s.toLowerCase();

interface Features {
  sent: ClimbStat[];
  tried: ClimbStat[];
  sessions: number;
  falls: Attempt[];
  reasoned: Attempt[];
  angle: (a: Angle[]) => number;
  hold: (h: Hold[]) => number;
  style: (s: Style[]) => number;
  fail: (r: FailReason) => number;
  flashRate: number;
  avgToSend: number;
  multiSession: number;
  climbsPerSession: number;
  attemptsPerClimb: number;
  guesses: { right: number; total: number };
  reads: { yes: number; total: number };
  styleSpread: number;
}

function features(sessions: Session[], climbs: Climb[], attempts: Attempt[], now: number): Features {
  const since = now - WINDOW_DAYS * 86_400_000;
  const recent = attempts.filter((a) => a.at >= since);
  const ids = new Set(recent.map((a) => a.climbId));
  const stats = climbStats(
    climbs.filter((c) => ids.has(c.id)),
    recent,
  );
  const tried = stats.filter((s) => s.total > 0);
  const sent = tried.filter((s) => s.sent);
  const base = sent.length >= 3 ? sent : tried;
  const share = (pred: (s: ClimbStat) => boolean) => (base.length ? base.filter(pred).length / base.length : 0);
  const falls = recent.filter((a) => a.result === "fall");
  const reasoned = falls.filter((a) => a.reason);
  const sessionCount = new Set(recent.map((a) => a.sessionId)).size || sessions.length;

  let right = 0;
  let guessTotal = 0;
  for (const s of sent) {
    const g = GUESSES.find((x) => x.id === s.climb.guess);
    if (!g || !s.attemptsToSend) continue;
    guessTotal++;
    if (s.attemptsToSend >= g.min && s.attemptsToSend <= g.max) right++;
  }
  const reviewed = sent.filter((s) => s.climb.read);
  const sentStyles = new Set(sent.flatMap((s) => s.climb.styles));

  return {
    sent,
    tried,
    sessions: sessionCount,
    falls,
    reasoned,
    angle: (a) => share((s) => a.includes(s.climb.angle)),
    hold: (h) => share((s) => s.climb.holds.some((x) => h.includes(x))),
    style: (st) => share((s) => s.climb.styles.some((x) => st.includes(x))),
    fail: (r) => (reasoned.length ? reasoned.filter((a) => a.reason === r).length / reasoned.length : 0),
    flashRate: sent.length ? sent.filter((s) => s.flash).length / sent.length : 0,
    avgToSend: sent.length ? sent.reduce((n, s) => n + (s.attemptsToSend ?? 0), 0) / sent.length : 0,
    multiSession: sent.length ? sent.filter((s) => s.sessions >= 2).length / sent.length : 0,
    climbsPerSession: sessionCount ? tried.length / sessionCount : 0,
    attemptsPerClimb: tried.length ? recent.length / tried.length : 0,
    guesses: { right, total: guessTotal },
    reads: { yes: reviewed.filter((s) => s.climb.read === "yes").length, total: reviewed.length },
    styleSpread: sentStyles.size / STYLES.length,
  };
}

/** How strongly the log points at each persona; roughly 0 to 1. */
function scores(f: Features): Record<PersonaId, number> {
  const fewFalls = (r: FailReason, k = 4) => (f.reasoned.length >= 5 ? clamp(1 - f.fail(r) * k) : 0.3);
  const guessRate = f.guesses.total >= 4 ? f.guesses.right / f.guesses.total : 0;
  const readRate = f.reads.total >= 3 ? f.reads.yes / f.reads.total : 0;
  return {
    gecko: 0.45 * f.angle(["slab", "vertical"]) + 0.3 * f.style(["balance"]) + 0.15 * f.hold(["sloper"]) + 0.1 * fewFalls("foot"),
    monkey: 0.4 * f.angle(["overhang", "steep"]) + 0.35 * f.style(["dynamic", "coordination"]) + 0.25 * f.hold(["jug"]),
    gorilla: 0.4 * f.angle(["steep", "roof"]) + 0.4 * f.style(["power"]) + 0.2 * fewFalls("strength", 3),
    spider: 0.45 * f.hold(["crimp", "pocket"]) + 0.25 * f.style(["tension"]) + 0.3 * f.fail("precision") * 2,
    octopus: 0.4 * f.style(["compression", "hooks"]) + 0.3 * f.hold(["pinch"]) + 0.3 * f.styleSpread,
    goat: 0.75 * clamp((f.flashRate - 0.15) / 0.35) + 0.25 * fewFalls("foot"),
    cat: 0.75 * guessRate + 0.25 * clamp((4 - f.attemptsPerClimb) / 3),
    tortoise: 0.5 * clamp((f.avgToSend - 2) / 6) + 0.5 * f.multiSession,
    badger: 0.45 * fewFalls("commit", 6) * clamp((f.avgToSend - 1.5) / 3) + 0.35 * clamp((f.avgToSend - 3) / 5),
    squirrel: 0.55 * clamp((f.climbsPerSession - 4) / 5) + 0.45 * clamp((3 - f.attemptsPerClimb) / 2),
    owl: 0.7 * readRate + 0.3 * fewFalls("beta", 3) * (f.reads.total >= 3 ? 1 : 0.3),
    koala: 0.5 * f.hold(["sloper"]) + 0.3 * f.style(["compression"]) + 0.2 * clamp((f.attemptsPerClimb - 3) / 4),
  };
}

/* Facts: short numbers from the log that back up the persona. */

type Fact = { value: string; text: string } | null;

function angleFact(f: Features, angles: Angle[]): Fact {
  if (f.sent.length < 3) return null;
  const share = f.angle(angles);
  const names = angles.map((a) => lower(labelOf(ANGLES, a)));
  return { value: pct(share), text: `of your sends are on ${names.join(" or ")} walls` };
}
function holdFact(f: Features, holds: Hold[]): Fact {
  if (f.sent.length < 3) return null;
  const names = holds.map((h) => lower(labelOf(HOLDS, h)));
  return { value: pct(f.hold(holds)), text: `of your sends have ${names.join(" or ")}` };
}
function styleFact(f: Features, style: Style): Fact {
  const tried = f.tried.filter((s) => s.climb.styles.includes(style));
  if (tried.length < 2) return null;
  const sent = tried.filter((s) => s.sent).length;
  const name = STYLES.find((x) => x.id === style)?.short ?? labelOf(STYLES, style);
  return { value: `${sent}/${tried.length}`, text: `${lower(name)} climbs sent` };
}
function failFact(f: Features, reason: FailReason, few: boolean): Fact {
  if (f.reasoned.length < 5) return null;
  const label = lower(labelOf(FAIL_REASONS, reason));
  void few;
  return { value: pct(f.fail(reason)), text: `of your falls were "${label}"` };
}
const flashFact = (f: Features): Fact =>
  f.sent.length >= 3 ? { value: pct(f.flashRate), text: "of your sends are flashes" } : null;
const avgFact = (f: Features): Fact =>
  f.sent.length >= 3 ? { value: f.avgToSend.toFixed(1), text: "attempts per send, on average" } : null;
const multiFact = (f: Features): Fact => {
  const n = f.sent.filter((s) => s.sessions >= 2).length;
  return n ? { value: String(n), text: n === 1 ? "send took more than one session" : "sends took more than one session" } : null;
};
const guessFact = (f: Features): Fact =>
  f.guesses.total >= 3 ? { value: `${f.guesses.right}/${f.guesses.total}`, text: "attempt guesses right" } : null;
const readFact = (f: Features): Fact =>
  f.reads.total >= 3 ? { value: `${f.reads.yes}/${f.reads.total}`, text: "sends where your beta held up" } : null;
const perSessionFact = (f: Features): Fact =>
  f.sessions ? { value: f.climbsPerSession.toFixed(1), text: "different climbs per session" } : null;
const perClimbFact = (f: Features): Fact =>
  f.tried.length ? { value: f.attemptsPerClimb.toFixed(1), text: "attempts per climb" } : null;
const spreadFact = (f: Features): Fact => {
  const n = Math.round(f.styleSpread * STYLES.length);
  return n >= 3 ? { value: `${n}/${STYLES.length}`, text: "styles you've sent" } : null;
};

const FACTS: Record<PersonaId, ((f: Features) => Fact)[]> = {
  gecko: [(f) => angleFact(f, ["slab", "vertical"]), (f) => styleFact(f, "balance"), (f) => failFact(f, "foot", true), (f) => holdFact(f, ["sloper"])],
  monkey: [(f) => angleFact(f, ["overhang", "steep"]), (f) => styleFact(f, "dynamic"), (f) => holdFact(f, ["jug"]), (f) => styleFact(f, "coordination")],
  gorilla: [(f) => angleFact(f, ["steep", "roof"]), (f) => styleFact(f, "power"), (f) => failFact(f, "strength", true)],
  spider: [(f) => holdFact(f, ["crimp", "pocket"]), (f) => styleFact(f, "tension"), (f) => failFact(f, "precision", false)],
  octopus: [(f) => styleFact(f, "compression"), (f) => styleFact(f, "hooks"), (f) => holdFact(f, ["pinch"]), spreadFact],
  goat: [flashFact, (f) => failFact(f, "foot", true), avgFact],
  cat: [guessFact, perClimbFact, flashFact],
  tortoise: [avgFact, multiFact, perClimbFact],
  badger: [(f) => failFact(f, "commit", true), avgFact, multiFact],
  squirrel: [perSessionFact, perClimbFact, flashFact],
  owl: [readFact, (f) => failFact(f, "beta", true), guessFact],
  koala: [(f) => holdFact(f, ["sloper"]), (f) => styleFact(f, "compression"), perClimbFact],
};

function factsFor(id: PersonaId, f: Features) {
  const out = FACTS[id].map((fn) => fn(f)).filter((x): x is NonNullable<Fact> => x !== null);
  // Always three: fill from general numbers if the persona's own are thin.
  for (const extra of [avgFact, flashFact, perSessionFact, perClimbFact]) {
    if (out.length >= 3) break;
    const x = extra(f);
    if (x && !out.some((o) => o.text === x.text)) out.push(x);
  }
  return out.slice(0, 3);
}

export function computePersona(sessions: Session[], climbs: Climb[], attempts: Attempt[], now = Date.now()): PersonaResult {
  const f = features(sessions, climbs, attempts, now);
  if (f.sessions < MIN_SESSIONS || f.tried.length < 1) return { ready: false, sessions: f.sessions };
  const s = scores(f);
  const ranked = PERSONA_ORDER.slice().sort((a, b) => s[b] - s[a]);
  return {
    ready: true,
    persona: { id: ranked[0], dash: ranked[1], facts: factsFor(ranked[0], f), sessions: f.sessions },
  };
}

/** Gradient colours for each persona's celebrations: its own colour first. */
export const PERSONA_COLORS: Record<PersonaId, string[]> = {
  gecko: ["#5FDDB0", "#7EB3FF", "#FFDD55", "#3FC998"],
  monkey: ["#FFA45C", "#FFDD55", "#FF8A7A", "#FFC9A3"],
  gorilla: ["#8C8AA6", "#B79BFF", "#7EB3FF", "#D9D7E8"],
  spider: ["#B79BFF", "#7EB3FF", "#FF9CC2", "#A080F5"],
  octopus: ["#FF9CC2", "#B79BFF", "#FFA45C", "#F582AD"],
  goat: ["#D6E6FF", "#FF9CC2", "#E8D9B5", "#B79BFF"],
  cat: ["#FFDD55", "#FF9CC2", "#FFA45C", "#FFF3BF"],
  tortoise: ["#5FDDB0", "#FFDD55", "#7EB3FF", "#3FC998"],
  badger: ["#B79BFF", "#7EB3FF", "#FF9CC2", "#5E9EF5"],
  squirrel: ["#FF8A7A", "#FFA45C", "#FFDD55", "#F06C5B"],
  owl: ["#7EB3FF", "#B79BFF", "#FFA45C", "#5E9EF5"],
  koala: ["#C9D1E8", "#FFA45C", "#B79BFF", "#7EB3FF"],
};
