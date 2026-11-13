"use client";

import { Loading } from "@/components/Loading";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GradeChip, describeClimb } from "@/components/ClimbCards";
import { OnClimb, SessionClock } from "@/components/OnClimb";
import { FallCount } from "@/components/Tally";
import { setCurrentClimb, useCurrentClimb } from "@/lib/current";
import { Cta } from "@/components/Cta";
import { CornerHold } from "@/components/Hold";
import { Sheet } from "@/components/Sheet";
import { gradeLabel, gymKey } from "@/lib/constants";
import { addClimb, db, endSession, getMeta, logAttempt, startSession } from "@/lib/db";
import { dayLabel, plural } from "@/lib/format";
import { useData, useNow, type Data } from "@/lib/hooks";
import { climbingNow, nameOf, type LiveSession } from "@/lib/social";
import { climbStats, sessionStats } from "@/lib/stats";
import { usePersona, usePersonaReveal } from "@/lib/usePersona";
import { MissionCard } from "@/components/MissionCard";
import { Companion } from "@/components/Companion";
import { PERSONAS } from "@/lib/persona";
import { greeting, homeLine, homeTitle, sessionLine } from "@/lib/voice";
import { useAuth } from "@/lib/supabase";
import type { Session } from "@/lib/types";

export default function SessionPage() {
  const data = useData();
  const onboarded = useLiveQuery(async () => (await getMeta<boolean>("onboarded")) ?? false, []);
  const router = useRouter();
  const fresh = data !== undefined && data.sessions.length === 0 && data.climbs.length === 0;
  const needsWelcome = fresh && onboarded === false;

  useEffect(() => {
    if (!needsWelcome) return;
    // Next keeps visited pages alive in the background, so this can run with
    // stale data; check the database again before redirecting.
    let alive = true;
    (async () => {
      const [sessions, climbs, done] = await Promise.all([
        db.sessions.count(),
        db.climbs.count(),
        getMeta<boolean>("onboarded"),
      ]);
      if (alive && sessions === 0 && climbs === 0 && !done) router.replace("/welcome");
    })();
    return () => {
      alive = false;
    };
  }, [needsWelcome, router]);

  if (!data || onboarded === undefined || needsWelcome) return <Loading />;
  if (data.active) return <ActiveSession data={data} session={data.active} />;
  return <StartSession data={data} />;
}

/** Pick a gym and go: recent gyms as chips, or type a new one. Pinned above the tab bar. */
function StartCard({ gyms, picked, onPick }: { gyms: string[]; picked: string; onPick: (gym: string) => void }) {
  const [typing, setTyping] = useState(gyms.length === 0);
  const value = picked.trim();
  return (
    <form
      className="card shadow-[0_8px_24px_rgb(30_27_58/0.14)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (value) void startSession(value);
      }}
    >
      <h2 className="h-card" id="where">
        Where today?
      </h2>
      {gyms.length > 0 && (
        <div role="group" aria-labelledby="where" className="mt-3 flex flex-wrap gap-2">
          {gyms.slice(0, 3).map((g) => (
            <button
              key={g}
              type="button"
              className="chip max-w-full"
              aria-pressed={!typing && gymKey(g) === gymKey(picked)}
              onClick={() => {
                setTyping(false);
                onPick(g);
              }}
            >
              <span className="truncate">{g}</span>
            </button>
          ))}
          <button
            type="button"
            className="chip"
            aria-pressed={typing}
            onClick={() => {
              setTyping(true);
              onPick("");
            }}
          >
            Other gym
          </button>
        </div>
      )}
      {typing && (
        <>
          <label htmlFor="gym" className="sr-only">
            Gym name
          </label>
          <input
            id="gym"
            className="field mt-3"
            placeholder="Gym name"
            autoComplete="off"
            value={picked}
            onChange={(e) => onPick(e.target.value)}
          />
        </>
      )}
      <Cta type="submit" className="mt-3" disabled={!value}>
        Start session
      </Cta>
    </form>
  );
}

