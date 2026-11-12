"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClimbTag } from "@/components/ClimbTag";
import { Sheet } from "@/components/Sheet";
import { endSession, startSession } from "@/lib/db";
import { dayLabel, duration, plural } from "@/lib/format";
import { useData, useNow, type Data } from "@/lib/hooks";
import { climbStats, sessionStats } from "@/lib/stats";
import type { Session } from "@/lib/types";

export default function SessionPage() {
  const data = useData();
  if (!data) return null;
  return data.active ? (
    <ActiveSession data={data} session={data.active} />
  ) : (
    <StartSession data={data} />
  );
}

function StartSession({ data }: { data: Data }) {
  const gyms = useMemo(() => {
    const recent = [...data.sessions].sort((a, b) => b.startedAt - a.startedAt);
    return [...new Set(recent.map((s) => s.gym))];
  }, [data.sessions]);
  const [gym, setGym] = useState<string | null>(null);
  const value = gym ?? gyms[0] ?? "";

  const stats = useMemo(
    () => climbStats(data.climbs, data.attempts),
    [data.climbs, data.attempts],
  );
  const projects = stats
    .filter((s) => s.climb.status === "project")
    .sort((a, b) => (b.lastAt ?? b.climb.createdAt) - (a.lastAt ?? a.climb.createdAt));
  const last = sessionStats(data.sessions, data.climbs, data.attempts)[0];
  const firstRun = data.sessions.length === 0;

  return (
    <main>
      <p className="font-display text-xl font-bold tracking-wide text-tape">
        Tickmark
      </p>
      <h1 className="h-page mt-6">Where are you climbing today?</h1>
      <form
        className="mt-5 flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          startSession(value);
          setGym(null);
        }}
      >
        <label className="sr-only" htmlFor="gym">
          Gym
        </label>
        <input
          id="gym"
          className="field"
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
        <button type="submit" className="btn btn-tape min-h-14 text-lg">
          Start session
        </button>
      </form>

      {firstRun && (
        <div className="panel mt-8">
          <p>
            Log every attempt, not only the sends. One tap for each fall, one
            more for why you came off.
          </p>
          <p className="muted mt-3">
            After a few sessions, Insights shows which styles hold you back,
            why you fall, and how well you read climbs before trying them.
          </p>
          <p className="muted mt-3">
            Want to see it first?{" "}
            <Link href="/settings" className="text-chalk underline underline-offset-4">
              Load demo data in Settings
            </Link>
            .
          </p>
        </div>
      )}

      {last && (
        <section className="mt-8">
          <h2 className="h-section">Last session</h2>
          <p className="muted mt-1">
            {dayLabel(last.session.startedAt)} at {last.session.gym}:{" "}
            {plural(last.climbs, "climb")}, {plural(last.attempts, "attempt")},{" "}
            {plural(last.sends, "send")}.
          </p>
        </section>
      )}

      {projects.length > 0 && (
        <section className="mt-8">
          <h2 className="h-section">Open projects</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {projects.map((s) => (
              <li key={s.climb.id}>
                <ClimbTag
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

  const stats = useMemo(
    () => climbStats(data.climbs, data.attempts),
    [data.climbs, data.attempts],
  );
  const mine = data.attempts.filter((a) => a.sessionId === session.id);
  const fresh = new Set(mine.map((a) => a.id));
  const touched = new Set(mine.map((a) => a.climbId));

  const lastTouch = (climbId: string) =>
    Math.max(0, ...mine.filter((a) => a.climbId === climbId).map((a) => a.at));

  // Climbs worked this session, plus any just added and not yet tried.
  const current = stats
    .filter(
      (s) =>
        touched.has(s.climb.id) ||
        (s.total === 0 &&
          s.climb.createdAt >= session.startedAt &&
          s.climb.status === "project"),
    )
    .sort(
      (a, b) =>
        Math.max(lastTouch(b.climb.id), b.climb.createdAt) -
        Math.max(lastTouch(a.climb.id), a.climb.createdAt),
    );
  const waiting = stats
    .filter(
      (s) =>
        s.climb.status === "project" &&
        s.climb.gym === session.gym &&
        !current.includes(s),
    )
    .sort((a, b) => (b.lastAt ?? 0) - (a.lastAt ?? 0));

  const sends = mine.filter((a) => a.result === "send").length;

  return (
    <main>
      <p className="muted text-sm">
        Session, {duration(now - session.startedAt)} in
      </p>
      <h1 className="h-page mt-1 break-words">{session.gym}</h1>
      <p className="muted mt-2">
        {plural(touched.size, "climb")}, {plural(mine.length, "attempt")},{" "}
        {plural(sends, "send")}
      </p>

      <Link href="/new" className="btn btn-tape mt-5 min-h-16 w-full text-lg">
        Add a climb
      </Link>

      {current.length > 0 ? (
        <section className="mt-8">
          <h2 className="h-section">This session</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {current.map((s) => (
              <li key={s.climb.id}>
                <ClimbTag climb={s.climb} attempts={s.attempts} fresh={fresh} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="muted mt-8">
          Nothing logged yet. Add the first climb you get on, warm-ups included:
          easy flashes are what make the hard grades comparable.
        </p>
      )}

      {waiting.length > 0 && (
        <section className="mt-8">
          <h2 className="h-section">Open projects here</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {waiting.map((s) => (
              <li key={s.climb.id}>
                <ClimbTag
                  climb={s.climb}
                  attempts={s.attempts}
                  note={`Last tried ${dayLabel(s.lastAt ?? s.climb.createdAt).toLowerCase()}`}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        type="button"
        className="btn mt-10 w-full"
        onClick={() => setEnding(true)}
      >
        End session
      </button>

      <Sheet open={ending} onClose={() => setEnding(false)} title="End this session?">
        {mine.length === 0 ? (
          <p className="muted">
            No attempts were logged, so this session will not be kept.
          </p>
        ) : (
          <>
            <label htmlFor="note" className="muted text-sm">
              Anything to remember? Skin, energy, what clicked.
            </label>
            <textarea
              id="note"
              className="field mt-2"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </>
        )}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            className="btn flex-1"
            onClick={() => setEnding(false)}
          >
            Keep climbing
          </button>
          <button
            type="button"
            className="btn btn-tape flex-1"
            onClick={async () => {
              await endSession(session.id, note);
              setEnding(false);
              setNote("");
            }}
          >
            End session
          </button>
        </div>
      </Sheet>
    </main>
  );
}
