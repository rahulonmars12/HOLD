import type { BuddyProfile, FeedItem, Nudge, Profile } from "./social";
import type { Climb, Session } from "./types";

/**
 * A make-believe crew that comes with the demo data, so the Buddies tab, buddy
 * pages, cheers and banners can be tried without an account. Nothing here is
 * saved or sent anywhere.
 */
const DAY = 86_400_000;
const GYM = "Demo gym";

const P = (id: string, name: string): Profile => ({ id: `demo-${id}`, username: id, display_name: name });
const MAYA = P("maya", "Maya");
const TOM = P("tomsends", "Tom");
const LINH = P("linh", "Linh");
const KAI = P("kai", "Kai");

const climb = (id: string, grade: number, color: string, angle: string, holds: string[], styles: string[], daysAgo: number, now: number, extra: Partial<Climb> = {}): Climb =>
  ({
    id: `demo-crew-${id}`,
    createdAt: now - daysAgo * DAY - 3_600_000,
    sentAt: now - daysAgo * DAY,
    gym: GYM,
    grade,
    color,
    angle,
    holds,
    styles,
    status: "sent",
    ...extra,
  }) as Climb;

export const isDemoId = (id: string | null | undefined) => !!id && id.startsWith("demo-");
export const isDemoLog = (sessions: Session[]) => sessions.some((s) => s.id.startsWith("demo-"));

export interface DemoCrew {
  buddies: (BuddyProfile & { persona: string })[];
  live: { who: Profile; gym: string; startedAt: number; persona: string }[];
  feed: FeedItem[];
}

export function demoCrew(now: number, mySends: Climb[] = []): DemoCrew {
  const maya = [
    climb("m1", 7, "pink", "overhang", ["sloper", "pinch"], ["compression"], 0.2, now, { whatWorked: "Toe hook on the volume, then just squeeze." }),
    climb("m2", 6, "blue", "steep", ["jug"], ["dynamic"], 3, now, { name: "The big swing" }),
    climb("m3", 6, "green", "overhang", ["pinch"], ["power"], 9, now),
    climb("m4", 5, "yellow", "roof", ["jug"], ["hooks"], 12, now),
  ];
  const tom = [
    climb("t1", 5, "orange", "vertical", ["crimp"], ["balance"], 1, now, { whatWorked: "Stand up on the left foot way earlier than feels right." }),
    climb("t2", 5, "purple", "slab", ["volume"], ["mantle"], 6, now),
    climb("t3", 4, "white", "slab", ["sloper"], ["balance"], 15, now),
  ];
  const linh = [
    climb("l1", 6, "black", "slab", ["crimp"], ["balance"], 2, now, { whatWorked: "Trust the smear. Don't look down." }),
    climb("l2", 6, "blue", "vertical", ["crimp", "pocket"], ["tension"], 5, now),
    climb("l3", 5, "pink", "slab", ["sloper"], ["balance"], 11, now),
    climb("l4", 5, "green", "vertical", ["pocket"], ["precision"], 13, now),
  ];
  const kai = [climb("k1", 8, "black", "roof", ["pocket", "pinch"], ["power"], 4, now, { name: "Ceiling fan", whatWorked: "Cut feet on purpose and campus the last two." })];

  const profile = (who: Profile, persona: string, dash: string, pins: string[], climbs: Climb[], sessions30: number) => ({
    who,
    persona,
    dash,
    pins,
    topSends: [...climbs].sort((a, b) => b.grade - a.grade).slice(0, 5),
    sends: climbs.length * 9 + 4,
    sessions30,
    lastGym: GYM,
    isBuddy: true,
  });
  const buddies = [
    profile(MAYA, "monkey", "gorilla", ["first-climb", "first-send", "first-flash", "first-session", "top-grade", "project-slayer", "roof-rat", "ten-sessions", "send-train"], maya, 9),
    profile(TOM, "tortoise", "badger", ["first-climb", "first-send", "first-session", "stubborn", "comeback", "beta-scribe"], tom, 5),
    profile(LINH, "gecko", "cat", ["first-climb", "first-send", "first-flash", "first-session", "slab-wizard", "crimp-lord", "called-it", "mind-reader", "streak", "early-bird"], linh, 11),
    profile(KAI, "gorilla", "spider", ["first-climb", "first-send", "first-session", "top-grade", "night-owl", "century"], kai, 3),
  ];

  const none = { count: 0, mine: false, names: [] as string[] };
  const send = (who: Profile, c: Climb, cheers = none): FeedItem => ({ key: `send:${who.id}:${c.id}`, who, isMe: false, at: c.sentAt!, kind: "send", climb: c, cheers });
  const event = (who: Profile, kind: "pin" | "persona" | "session", ref: string, daysAgo: number, data: Record<string, unknown> = {}, cheers = none): FeedItem => ({
    key: `event:${who.id}:${kind}:${ref}`,
    who,
    isMe: false,
    at: now - daysAgo * DAY,
    kind,
    ref,
    data,
    cheers,
  });
  const me: Profile = { id: "me", username: "you", display_name: "You" };
  const mine: FeedItem[] = mySends.slice(0, 2).map((c, i) => ({
    key: `send:me:${c.id}`,
    who: me,
    isMe: true,
    at: c.sentAt ?? c.createdAt,
    kind: "send",
    climb: c,
    cheers: i === 0 ? { count: 3, mine: false, names: ["Maya", "Linh", "Tom"] } : { count: 1, mine: false, names: ["Kai"] },
  }));

  const feed = [
    send(MAYA, maya[0], { count: 2, mine: false, names: ["Tom", "Linh"] }),
    event(MAYA, "session", "s1", 0.15, { gym: GYM, climbs: 9, sends: 6, top: 7 }),
    event(LINH, "pin", "mind-reader", 0.6, {}, { count: 1, mine: false, names: ["Maya"] }),
    send(TOM, tom[0]),
    event(TOM, "persona", "tortoise", 1.2, { to: "tortoise", from: "koala" }, { count: 2, mine: true, names: ["Maya"] }),
    send(LINH, linh[0], { count: 1, mine: true, names: [] }),
    event(KAI, "pin", "century", 2.5),
    send(MAYA, maya[1]),
    send(KAI, kai[0], { count: 4, mine: false, names: ["Maya", "Tom", "Linh"] }),
    event(LINH, "session", "s2", 5, { gym: GYM, climbs: 7, sends: 5, top: 6 }),
    send(TOM, tom[1]),
    ...mine,
  ].sort((a, b) => b.at - a.at);

  return {
    buddies,
    live: [
      { who: MAYA, gym: GYM, startedAt: now - 42 * 60_000, persona: "monkey" },
      { who: KAI, gym: "Boulder Barn", startedAt: now - 15 * 60_000, persona: "gorilla" },
    ],
    feed,
  };
}

export const DEMO_NUDGES: Nudge[] = [
  { id: "demo-n1", who: MAYA, persona: "monkey", text: "just sent your project, the green V5" },
  { id: "demo-n2", who: LINH, persona: "gecko", text: "cheered your send" },
];
