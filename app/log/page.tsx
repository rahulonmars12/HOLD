"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Chips } from "@/components/Chips";
import { ClimbTag } from "@/components/ClimbTag";
import { ConfirmButton } from "@/components/ConfirmButton";
import { gradeLabel } from "@/lib/constants";
import { deleteSession } from "@/lib/db";
import { dayLabel, duration, plural } from "@/lib/format";
import { useData } from "@/lib/hooks";
import { climbStats, sessionStats } from "@/lib/stats";

type View = "sessions" | "climbs";
type Status = "project" | "sent" | "retired";

const VIEWS: { id: View; label: string }[] = [
  { id: "sessions", label: "Sessions" },
  { id: "climbs", label: "Climbs" },
];
const STATUSES: { id: Status; label: string }[] = [
  { id: "project", label: "Open" },
  { id: "sent", label: "Sent" },
  { id: "retired", label: "Retired" },
];

export default function LogPage() {
  const data = useData();
  const [view, setView] = useState<View>("sessions");
  const [status, setStatus] = useState<Status>("project");
  const [openId, setOpenId] = useState<string | null>(null);

  const stats = useMemo(
    () => (data ? climbStats(data.climbs, data.attempts) : []),
    [data],
  );
  const sessions = useMemo(
    () => (data ? sessionStats(data.sessions, data.climbs, data.attempts) : []),
    [data],
  );
  if (!data) return null;

  const statOf = new Map(stats.map((s) => [s.climb.id, s]));
  const climbs = stats
    .filter((s) => s.climb.status === status)
    .sort(
      (a, b) =>
        (b.lastAt ?? b.climb.createdAt) - (a.lastAt ?? a.climb.createdAt),
    );

  return (
    <main>
      <h1 className="h-page">Log</h1>
      <div className="mt-4">
        <Chips
          label="View"
          options={VIEWS}
          value={[view]}
          onChange={(v) => v[0] && setView(v[0])}
        />
      </div>

      {view === "sessions" &&
        (sessions.length === 0 ? (
          <Empty />
        ) : (
          <ul className="mt-5 flex flex-col gap-3">
            {sessions.map((s) => {
              const open = openId === s.session.id;
              const live = s.session.endedAt === undefined;
              return (
                <li key={s.session.id} className="panel">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 text-left"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : s.session.id)}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {dayLabel(s.session.startedAt)}
                        {live && <span className="text-tape"> (in progress)</span>}
                      </span>
                      <span className="muted block truncate text-sm">
                        {s.session.gym}
                        {s.session.endedAt &&
                          `, ${duration(s.session.endedAt - s.session.startedAt)}`}
                      </span>
                      <span className="mt-2 block text-sm">
                        {plural(s.climbs, "climb")}, {plural(s.attempts, "attempt")},{" "}
                        {plural(s.sends, "send")}
                      </span>
                    </span>
                    {s.topSend !== null && (
                      <span className="shrink-0 text-right">
                        <span className="grade block text-4xl">
                          {gradeLabel(s.topSend)}
                        </span>
                        <span className="muted text-xs">top send</span>
                      </span>
                    )}
                  </button>
                  {open && (
                    <div className="mt-4 border-t border-mat-3 pt-4">
                      {s.session.note && (
                        <p className="mb-4 whitespace-pre-wrap">{s.session.note}</p>
                      )}
                      <ul className="flex flex-col gap-2">
                        {s.climbIds.map((id) => {
                          const stat = statOf.get(id);
                          if (!stat) return null;
                          const here = stat.attempts.filter(
                            (a) => a.sessionId === s.session.id,
                          );
                          return (
                            <li key={id} className="rounded-xl ring-1 ring-mat-3">
                              <ClimbTag climb={stat.climb} attempts={here} />
                            </li>
                          );
                        })}
                      </ul>
                      {!live && (
                        <div className="mt-4">
                          <ConfirmButton
                            label="Delete session"
                            confirmLabel="Tap again to delete its attempts"
                            onConfirm={() => deleteSession(s.session.id)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ))}

      {view === "climbs" && (
        <>
          <div className="mt-3">
            <Chips
              label="Status"
              options={STATUSES}
              value={[status]}
              onChange={(v) => v[0] && setStatus(v[0])}
            />
          </div>
          {climbs.length === 0 ? (
            <p className="muted mt-6">
              {status === "project"
                ? "No open projects."
                : status === "sent"
                  ? "No sends logged yet."
                  : "No retired climbs."}
            </p>
          ) : (
            <ul className="mt-5 flex flex-col gap-2">
              {climbs.map((s) => (
                <li key={s.climb.id}>
                  <ClimbTag
                    climb={s.climb}
                    attempts={s.attempts}
                    note={`${s.climb.gym}, ${dayLabel(s.lastAt ?? s.climb.createdAt).toLowerCase()}`}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}

function Empty() {
  return (
    <div className="mt-6">
      <p className="muted">
        No sessions yet. Each session you log shows up here with its climbs and
        attempts.
      </p>
      <Link href="/" className="btn btn-tape mt-4">
        Start a session
      </Link>
    </div>
  );
}
