"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { AchievementUnlock } from "@/components/AchievementUnlock";
import { Badge } from "@/components/Badge";
import { FeedRow, NudgeToast } from "@/components/Crew";
import { Evolution } from "@/components/Evolution";
import { HoldRain } from "@/components/HoldRain";
import { Sheet } from "@/components/Sheet";
import { Tally } from "@/components/Tally";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { FAIL_REASONS } from "@/lib/constants";
import { PERSONAS, PERSONA_ORDER, personaImage, type PersonaId } from "@/lib/persona";
import { evolveSound, pieceSound, sfx, type Sound } from "@/lib/sfx";
import type { FeedItem } from "@/lib/social";
import { useCountUp } from "@/lib/useCountUp";

/**
 * Animation lab: every celebration, transition and sound in HOLD!, on demand.
 * Nothing here reads or changes the log.
 */
export default function LabPage() {
  const [unlock, setUnlock] = useState<string | null>(null);
  const [evo, setEvo] = useState<{ from: PersonaId | "new"; to: PersonaId; key: number } | null>(null);
  const [from, setFrom] = useState<PersonaId | "new">("gecko");
  const [to, setTo] = useState<PersonaId>("monkey");

  const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

  return (
    <main className="pb-6">
      <Link href="/settings#demo" aria-label="Back to Settings" className="relative flex h-[2.875rem] w-[2.875rem] items-center justify-center rounded-full bg-white">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1E1B3A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 4l-6 6 6 6" />
        </svg>
      </Link>
      <h1 className="h-page mt-4">Animation lab</h1>
      <p className="muted mt-2 text-[0.9375rem] leading-relaxed">
        Every celebration and sound in HOLD!, on demand. Nothing here touches your log. Turn your sound on.
      </p>

      <section className="card mt-5">
        <h2 className="h-card">Achievement unlock</h2>
        <p className="muted mt-1 text-sm">Tap any pin to watch its pieces snap together.</p>
        <button type="button" className="btn btn-ink mt-3 w-full" onClick={() => setUnlock(pick(ACHIEVEMENTS).id)}>
          Play a random one
        </button>
        <ul className="mt-4 grid grid-cols-4 gap-x-1 gap-y-3">
          {ACHIEVEMENTS.map((a) => (
            <li key={a.id}>
              <button type="button" className="flex w-full flex-col items-center" onClick={() => setUnlock(a.id)} aria-label={`Play ${a.name}`}>
                <Badge id={a.id} size={62} />
                <span className="mt-0.5 line-clamp-2 text-center text-[0.6875rem] font-bold leading-tight">{a.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-3">
        <h2 className="h-card">Persona evolution</h2>
        <p className="muted mt-1 text-sm">Pick who evolves into whom.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-sm font-bold">
            From
            <select className="field mt-1 !min-h-12 !py-2" value={from} onChange={(e) => setFrom(e.target.value as PersonaId | "new")}>
              <option value="new">A hold (first time)</option>
              {PERSONA_ORDER.map((id) => (
                <option key={id} value={id}>
                  {PERSONAS[id].name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            To
            <select className="field mt-1 !min-h-12 !py-2" value={to} onChange={(e) => setTo(e.target.value as PersonaId)}>
              {PERSONA_ORDER.map((id) => (
                <option key={id} value={id}>
                  {PERSONAS[id].name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ink" onClick={() => setEvo({ from: from === to ? "new" : from, to, key: Date.now() })}>
            Play
          </button>
          <button
            type="button"
            className="btn btn-soft"
            onClick={() => {
              const a = pick(PERSONA_ORDER);
              let b = pick(PERSONA_ORDER);
              while (b === a) b = pick(PERSONA_ORDER);
              setEvo({ from: a, to: b, key: Date.now() });
            }}
          >
            Surprise me
          </button>
        </div>
      </section>

      <CrewDemo />
      <LogDemo />
      <InsightsDemo />
      <SoundBoard />

      {unlock && <AchievementUnlock key={unlock} id={unlock} onDone={() => setUnlock(null)} />}
      {evo && <Evolution key={evo.key} from={evo.from} to={evo.to} onDone={() => setEvo(null)} />}
    </main>
  );
}

const noop = () => () => {};

const DEMO_FEED: FeedItem[] = [
  {
    key: "a",
    who: { id: "maya", username: "maya", display_name: "Maya" },
    isMe: false,
    at: Date.UTC(2026, 10, 12),
    kind: "send",
    climb: { id: "x", createdAt: 0, gym: "Demo gym", grade: 5, color: "pink", angle: "overhang", holds: ["sloper"], styles: ["compression"], status: "sent", whatWorked: "Toe hook on the volume, then just squeeze." },
    cheers: { count: 2, mine: false, names: ["Tom", "Linh"] },
  },
  { key: "b", who: { id: "tom", username: "tom", display_name: "Tom" }, isMe: false, at: Date.UTC(2026, 10, 11), kind: "pin", ref: "stubborn", cheers: { count: 0, mine: false, names: [] } },
  { key: "c", who: { id: "linh", username: "linh", display_name: "Linh" }, isMe: false, at: Date.UTC(2026, 10, 10), kind: "persona", ref: "gecko", data: { to: "gecko", from: "koala" }, cheers: { count: 1, mine: true, names: [] } },
  { key: "d", who: { id: "me", username: "you", display_name: "You" }, isMe: true, at: Date.UTC(2026, 10, 9), kind: "session", ref: "s", data: { gym: "Demo gym", climbs: 8, sends: 5, top: 6 }, cheers: { count: 2, mine: false, names: ["Maya", "Tom"] } },
];

/** The crew feed, cheers and the banner a buddy's news arrives in, with made-up buddies. */
function CrewDemo() {
  const [items, setItems] = useState(DEMO_FEED);
  const [nudge, setNudge] = useState(0);
  // Dates are shown relative to today, so the list waits for the browser.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  return (
    <section className="card mt-3">
      <h2 className="h-card">Crew</h2>
      <p className="muted mt-1 text-sm">Made-up buddies. Tap a star to cheer; play the banner you get when a buddy sends your project.</p>
      <ul className="-mx-2 mt-3 flex flex-col gap-1 rounded-[1.5rem] bg-wall p-2">
        {mounted && items.map((item) => (
          <FeedRow
            key={item.key}
            item={item}
            onCheer={() =>
              setItems((list) =>
                list.map((i) => (i.key === item.key ? { ...i, cheers: { ...i.cheers, mine: !i.cheers.mine, count: i.cheers.count + (i.cheers.mine ? -1 : 1) } } : i)),
              )
            }
          />
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-ink mt-3 w-full"
        data-sfx="cheer"
        onClick={() => setNudge((n) => n + 1)}
      >
        Play a buddy banner
      </button>
      {nudge > 0 && (
        <NudgeToast
          key={nudge}
          nudge={{ id: String(nudge), who: DEMO_FEED[0].who, persona: "monkey", text: nudge % 2 ? "just sent your project, the pink V5" : "cheered your send" }}
          onClose={() => setNudge(0)}
        />
      )}
    </section>
  );
}

/** Fell, why you fell, and Sent, without saving anything. */
function LogDemo() {
  const [marks, setMarks] = useState<{ id: string; result: "fall" | "send" }[]>([]);
  const [sheet, setSheet] = useState(false);
  const [rain, setRain] = useState(0);
  const sent = marks.some((m) => m.result === "send");
  const add = (result: "fall" | "send") => {
    if (sent) return;
    setMarks((m) => [...m, { id: String(Date.now()), result }]);
    if (result === "fall") setSheet(true);
    else setRain((n) => n + 1);
  };
  return (
    <section className="card mt-3">
      <div className="flex items-baseline justify-between">
        <h2 className="h-card">Logging a climb</h2>
        <button type="button" className="text-sm font-bold underline underline-offset-4" onClick={() => setMarks([])}>
          Start over
        </button>
      </div>
      <p className="muted mt-1 text-sm">Fall a few times, pick reasons, then send.</p>
      <div className="mt-4 flex min-h-10 items-center">
        <Tally attempts={marks} size={26} animateLast pending={!sent} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <button type="button" className="btn btn-outline display min-h-16 text-xl" data-sfx="fall" onClick={() => add("fall")}>
          Fell
        </button>
        <button type="button" className="cta cta-center display min-h-16 text-xl" data-sfx="send" onClick={() => add("send")}>
          Sent
        </button>
      </div>
      {rain > 0 && <HoldRain key={rain} />}
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Why did you come off?">
        <div className="grid grid-cols-2 gap-2.5">
          {FAIL_REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className="chip min-h-14 justify-center text-[0.9375rem] font-bold"
              style={{ background: r.color }}
              data-sfx="reason"
              onClick={() => setSheet(false)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Sheet>
    </section>
  );
}

function Count({ to, suffix = "" }: { to: number; suffix?: string }) {
  return (
    <>
      {useCountUp(to)}
      {suffix}
    </>
  );
}

/** Numbers counting up and bars growing, as on Insights. */
function InsightsDemo() {
  const [run, setRun] = useState(0);
  return (
    <section className="card mt-3">
      <div className="flex items-baseline justify-between">
        <h2 className="h-card">Insights</h2>
        <button type="button" className="text-sm font-bold underline underline-offset-4" onClick={() => setRun((n) => n + 1)}>
          Replay
        </button>
      </div>
      <div key={run}>
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-[1.25rem] bg-wall px-4 py-3">
            <dt className="muted text-sm font-semibold">Sends</dt>
            <dd className="display text-[2rem]">
              <Count to={48} />
            </dd>
          </div>
          <div className="rounded-[1.25rem] bg-wall px-4 py-3">
            <dt className="muted text-sm font-semibold">Flash rate</dt>
            <dd className="display text-[2rem]">
              <Count to={27} suffix="%" />
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-col gap-2.5">
          {[
            ["Slab", 82, "#3FC998"],
            ["Overhang", 58, "#FFA45C"],
            ["Roof", 34, "#B79BFF"],
          ].map(([label, w, c]) => (
            <div key={label as string}>
              <span className="text-sm font-semibold">{label}</span>
              <div className="mt-1 h-2.5 rounded-full bg-wall">
                <div className="grow-x h-2.5 rounded-full" style={{ width: `${w}%`, background: c as string }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const SOUNDS: { id: Sound | "piece" | "evolve"; label: string }[] = [
  { id: "tap", label: "Tap" },
  { id: "nav", label: "Tab bar" },
  { id: "fall", label: "Fell" },
  { id: "reason", label: "Reason" },
  { id: "send", label: "Sent" },
  { id: "sheet", label: "Sheet" },
  { id: "save", label: "Save" },
  { id: "piece", label: "Pin pieces" },
  { id: "clink", label: "Rim clink" },
  { id: "achievement", label: "Achievement" },
  { id: "evolve", label: "Evolving" },
  { id: "persona", label: "Persona" },
];

function SoundBoard() {
  const play = (id: (typeof SOUNDS)[number]["id"]) => {
    if (id === "piece") [0, 1, 2, 3, 4].forEach((i) => setTimeout(() => pieceSound(i), i * 90));
    else if (id === "evolve") {
      evolveSound("start");
      for (let i = 0; i < 14; i++) setTimeout(() => evolveSound(i), 400 + i * 120);
    } else sfx(id);
  };
  return (
    <section className="card mt-3">
      <h2 className="h-card">Sounds</h2>
      <p className="muted mt-1 text-sm">The Sound switch in Settings turns all of these off.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {SOUNDS.map((s) => (
          <button key={s.id} type="button" className="btn btn-soft min-h-12 px-2 text-sm" data-sfx="none" onClick={() => play(s.id)}>
            {s.label}
          </button>
        ))}
      </div>
      <p className="muted mt-4 flex items-center gap-2 text-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={personaImage("owl")} alt="" width={36} height={36} />
        Tip: open a climb in a real session to hear them in context.
      </p>
    </section>
  );
}
