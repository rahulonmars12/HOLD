import type {
  Angle,
  Attempt,
  AttemptGuess,
  Backup,
  Climb,
  FailReason,
  Hold,
  HoldColor,
  ReadResult,
  Session,
  Style,
} from "./types";

/**
 * Ten weeks of made-up sessions for a V7 climber who is strong on steep
 * crimps and weaker on slabs and slopers. Used to preview the Insights
 * screen before there is real data. Deterministic for a given `now`.
 */
export function buildDemo(now = Date.now()): Backup {
  let seed = 7;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  const weighted = <T,>(pairs: readonly (readonly [T, number])[]) => {
    const total = pairs.reduce((n, [, w]) => n + w, 0);
    let r = rand() * total;
    for (const [value, w] of pairs) {
      r -= w;
      if (r <= 0) return value;
    }
    return pairs[pairs.length - 1][0];
  };
  let counter = 0;
  const id = (prefix: string) => `demo-${prefix}-${++counter}`;

  const DAY = 24 * 60 * 60 * 1000;
  const MINUTE = 60 * 1000;
  const colors: HoldColor[] = [
    "red", "orange", "yellow", "green", "blue", "purple", "pink", "white", "black",
  ];

  interface Template {
    ability: number;
    angles: Angle[];
    holds: Hold[];
    styles: Style[];
    grades: readonly (readonly [number, number])[];
    reasons: readonly (readonly [FailReason, number])[];
  }
  const strong: Template = {
    ability: 7,
    angles: ["overhang", "steep", "steep", "roof"],
    holds: ["crimp", "pinch", "jug", "pocket"],
    styles: ["power", "tension", "dynamic", "hooks"],
    grades: [[4, 1], [5, 3], [6, 4], [7, 3], [8, 1]],
    reasons: [
      ["strength", 40], ["beta", 20], ["fatigue", 20],
      ["precision", 10], ["commit", 5], ["foot", 5],
    ],
  };
  const weak: Template = {
    ability: 4.6,
    angles: ["slab", "slab", "vertical"],
    holds: ["sloper", "volume", "crimp"],
    styles: ["balance", "coordination", "mantle", "compression"],
    grades: [[3, 2], [4, 4], [5, 4], [6, 2]],
    reasons: [
      ["beta", 40], ["foot", 25], ["commit", 15],
      ["precision", 10], ["strength", 5], ["fatigue", 5],
    ],
  };

  const sendChance = (diff: number) => {
    if (diff <= -3) return 0.95;
    if (diff <= -2) return 0.75;
    if (diff <= -1) return 0.45;
    if (diff <= 0) return 0.18;
    if (diff <= 1) return 0.06;
    return 0.02;
  };
  // The demo climber reads slightly optimistically.
  const guessFor = (diff: number): AttemptGuess => {
    if (diff <= -2.5) return "flash";
    if (diff <= -1) return weighted([["flash", 2], ["few", 3]] as const);
    if (diff <= 0) return weighted([["few", 3], ["several", 2]] as const);
    return weighted([["few", 1], ["several", 3], ["many", 2]] as const);
  };

  const sessions: Session[] = [];
  const climbs: Climb[] = [];
  const attempts: Attempt[] = [];
  const open: { climb: Climb; template: Template; visits: number }[] = [];

  const work = (
    climb: Climb,
    template: Template,
    session: Session,
    clock: { t: number },
    maxTries: number,
  ) => {
    const chance = sendChance(climb.grade - template.ability);
    const prior = attempts.filter((a) => a.climbId === climb.id).length;
    for (let i = 0; i < maxTries; i++) {
      clock.t += (2 + rand() * 3) * MINUTE;
      // Each attempt on a project teaches a little.
      const sent = rand() < chance + (prior + i) * 0.015;
      attempts.push({
        id: id("a"),
        climbId: climb.id,
        sessionId: session.id,
        at: clock.t,
        result: sent ? "send" : "fall",
        reason: sent || rand() < 0.12 ? undefined : weighted(template.reasons),
      });
      if (sent) {
        const total = prior + i + 1;
        climb.status = "sent";
        climb.sentAt = clock.t;
        climb.read =
          total === 1
            ? "yes"
            : weighted<ReadResult>(
                template === weak
                  ? [["yes", 1], ["partly", 3], ["no", 3]]
                  : [["yes", 3], ["partly", 3], ["no", 1]],
              );
        return true;
      }
    }
    return false;
  };

  for (let week = 9; week >= 0; week--) {
    const start = now - (week * 7 + 3) * DAY - 2 * 60 * MINUTE;
    const session: Session = {
      id: id("s"),
      gym: "Demo gym",
      startedAt: start,
    };
    const clock = { t: start + 10 * MINUTE };

    // Go back to up to two open projects first.
    for (const project of [...open].slice(0, 2)) {
      project.visits++;
      const sent = work(project.climb, project.template, session, clock, 4);
      if (sent || project.visits >= 3) {
        if (!sent && rand() < 0.6) project.climb.status = "retired";
        open.splice(open.indexOf(project), 1);
      }
    }

    const fresh = 6 + Math.floor(rand() * 3);
    for (let i = 0; i < fresh; i++) {
      const template = rand() < 0.62 ? strong : weak;
      const grade = weighted(template.grades);
      const holds = [pick(template.holds)];
      if (rand() < 0.4) {
        const second = pick(template.holds);
        if (!holds.includes(second)) holds.push(second);
      }
      const styles = [pick(template.styles)];
      if (rand() < 0.35) {
        const second = pick(template.styles);
        if (!styles.includes(second)) styles.push(second);
      }
      clock.t += 3 * MINUTE;
      const climb: Climb = {
        id: id("c"),
        createdAt: clock.t,
        gym: session.gym,
        grade,
        color: pick(colors),
        angle: pick(template.angles),
        holds,
        styles,
        status: "project",
        guess: rand() < 0.9 ? guessFor(grade - template.ability) : undefined,
      };
      climbs.push(climb);
      const sent = work(climb, template, session, clock, 3 + Math.floor(rand() * 4));
      if (!sent) open.push({ climb, template, visits: 1 });
    }

    session.endedAt = clock.t + 5 * MINUTE;
    sessions.push(session);
  }

  // Sets get stripped every few weeks, so old unsent climbs are gone.
  for (const climb of climbs) {
    if (climb.status === "project" && climb.createdAt < now - 24 * DAY) {
      climb.status = "retired";
    }
  }

  return {
    app: "tickmark",
    version: 1,
    exportedAt: now,
    sessions,
    climbs,
    attempts,
  };
}