function BuddiesNow({ gym }: { gym?: string }) {
  const auth = useAuth();
  const [live, setLive] = useState<LiveSession[]>([]);
  useEffect(() => {
    if (!auth) return;
    let alive = true;
    climbingNow()
      .then((l) => alive && setLive(l))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [auth]);
  const shown = gym ? live.filter((l) => gymKey(l.session.gym) === gymKey(gym)) : live;
  if (shown.length === 0) return null;
  return (
    <Link href="/buddies" className="mt-3 flex items-center gap-3 rounded-[1.5rem] bg-white px-4 py-3">
      <span aria-hidden className="h-2.5 w-2.5 flex-none rounded-full bg-mint-deep" />
      <span className="text-[0.9375rem] font-semibold">
        {shown.length === 1
          ? `${nameOf(shown[0].who)} is climbing ${gym ? "here" : `at ${shown[0].session.gym}`} now`
          : `${shown.length} buddies are climbing ${gym ? "here" : ""} now`}
      </span>
    </Link>
  );
}

function StartSession({ data }: { data: Data }) {
  const gyms = useMemo(() => {
    const recent = [...data.sessions].sort((a, b) => b.startedAt - a.startedAt);
    return [...new Set(recent.map((s) => s.gym))];
  }, [data.sessions]);
  const stats = useMemo(() => climbStats(data.climbs, data.attempts), [data.climbs, data.attempts]);
  const projects = stats
    .filter((s) => s.climb.status === "project")
    .sort((a, b) => (b.lastAt ?? b.climb.createdAt) - (a.lastAt ?? a.climb.createdAt));
  const last = sessionStats(data.sessions, data.climbs, data.attempts)[0];
  const now = useNow();
  const day = Math.floor(now / 86_400_000);
  const persona = usePersona(data);
  usePersonaReveal(persona);
  const personaId = persona?.ready ? persona.persona.id : undefined;
  const [gym, setGym] = useState<string | null>(null);
  const picked = gym ?? gyms[0] ?? "";
  // The closest projects at the gym you're about to climb at: fewest falls first.
  const here = projects.filter((p) => picked && gymKey(p.climb.gym) === gymKey(picked));
  const waiting = (here.length > 0 ? here : projects).slice().sort((a, b) => a.total - b.total || (b.lastAt ?? 0) - (a.lastAt ?? 0));

  return (
    <main className="pb-[19rem]">
      <CornerHold kind="jug" fill="#FFDD55" shade="#E8BE2A" />
      <p className="muted relative text-[0.9375rem] font-semibold">
        {greeting(new Date(now), personaId ? PERSONAS[personaId].name : undefined)}{" "}
        {new Date(now).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <h1 className="h-page relative mt-1.5 max-w-[14rem]">{homeTitle(day)}</h1>
      <Companion
        persona={personaId}
        line={homeLine(day, {
          projects: projects.length,
          daysSince: last ? Math.floor((now - last.session.startedAt) / 86_400_000) : undefined,
        })}
        className="relative mt-4"
      />
      <BuddiesNow />

      {waiting.length > 0 && (
        <section className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="h-card">Waiting for you</h2>
            <Link href="/log" className="flex-none text-sm font-bold underline underline-offset-4">
              All {projects.length} in Log
            </Link>
          </div>
          <p className="muted mt-1 text-sm">
            {here.length > 0 ? `Your closest projects at ${picked}.` : "Your closest projects."}
          </p>
          <ul className="mt-3 grid grid-cols-3 gap-2.5">
            {waiting.slice(0, 3).map((s) => (
              <li key={s.climb.id}>
                <Link href={`/climb?id=${s.climb.id}`} className="flex h-full flex-col gap-2 rounded-[1.5rem] bg-white p-3">
                  <GradeChip climb={s.climb} size={44} />
                  <span className="line-clamp-2 text-[0.8125rem] font-bold leading-tight">
                    {s.climb.name || describeClimb(s.climb).split(",").slice(0, 2).join(",")}
                  </span>
                  <span className="muted mt-auto text-xs">{plural(s.total, "fall")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-10 px-5">
        <div className="mx-auto max-w-md">
          <StartCard gyms={gyms} picked={picked} onPick={setGym} />
        </div>
      </div>
    </main>
  );
}

function ActiveSession({ data, session }: { data: Data; session: Session }) {
  const now = useNow();
  const router = useRouter();
  const persona = usePersona(data);
  const personaId = persona?.ready ? persona.persona.id : undefined;
  const [ending, setEnding] = useState(false);
  const [note, setNote] = useState("");
  const [warming, setWarming] = useState(false);
  const [warmed, setWarmed] = useState(0);

  const stats = useMemo(() => climbStats(data.climbs, data.attempts), [data.climbs, data.attempts]);
  const mine = data.attempts.filter((a) => a.sessionId === session.id);
  const touched = new Set(mine.map((a) => a.climbId));
  const lastTouch = (climbId: string) =>
    Math.max(0, ...mine.filter((a) => a.climbId === climbId).map((a) => a.at));

  const current = stats
    .filter(
      (s) =>
        touched.has(s.climb.id) ||
        (s.total === 0 && s.climb.createdAt >= session.startedAt && s.climb.status === "project"),
    )
    .sort(
      (a, b) =>
        Math.max(lastTouch(b.climb.id), b.climb.createdAt) - Math.max(lastTouch(a.climb.id), a.climb.createdAt),
    );
  const waiting = stats
    .filter((s) => s.climb.status === "project" && gymKey(s.climb.gym) === gymKey(session.gym) && !current.includes(s))
    .sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0));
  const topEver = Math.max(0, ...stats.filter((x) => x.sent).map((x) => x.climb.grade));
  const sends = mine.filter((a) => a.result === "send");
  const topToday = Math.max(
    -1,
    ...sends.map((a) => data.climbs.find((c) => c.id === a.climbId)?.grade ?? -1),
  );

  const currentId = useCurrentClimb();
  const onWall = stats.find((x) => x.climb.id === currentId && x.climb.status === "project");
  const [picking, setPicking] = useState(false);
  const lastMine = mine[mine.length - 1];

  return (
    <main className="pb-[13.5rem]">
      {onWall && <OnClimb stat={onWall} session={session} persona={personaId} />}
      <CornerHold kind="jug" fill="#FFDD55" shade="#E8BE2A" />
      <p className="muted relative flex max-w-[15rem] items-center gap-2 text-[0.9375rem] font-semibold">
        <span aria-hidden className="h-2.5 w-2.5 flex-none rounded-full bg-mint-deep" />
        <span className="truncate">{session.gym}</span>
      </p>
      <h1 className="display relative mt-1 text-[3.375rem] leading-none tracking-[-0.03em] tabular-nums">
        <SessionClock since={session.startedAt} />
      </h1>
      <ul className="relative mt-4 flex flex-wrap gap-2 text-[0.9375rem] font-semibold">
        <li className="flex h-[2.375rem] items-center rounded-full bg-white px-3.5">{plural(touched.size, "climb")}</li>
        <li className="flex h-[2.375rem] items-center rounded-full bg-white px-3.5">{plural(mine.length, "go", "goes")}</li>
        <li className={`flex h-[2.375rem] items-center rounded-full px-3.5 ${sends.length > 0 ? "bg-mint" : "bg-white"}`}>{plural(sends.length, "send")}</li>
      </ul>
      <Companion
        persona={personaId}
        mood={lastMine?.result === "send" ? "ready" : "idle"}
        line={sessionLine(mine.length, { climbs: touched.size, sends: sends.length, falls: mine.length - sends.length })}
        className="relative mt-4"
      />
      <BuddiesNow gym={session.gym} />
      <MissionCard data={data} now={now} className="mt-4" />

      {current.length > 0 ? (
        <section className="mt-6">
          <h2 className="h-card">This session</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {current.map((s) => {
              const open = s.climb.status === "project";
              const here = s.attempts.filter((a) => a.sessionId === session.id);
              const row = (
                <>
                  <GradeChip climb={s.climb} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-bold">{s.climb.name || describeClimb(s.climb)}</span>
                    {open && <span className="muted block truncate text-[0.8125rem]">{here.length === 0 ? "Not tried yet. Tap to start" : "Moved on. Tap to go again"}</span>}
                  </span>
                  {s.flash ? <span className="text-sm font-bold">Flashed</span> : here.length > 0 && <FallCount attempts={here} />}
                </>
              );
              const cls = "flex w-full items-center gap-3.5 rounded-[1.5rem] bg-white py-2 pl-2 pr-4 text-left active:opacity-80";
              return (
                <li key={s.climb.id}>
                  {open ? (
                    <button type="button" className={cls} onClick={() => setCurrentClimb(s.climb.id)}>
                      {row}
                    </button>
                  ) : (
                    <Link href={`/climb?id=${s.climb.id}`} className={cls}>
                      {row}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <p className="muted mt-6 text-[0.9375rem] leading-relaxed">
          Log everything, warm-ups too. Easy flashes are what make your hard grades mean something.
        </p>
      )}

      <button type="button" className="btn btn-outline mt-5 w-full" onClick={() => setEnding(true)}>
        End session
      </button>

      <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-10 bg-gradient-to-b from-wall/0 via-wall via-[30%] to-wall px-5 pt-6">
        <div className="mx-auto max-w-md">
          <div className={`grid gap-2.5 ${waiting.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
            <button type="button" className="btn min-h-[3.125rem] bg-white" onClick={() => setWarming(true)}>
              Quick warm-up
            </button>
            {waiting.length > 0 && (
              <button type="button" className="btn min-h-[3.125rem] bg-white" onClick={() => setPicking(true)}>
                Old projects ({waiting.length})
              </button>
            )}
          </div>
          <Cta href="/new" plus className="mt-2.5">
            Add a climb
          </Cta>
        </div>
      </div>

      <Sheet open={picking} onClose={() => setPicking(false)} title="Old projects here">
        <p className="muted -mt-2 text-[0.9375rem]">Unsent climbs from earlier sessions at this gym. Tap one to get back on it.</p>
        <ul className="mt-4 flex flex-col gap-2">
          {waiting.map((s) => (
            <li key={s.climb.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3.5 rounded-[1.5rem] bg-wall py-2 pl-2 pr-4 text-left"
                onClick={() => {
                  setPicking(false);
                  setCurrentClimb(s.climb.id);
                }}
              >
                <GradeChip climb={s.climb} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-bold">{s.climb.name || describeClimb(s.climb)}</span>
                  <span className="muted block truncate text-[0.8125rem]">Last tried {dayLabel(s.lastAt ?? s.climb.createdAt).toLowerCase()}</span>
                </span>
                <FallCount attempts={s.attempts} />
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <Sheet open={warming} onClose={() => setWarming(false)} title="Quick warm-up">
        <p className="muted -mt-2 text-[0.9375rem]">Tap a grade to log a flash. No tags, no fuss.</p>
        <div className="mt-4 grid grid-cols-4 gap-2.5">
          {Array.from({ length: Math.max(4, Math.min(8, topEver)) }, (_, g) => (
            <button
              key={g}
              type="button"
              data-sfx="send"
              className="display flex h-16 items-center justify-center rounded-[1.25rem] bg-wall text-lg active:scale-95"
              onClick={async () => {
                // Reuse the last warm-up's look so the tags stay consistent.
                const lastWarm = data.climbs.filter((c) => c.name === "Warm-up").sort((a, b) => b.createdAt - a.createdAt)[0];
                const climb = await addClimb({
                  gym: session.gym,
                  grade: g,
                  color: lastWarm?.color ?? "yellow",
                  angle: lastWarm?.angle ?? "vertical",
                  holds: lastWarm?.holds ?? ["jug"],
                  styles: [],
                  name: "Warm-up",
                  plan: "",
                });
                await logAttempt(climb.id, session.id, "send");
                setWarmed((n) => n + 1);
              }}
            >
              {gradeLabel(g)}
            </button>
          ))}
        </div>
        <p role="status" className="mt-3 min-h-5 text-sm font-bold">
          {warmed > 0 ? `${plural(warmed, "warm-up")} logged. Keep tapping or close.` : ""}
        </p>
        <button
          type="button"
          className="btn btn-outline mt-2 w-full"
          onClick={() => {
            setWarming(false);
            setWarmed(0);
          }}
        >
          Done
        </button>
      </Sheet>

      <Sheet open={ending} onClose={() => setEnding(false)} title="End this session?">
        {mine.length === 0 ? (
          <p className="muted">No attempts were logged, so this session won&apos;t be kept.</p>
        ) : (
          <>
            <dl className="grid grid-cols-4 gap-1.5 text-center">
              {[
                [Math.round((now - session.startedAt) / 60000), "minutes"],
                [touched.size, "climbs"],
                [mine.length, "attempts"],
              ].map(([n, l]) => (
                <div key={l} className="rounded-[1.25rem] bg-wall px-1 py-2.5">
                  <dd className="display text-xl">{n}</dd>
                  <dt className="muted text-xs font-semibold">{l}</dt>
                </div>
              ))}
              <div className="rounded-[1.25rem] bg-mint px-1 py-2.5">
                <dd className="display text-xl">{sends.length}</dd>
                <dt className="text-xs font-bold">sends</dt>
              </div>
            </dl>
            {topToday >= 0 && (
              <p className="muted mt-3 pl-1 text-[0.9375rem]">
                Top send today: <strong className="text-ink">{gradeLabel(topToday)}</strong>
              </p>
            )}
            <label htmlFor="note" className="label mt-4">
              Anything to remember?
            </label>
            <textarea
              id="note"
              className="field mt-2"
              rows={3}
              placeholder="Skin, energy, what clicked"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </>
        )}
        <div className="mt-4 flex gap-2.5">
          <button type="button" className="btn btn-outline flex-1 min-h-14" onClick={() => setEnding(false)}>
            Keep climbing
          </button>
          <Cta
            bare
            sfx="save"
            className="flex-1 !min-h-14"
            onClick={async () => {
              const logged = mine.length > 0;
              await endSession(session.id, note);
              setEnding(false);
              setNote("");
              // A session with climbing in it gets a proper send-off.
              if (logged) router.push(`/recap?s=${session.id}`);
            }}
          >
            End session
          </Cta>
        </div>
      </Sheet>
    </main>
  );
}

