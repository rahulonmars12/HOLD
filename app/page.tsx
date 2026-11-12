"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ClimbRow, ClimbTile } from "@/components/ClimbCards";
import { Cta } from "@/components/Cta";
import { CornerHold } from "@/components/Hold";
import { Sheet } from "@/components/Sheet";
import { gradeLabel, gymKey } from "@/lib/constants";
import { db, endSession, getMeta, startSession } from "@/lib/db";
import { dayLabel, duration, plural } from "@/lib/format";
import { useData, useNow, type Data } from "@/lib/hooks";
import { climbingNow, nameOf, type LiveSession } from "@/lib/social";
import { climbStats, sessionStats } from "@/lib/stats";
import { usePersona, usePersonaReveal } from "@/lib/usePersona";
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

  if (!data || onboarded === undefined || needsWelcome) return null;
  if (data.active) return <ActiveSession data={data} session={data.active} />;
  return <StartSession data={data} />;
}

function GymForm({ gyms, label, cta }: { gyms: string[]; label: string; cta: string }) {
  const [gym, setGym] = useState<string | null>(null);
  const value = gym ?? gyms[0] ?? "";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void startSession(value);
        setGym(null);
      }}
    >
      <label htmlFor="gym" className="label">
        {label}
      </label>
      <input
        id="gym"
        className="field field-white mt-2"
        placeholder="Gym name"
        list="gyms"
        autoComplete="off"
        value={value}
        onChange={(e) => setGym(e.target.value)}
      />
      <datalist id="gyms">
        {gyms.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
      <Cta type="submit" className="mt-3">
        {cta}
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
  const lastTop = last?.topSend ?? null;

  return (
    <main>
      <CornerHold kind="jug" fill="#FFDD55" shade="#E8BE2A" />
      <p className="muted relative text-[0.9375rem] font-semibold">
        {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
      </p>
      <h1 className="h-page relative mt-1.5">
        Ready to
        <br />
        climb?
      </h1>

      <div className="card relative mt-5">
        <GymForm gyms={gyms} label="Where are you climbing?" cta="Start session" />
      </div>
      <PersonaWatch data={data} />
      <BuddiesNow />

      {last && (
        <section className="mt-7">
          <h2 className="h-card">Last session</h2>
          <Link href="/log" className="mt-3 flex items-center gap-3.5 rounded-[1.75rem] bg-white py-4 pl-5 pr-4">
            <span className="min-w-0 flex-1">
              <span className="block font-bold">
                {dayLabel(last.session.startedAt)} at {last.session.gym}
              </span>
              <span className="muted mt-1 block text-[0.9375rem]">
                {plural(last.climbs, "climb")}, {plural(last.attempts, "attempt")}, {plural(last.sends, "send")}
              </span>
            </span>
            {lastTop !== null && (
              <span className="flex h-16 w-16 flex-none flex-col items-center justify-center rounded-full bg-sun">
                <span className="display text-xl leading-none">{gradeLabel(lastTop)}</span>
                <span className="text-[0.6875rem] font-bold">top send</span>
              </span>
            )}
          </Link>
        </section>
      )}

      {projects.length > 0 && (
        <section className="mt-7">
          <div className="flex items-center gap-2.5">
            <h2 className="h-card">Open projects</h2>
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-ink px-2 text-sm font-bold text-white">
              {projects.length}
            </span>
          </div>
          <p className="muted mt-1 text-[0.9375rem]">Unsent climbs carry over until you send or retire them.</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {projects.map((s) => (
              <li key={s.climb.id}>
                <ClimbRow
                  climb={s.climb}
                  attempts={s.attempts}
                  note={`${s.climb.gym}, last tried ${dayLabel(s.lastAt ?? s.climb.createdAt).toLowerCase()}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function ActiveSession({ data, session }: { data: Data; session: Session }) {
  const now = useNow();
  const [ending, setEnding] = useState(false);
  const [note, setNote] = useState("");

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
  const sends = mine.filter((a) => a.result === "send");
  const topToday = Math.max(
    -1,
    ...sends.map((a) => data.climbs.find((c) => c.id === a.climbId)?.grade ?? -1),
  );

  return (
    <main>
      <CornerHold kind="jug" fill="#FFDD55" shade="#E8BE2A" />
      <p className="muted relative flex items-center gap-2 text-[0.9375rem] font-semibold">
        <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-mint-deep" />
        Session, {duration(now - session.startedAt)} in
      </p>
      <h1 className="h-page relative mt-1.5 max-w-[15rem] break-words">{session.gym}</h1>
      <ul className="relative mt-4 flex flex-wrap gap-2 text-[0.9375rem] font-semibold">
        <li className="flex h-[2.375rem] items-center rounded-full bg-white px-3.5">{plural(touched.size, "climb")}</li>
        <li className="flex h-[2.375rem] items-center rounded-full bg-white px-3.5">{plural(mine.length, "attempt")}</li>
        <li className="flex h-[2.375rem] items-center rounded-full bg-white px-3.5">{plural(sends.length, "send")}</li>
      </ul>
      <BuddiesNow gym={session.gym} />

      <Cta href="/new" plus className="relative mt-4">
        Add a climb
      </Cta>

      {current.length > 0 ? (
        <section className="mt-7">
          <h2 className="h-card">This session</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {current.map((s) => (
              <ClimbTile key={s.climb.id} climb={s.climb} attempts={s.attempts.filter((a) => a.sessionId === session.id)} />
            ))}
          </div>
        </section>
      ) : (
        <p className="muted mt-7 leading-relaxed">
          Nothing logged yet. Add the first climb you get on, warm-ups included: easy flashes are what make the hard
          grades comparable.
        </p>
      )}

      {waiting.length > 0 && (
        <section className="mt-7">
          <h2 className="h-card">Open projects here</h2>
          <p className="muted mt-1 text-[0.9375rem]">From earlier sessions at this gym.</p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {waiting.map((s) => (
              <li key={s.climb.id}>
                <ClimbRow
                  climb={s.climb}
                  attempts={s.attempts}
                  note={`Last tried ${dayLabel(s.lastAt ?? s.climb.createdAt).toLowerCase()}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <button type="button" className="btn btn-outline mt-6 w-full" onClick={() => setEnding(true)}>
        End session
      </button>

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
              await endSession(session.id, note);
              setEnding(false);
              setNote("");
            }}
          >
            End session
          </Cta>
        </div>
      </Sheet>
    </main>
  );
}

/** Shows the persona reveal after a session if it is new or has changed. */
function PersonaWatch({ data }: { data: Data }) {
  usePersonaReveal(usePersona(data));
  return null;
}
