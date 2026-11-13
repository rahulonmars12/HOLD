"use client";

import { Loading } from "@/components/Loading";
import { useMemo, useState } from "react";
import { ClimbRow, GradeChip, describeClimb } from "@/components/ClimbCards";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Cta } from "@/components/Cta";
import { CornerHold } from "@/components/Hold";
import { FallCount } from "@/components/Tally";
import { gradeLabel, holdHex, isDark } from "@/lib/constants";
import { deleteSession } from "@/lib/db";
import { dayLabel, duration, plural } from "@/lib/format";
import { useData } from "@/lib/hooks";
import { climbStats, sessionStats } from "@/lib/stats";
import Link from "next/link";

type View = "projects" | "sessions" | "climbs";
type Status = "project" | "sent" | "retired";

const STATUSES: { id: Status; label: string }[] = [
  { id: "sent", label: "Sent" },
  { id: "retired", label: "Retired" },
];

export default function LogPage() {
  const data = useData();
  const [view, setView] = useState<View>("projects");
  const [status, setStatus] = useState<Status>("sent");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => (data ? climbStats(data.climbs, data.attempts) : []), [data]);
  const sessions = useMemo(
    () => (data ? sessionStats(data.sessions, data.climbs, data.attempts) : []),
    [data],
  );
  if (!data) return <Loading />;

  const statOf = new Map(stats.map((s) => [s.climb.id, s]));
  const climbs = stats
    .filter((s) => s.climb.status === status)
    .sort((a, b) => (b.lastAt ?? b.climb.createdAt) - (a.lastAt ?? a.climb.createdAt));
  const counts = Object.fromEntries(
    STATUSES.map((s) => [s.id, stats.filter((x) => x.climb.status === s.id).length]),
  ) as Record<Status, number>;

  // Climbs in the selected status, grouped by the day they were last tried.
  const byDay: { day: string; items: typeof climbs }[] = [];
  for (const s of climbs) {
    const day = dayLabel(s.climb.status === "sent" ? (s.sentAt ?? s.climb.createdAt) : (s.lastAt ?? s.climb.createdAt));
    const group = byDay.find((g) => g.day === day);
    if (group) group.items.push(s);
    else byDay.push({ day, items: [s] });
  }

  return (
    <main>
      <CornerHold kind="pinch" fill="#5FDDB0" shade="#3FC998" rotate={38} size={240} right={-70} top={-90} />
      <h1 className="h-page relative">Log</h1>
      <div role="group" aria-label="View" className="segmented relative mt-4">
        <button type="button" aria-pressed={view === "projects"} onClick={() => setView("projects")}>
          Projects
        </button>
        <button type="button" aria-pressed={view === "sessions"} onClick={() => setView("sessions")}>
          Sessions
        </button>
        <button type="button" aria-pressed={view === "climbs"} onClick={() => setView("climbs")}>
          Climbs
        </button>
      </div>

      {view === "projects" && <Projects stats={stats} last={sessions.find((x) => x.session.endedAt !== undefined)} />}

      {view === "sessions" &&
        (sessions.length === 0 ? (
          <div className="mt-6">
            <p className="muted">No sessions yet. Each session you log shows up here with its climbs and attempts.</p>
            <Cta href="/" className="mt-4">
              Start a session
            </Cta>
          </div>
        ) : (
          <ul className="mt-5 flex flex-col gap-2.5">
            {sessions.map((s) => {
              const open = openId === s.session.id;
              const live = s.session.endedAt === undefined;
              const top = s.topSend;
              const topClimb =
                top === null
                  ? undefined
                  : data.climbs.find((c) => s.climbIds.includes(c.id) && c.grade === top && c.status === "sent");
              const ids = open && !showAll ? s.climbIds.slice(0, 5) : s.climbIds;
              return (
                <li key={s.session.id} className="rounded-[1.75rem] bg-white">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3.5 py-4 pl-5 pr-4 text-left"
                    aria-expanded={open}
                    onClick={() => {
                      setOpenId(open ? null : s.session.id);
                      setShowAll(false);
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-bold">
                        {dayLabel(s.session.startedAt)}
                        {live && <span className="rounded-full bg-sun px-2.5 py-0.5 text-xs font-bold">In progress</span>}
                      </span>
                      <span className="muted mt-1 block truncate text-sm">
                        {s.session.gym}
                        {s.session.endedAt ? `, ${duration(s.session.endedAt - s.session.startedAt)}` : ""}
                      </span>
                      <span className="mt-2 block text-[0.9375rem] font-semibold">
                        {plural(s.climbs, "climb")}, {plural(s.attempts, "attempt")}, {plural(s.sends, "send")}
                      </span>
                    </span>
                    {top !== null && (
                      <span
                        className="flex h-[3.75rem] w-[3.75rem] flex-none flex-col items-center justify-center rounded-full"
                        style={{
                          background: topClimb ? holdHex(topClimb.color) : "#FFDD55",
                          color: topClimb && isDark(topClimb.color) ? "#FFFFFF" : "#1E1B3A",
                          boxShadow: topClimb?.color === "white" ? "inset 0 0 0 2px #E1E6F5" : undefined,
                        }}
                      >
                        <span className="display text-lg leading-none">{gradeLabel(top)}</span>
                        <span className="text-[0.625rem] font-bold">top send</span>
                      </span>
                    )}
                  </button>
                  {open && (
                    <div className="px-5 pb-4">
                      {s.session.note && (
                        <p className="mb-3 whitespace-pre-wrap rounded-[1.125rem] bg-wall px-3.5 py-3 text-[0.9375rem] leading-relaxed">
                          {s.session.note}
                        </p>
                      )}
                      <ul className="divide-y-[1.5px] divide-wall">
                        {ids.map((id) => {
                          const stat = statOf.get(id);
                          if (!stat) return null;
                          const here = stat.attempts.filter((a) => a.sessionId === s.session.id);
                          return (
                            <li key={id}>
                              <Link href={`/climb?id=${id}`} className="flex min-h-[3.375rem] items-center gap-3">
                                <GradeChip climb={stat.climb} size={40} />
                                <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">
                                  {stat.climb.name || describeClimb(stat.climb)}
                                </span>
                                <FallCount attempts={here} />
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                      {s.climbIds.length > 5 && !showAll && (
                        <button type="button" className="btn btn-soft mt-2 min-h-11 w-full text-[0.9375rem]" onClick={() => setShowAll(true)}>
                          Show {plural(s.climbIds.length - 5, "more climb")}
                        </button>
                      )}
                      {!live && (
                        <ConfirmButton
                          label="Delete session"
                          confirmLabel="Tap again to delete its attempts"
                          className="btn btn-quiet mt-1 min-h-11 w-full text-[0.9375rem] text-danger"
                          onConfirm={() => deleteSession(s.session.id)}
                        />
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
          <div role="group" aria-label="Status" className="mt-3.5 flex gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={status === s.id}
                onClick={() => setStatus(s.id)}
                className={`flex min-h-10 items-center gap-1 rounded-full px-3.5 text-sm ${
                  status === s.id ? "bg-white font-bold shadow-[inset_0_0_0_2px_var(--color-ink)]" : "font-semibold shadow-[inset_0_0_0_2px_var(--color-line)]"
                }`}
              >
                {s.label} <span className="muted">{counts[s.id]}</span>
              </button>
            ))}
          </div>
          {climbs.length === 0 ? (
            <p className="muted mt-6">
              {status === "project" ? "No open projects." : status === "sent" ? "No sends logged yet." : "No retired climbs."}
            </p>
          ) : (
            byDay.map((g) => (
              <section key={g.day} className="mt-5">
                <h2 className="muted pl-1 text-sm font-bold">{g.day}</h2>
                <ul className="mt-2 flex flex-col gap-2">
                  {g.items.map((s) => (
                    <li key={s.climb.id}>
                      <ClimbRow
                        climb={s.climb}
                        attempts={s.attempts}
                        note={
                          s.climb.status === "sent"
                            ? s.flash
                              ? "Flashed"
                              : `Sent on attempt ${s.attemptsToSend}`
                            : `${s.climb.gym}, ${plural(s.sessions, "session")}`
                        }
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </>
      )}
    </main>
  );
}

/** Every unsent climb, grouped by gym, plus a way back to the last session's recap. */
function Projects({ stats, last }: { stats: ReturnType<typeof climbStats>; last?: ReturnType<typeof sessionStats>[number] }) {
  const open = stats
    .filter((s) => s.climb.status === "project")
    .sort((a, b) => (b.lastAt ?? b.climb.createdAt) - (a.lastAt ?? a.climb.createdAt));
  const gyms = [...new Set(open.map((s) => s.climb.gym))];
  return (
    <>
      {open.length === 0 ? (
        <p className="muted mt-6">No open projects. Anything you try and don&apos;t send waits here until you send or retire it.</p>
      ) : (
        <p className="muted mt-4 text-[0.9375rem]">
          {plural(open.length, "unsent climb")}. They carry over until you send or retire them.
        </p>
      )}
      {gyms.map((gym) => (
        <section key={gym} className="mt-5">
          <h2 className="h-card text-base">{gym}</h2>
          <ul className="mt-2.5 flex flex-col gap-2">
            {open
              .filter((s) => s.climb.gym === gym)
              .map((s) => (
                <li key={s.climb.id}>
                  <ClimbRow climb={s.climb} attempts={s.attempts} note={`Last tried ${dayLabel(s.lastAt ?? s.climb.createdAt).toLowerCase()}`} />
                </li>
              ))}
          </ul>
        </section>
      ))}
      {last && (
        <section className="mt-7">
          <h2 className="h-card text-base">Last session</h2>
          <Link href={`/recap?s=${last.session.id}`} className="mt-2.5 flex items-center gap-3.5 rounded-[1.75rem] bg-white py-4 pl-5 pr-4">
            <span className="min-w-0 flex-1">
              <span className="block font-bold">
                {dayLabel(last.session.startedAt)} at {last.session.gym}
              </span>
              <span className="muted mt-1 block text-[0.9375rem]">
                {plural(last.climbs, "climb")}, {plural(last.attempts, "go", "goes")}, {plural(last.sends, "send")}. Open the recap
              </span>
            </span>
            {last.topSend !== null && (
              <span className="flex h-14 w-14 flex-none flex-col items-center justify-center rounded-full bg-sun">
                <span className="display text-lg leading-none">{gradeLabel(last.topSend)}</span>
                <span className="text-[0.625rem] font-bold">top send</span>
              </span>
            )}
          </Link>
        </section>
      )}
    </>
  );
}
