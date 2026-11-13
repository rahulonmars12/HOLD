"use client";

import { Loading } from "@/components/Loading";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { describeClimb, mainHold } from "@/components/ClimbCards";
import { CoachCard } from "@/components/Coach";
import { Companion, type Mood } from "@/components/Companion";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Cta } from "@/components/Cta";
import { HoldRain } from "@/components/HoldRain";
import { Hold } from "@/components/Hold";
import { Sheet } from "@/components/Sheet";
import { FallCount, Tally } from "@/components/Tally";
import { askCoach, climbContext } from "@/lib/ai";
import {
  ANGLES,
  FAIL_REASONS,
  HOLDS,
  STYLES,
  GUESSES,
  READ_RESULTS,
  colorLabel,
  gradeLabel,
  holdHex,
  holdShade,
  isDark,
  labelOf,
} from "@/lib/constants";
import {
  deleteAttempt,
  deleteClimb,
  logAttempt,
  saveCoach,
  saveRead,
  setAttemptReason,
  startSession,
  updateClimb,
} from "@/lib/db";
import { dayLabel, plural, timeLabel } from "@/lib/format";
import { useCustomColors, useData, usePhoto, type Data } from "@/lib/hooks";
import { clock, startRest, stopRest, useRest } from "@/lib/rest";
import { sfx } from "@/lib/sfx";
import { usePersona } from "@/lib/usePersona";
import { fallLine, firstGoLine, guessLine, readyLine, returnLine, sendLine } from "@/lib/voice";
import { nameOf, problemResults, retireProblem, type ProblemResult } from "@/lib/social";
import { climbStats, type ClimbStat } from "@/lib/stats";
import { useAuth } from "@/lib/supabase";
import type { Attempt, ReadResult } from "@/lib/types";

export default function ClimbPage() {
  return (
    <Suspense fallback={null}>
      <ClimbLoader />
    </Suspense>
  );
}

function ClimbLoader() {
  const id = useSearchParams().get("id");
  const data = useData();
  const stat = useMemo(() => {
    if (!data || !id) return undefined;
    const climb = data.climbs.find((c) => c.id === id);
    if (!climb) return undefined;
    return climbStats([climb], data.attempts.filter((a) => a.climbId === id))[0];
  }, [data, id]);

  if (!data) return <Loading />;
  if (!stat) {
    return (
      <main className="pb-10">
        <h1 className="h-page">That climb is gone</h1>
        <p className="muted mt-3">It may have been deleted.</p>
        <Link href="/" className="btn mt-5">
          Back to session
        </Link>
      </main>
    );
  }
  // Keyed so sheets and drafts reset when moving between climbs.
  return <ClimbScreen key={stat.climb.id} data={data} stat={stat} />;
}

function ClimbScreen({ data, stat }: { data: Data; stat: ClimbStat }) {
  const router = useRouter();
  const custom = useCustomColors();
  const { climb, attempts } = stat;
  const active = data.active;
  const photo = usePhoto(climb.id, climb.photoPath);

  const [labelling, setLabelling] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [read, setRead] = useState<ReadResult | undefined>(climb.read);
  const [whatWorked, setWhatWorked] = useState(climb.whatWorked ?? "");
  const [justLogged, setJustLogged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rain, setRain] = useState(0);

  const fresh = active ? new Set(attempts.filter((a) => a.sessionId === active.id).map((a) => a.id)) : undefined;
  const guess = GUESSES.find((g) => g.id === climb.guess);
  const sessionOf = new Map(data.sessions.map((s) => [s.id, s]));
  const canLog = climb.status === "project" && !!active;
  const dark = isDark(climb.color);

  const personaResult = usePersona(data);
  const persona = personaResult?.ready ? personaResult.persona.id : undefined;
  const rest = useRest();
  const resting = rest && rest.climbId === climb.id ? rest : null;

  // How the guess made before the first go turned out, and the running score.
  const verdict =
    guess && stat.attemptsToSend !== undefined
      ? stat.attemptsToSend > guess.max
        ? ("harder" as const)
        : stat.attemptsToSend < guess.min
          ? ("easier" as const)
          : ("right" as const)
      : undefined;
  const reads = useMemo(() => {
    let judged = 0;
    let right = 0;
    for (const s of climbStats(data.climbs, data.attempts)) {
      const g = GUESSES.find((x) => x.id === s.climb.guess);
      if (!g || s.attemptsToSend === undefined) continue;
      judged++;
      if (s.attemptsToSend >= g.min && s.attemptsToSend <= g.max) right++;
    }
    return { judged, right };
  }, [data]);

  const fell = async () => {
    if (!active || busy) return;
    setBusy(true);
    const attempt = await logAttempt(climb.id, active.id, "fall");
    setJustLogged(true);
    setLabelling(attempt.id);
    startRest(climb.id);
    setBusy(false);
  };

  const sent = async () => {
    if (!active || busy) return;
    setBusy(true);
    await logAttempt(climb.id, active.id, "send");
    setJustLogged(true);
    stopRest();
    setRain((n) => n + 1);
    // Let the tick draw and the holds fall before the review sheet covers them.
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => setReviewing(true), calm ? 0 : 1100);
    setBusy(false);
  };

  // The companion reacts to the last thing that happened on this climb.
  const last = attempts[attempts.length - 1];
  const seed = stat.total + (climb.createdAt % 89);
  const mood: Mood =
    climb.status === "sent" ? "send" : resting?.done ? "ready" : resting ? "rest" : justLogged && last?.result === "fall" ? "fall" : "idle";
  const line =
    climb.status === "sent"
      ? sendLine(seed, stat.attemptsToSend ?? stat.total, stat.sessions)
      : resting?.done
        ? readyLine(seed)
        : (resting || justLogged) && last?.result === "fall"
          ? fallLine(seed, last.reason)
          : stat.total === 0
            ? firstGoLine(seed)
            : returnLine(seed, stat.total);
  const showCompanion = canLog || (climb.status === "sent" && justLogged);

  const groups = [...new Set(attempts.map((a) => a.sessionId))]
    .map((sessionId) => ({ sessionId, list: attempts.filter((a) => a.sessionId === sessionId) }))
    .reverse();

  return (
    <main className="pb-72">
      <div aria-hidden className="pointer-events-none absolute -left-10 top-16">
        <Hold
          kind={mainHold(climb)}
          fill={dark ? "#C3C7DA" : holdHex(climb.color)}
          shade={dark ? "#A9AEC6" : holdShade(climb.color)}
          // A navy bolt this big would sit under the title text, so it takes the shade instead.
          bolt={dark ? "#A9AEC6" : holdShade(climb.color)}
          size={mainHold(climb) === "crimp" ? 470 : 330}
          rotate={-6}
          viewBox={mainHold(climb) === "crimp" ? "0 11 40 17" : "0 0 40 40"}
          style={{ height: mainHold(climb) === "crimp" ? 200 : 330 }}
        />
      </div>

      <Link href="/" aria-label="Back to session" className="relative flex h-[2.875rem] w-[2.875rem] items-center justify-center rounded-full bg-white">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1E1B3A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 4l-6 6 6 6" />
        </svg>
      </Link>

      <div className="relative mt-5 flex items-start justify-between gap-3 pl-3.5">
        <div className="min-w-0">
          <h1 className="display text-[6rem] leading-[0.95] tracking-[-0.04em]">{gradeLabel(climb.grade)}</h1>
          <p className="display mt-2 text-lg font-bold">
            {climb.name || `${colorLabel(climb.color, custom)} ${labelOf(ANGLES, climb.angle).toLowerCase()}`}
          </p>
          <p className="mt-1 font-semibold">{climb.name ? describeClimb(climb) : tagLine(climb)}</p>
        </div>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="Photo of this climb" className="mt-2 h-28 w-24 flex-none rounded-[1.25rem] object-cover shadow-md" />
        )}
      </div>

      <div className="relative mt-12 flex items-center justify-between gap-3">
        <Tally attempts={attempts} size={26} fresh={fresh} animateLast={justLogged} pending={canLog} />
        {climb.status !== "sent" && (
          <p className="flex-none text-right text-[0.9375rem] font-bold leading-tight">
            {plural(stat.total, "attempt")}
            <br />
            <span className="muted font-medium">{plural(stat.sessions, "session")}</span>
          </p>
        )}
      </div>
      {climb.status === "sent" && (
        <p className="mt-3.5 inline-flex h-9 items-center rounded-full bg-mint px-4 text-[0.9375rem] font-bold">
          {stat.flash ? "Flashed" : `Sent on attempt ${stat.attemptsToSend}`}, {dayLabel(stat.sentAt!).toLowerCase()}
        </p>
      )}
      {climb.status === "retired" && (
        <p className="mt-3.5 inline-flex h-9 items-center rounded-full bg-white px-4 text-[0.9375rem] font-bold">Retired</p>
      )}

      {(guess || climb.plan || climb.status === "sent") && (
        <section className="card mt-5">
          <div className="flex items-center justify-between gap-2.5">
            <h2 className="h-card text-base">Your read</h2>
            {guess && climb.status !== "sent" && (
              <span className="rounded-full bg-sun px-3 py-1 text-sm font-bold">Guessed {guess.label}</span>
            )}
          </div>
          {climb.status === "sent" && (
            <dl className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-[1.125rem] bg-wall px-3 py-2.5">
                <dt className="muted text-xs font-semibold">Guessed</dt>
                <dd className={guess ? "display text-lg" : "muted pt-1 text-sm font-semibold"}>{guess?.label ?? "No guess"}</dd>
              </div>
              <div
                className="rounded-[1.125rem] px-3 py-2.5"
                style={{
                  background:
                    guess && stat.attemptsToSend! > guess.max
                      ? "#FFA45C"
                      : guess && stat.attemptsToSend! < guess.min
                        ? "#5FDDB0"
                        : "#EEF2FB",
                }}
              >
                <dt className="text-xs font-semibold">Took</dt>
                <dd className="display text-lg">{stat.attemptsToSend}</dd>
              </div>
              <div className="rounded-[1.125rem] bg-wall px-3 py-2.5">
                <dt className="muted text-xs font-semibold">Beta held</dt>
                <dd className={climb.read ? "display text-lg" : "muted pt-1 text-sm font-semibold"}>{climb.read ? labelOf(READ_RESULTS, climb.read) : "Not said"}</dd>
              </div>
            </dl>
          )}
          {climb.plan && (
            <>
              {climb.status === "sent" && <h3 className="muted mt-4 text-sm font-bold">Your plan</h3>}
              <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{climb.plan}</p>
            </>
          )}
          {climb.whatWorked && (
            <>
              <h3 className="muted mt-3.5 text-sm font-bold">What worked</h3>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{climb.whatWorked}</p>
            </>
          )}
          {climb.status === "sent" && (
            <button type="button" className="mt-2 min-h-10 text-[0.9375rem] font-bold underline underline-offset-4" onClick={() => setReviewing(true)}>
              {climb.read ? "Edit review" : "Review your read"}
            </button>
          )}
        </section>
      )}

      {(climb.status === "sent" || stat.total >= 3 || climb.coach) && (
        <div className="mt-3">
          <CoachCard
            note={climb.coach}
            intro={
              climb.status === "sent"
                ? "See what changed between your falls and the send, and what to practise next."
                : "Stuck? Get a read on what's going wrong across your attempts."
            }
            request={async (question) => {
              const note = await askCoach("climb", climbContext(climb, data.climbs, data.attempts, data.sessions), question);
              await saveCoach(climb.id, note);
            }}
          />
        </div>
      )}

      {climb.problemId && <BuddyResults problemId={climb.problemId} />}

      {groups.length > 0 && (
        <section className="mt-3 rounded-[1.75rem] bg-white px-[1.125rem] pb-1.5 pt-4">
          <div className="flex items-baseline justify-between">
            <h2 className="h-card text-base">Attempts</h2>
            <span className="muted text-[0.8125rem]">Tap one to change it</span>
          </div>
          {groups.map(({ sessionId, list }) => {
            const session = sessionOf.get(sessionId);
            return (
              <div key={sessionId} className="mt-2">
                <p className="muted text-[0.8125rem] font-semibold">{session ? dayLabel(session.startedAt) : "Earlier"}</p>
                <ul className="divide-y-[1.5px] divide-wall">
                  {list.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className="flex min-h-12 w-full items-center gap-3 text-left"
                        onClick={() => {
                          setJustLogged(false);
                          setLabelling(a.id);
                        }}
                      >
                        <span className="flex h-[1.625rem] w-[1.625rem] flex-none items-center justify-center rounded-full bg-wall text-[0.8125rem] font-bold">
                          {attempts.indexOf(a) + 1}
                        </span>
                        <span className={`flex-1 ${!a.reason && a.result === "fall" ? "muted" : "font-medium"}`}>
                          {a.result === "send" ? "Sent" : a.reason ? labelOf(FAIL_REASONS, a.reason) : "No reason given"}
                        </span>
                        <span className="muted text-sm tabular-nums">{timeLabel(a.at)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      <section className="mt-4">
        <div className="flex gap-2.5">
          {climb.status === "project" && stat.total > 0 && (
            <button
              type="button"
              className="btn flex-1"
              onClick={async () => {
                await updateClimb(climb.id, { status: "retired" });
                if (climb.problemId) void retireProblem(climb.problemId).catch(() => {});
              }}
            >
              Retire climb
            </button>
          )}
          {climb.status === "retired" && (
            <button type="button" className="btn flex-1" onClick={() => updateClimb(climb.id, { status: "project" })}>
              Reopen climb
            </button>
          )}
          <ConfirmButton
            label="Delete climb"
            confirmLabel="Tap again to delete"
            className="btn btn-danger flex-1"
            onConfirm={async () => {
              await deleteClimb(climb.id);
              router.replace("/");
            }}
          />
        </div>
        {climb.status === "project" && stat.total > 0 && (
          <p className="muted mt-2 px-1.5 text-[0.8125rem] leading-snug">
            Retire it when the set comes down. It leaves your projects and stays in your stats.
          </p>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-b from-wall/0 via-wall via-[22%] to-wall">
        <div className="mx-auto max-w-md px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-7">
          {showCompanion && (
            <div className="mb-3 flex items-center gap-2">
              <Companion persona={persona} mood={mood} size={60} line={line} className="min-w-0 flex-1" />
              {resting && !resting.done && <RestRing left={resting.left} total={resting.total} />}
            </div>
          )}
          {climb.status === "sent" || climb.status === "retired" ? (
            <Cta href="/">Back to session</Cta>
          ) : !active ? (
            <Cta onClick={() => void startSession(climb.gym)}>Start a session to log attempts</Cta>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={fell}
                disabled={busy}
                data-sfx="fall"
                className="display flex h-[5.5rem] items-center justify-center rounded-full bg-white text-2xl shadow-[inset_0_0_0_2.5px_#1E1B3A] active:scale-[0.97]"
              >
                Fell
              </button>
              <button type="button" onClick={sent} disabled={busy} data-sfx="send" className="cta cta-center display h-[5.5rem] text-2xl !font-black">
                Sent
              </button>
            </div>
          )}
        </div>
      </div>

      {rain > 0 && <HoldRain key={rain} />}

      <ReasonSheet attemptId={labelling} stat={stat} onClose={() => setLabelling(null)} />

      <Sheet
        open={reviewing}
        onClose={() => setReviewing(false)}
        title={stat.flash ? "Flashed it" : `Sent on attempt ${stat.attemptsToSend ?? stat.total}`}
        aside={
          <span aria-hidden className="relative -mr-1 -mt-2 flex-none">
            <Hold kind="jug" fill="#5FDDB0" shade="#3FC998" size={84} rotate={-10} bolt={false} />
            <span className="absolute left-1/2 top-[54%] flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-10" />
              </svg>
            </span>
          </span>
        }
      >
        {guess && verdict && (
          <CalledIt
            verdict={verdict}
            guess={guess.label}
            took={stat.attemptsToSend ?? stat.total}
            line={guessLine(seed, verdict)}
            reads={reads}
          />
        )}
        <p className="mb-2.5 mt-5 pl-1 text-[0.9375rem] font-bold">Did your beta hold up?</p>
        <div role="group" aria-label="Did your beta hold up?" className="grid grid-cols-3 gap-2">
          {READ_RESULTS.map((r) => (
            <button
              key={r.id}
              type="button"
              className="chip min-h-[3.25rem]"
              aria-pressed={read === r.id}
              onClick={() => setRead(read === r.id ? undefined : r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <label htmlFor="worked" className="label mb-2.5 mt-5">
          What actually worked?
        </label>
        <textarea
          id="worked"
          className="field"
          rows={3}
          placeholder="Drop knee instead of the heel hook, stayed low for the cross"
          value={whatWorked}
          onChange={(e) => setWhatWorked(e.target.value)}
        />
        <Cta
          bare
          sfx="save"
          className="mt-4"
          onClick={async () => {
            await saveRead(climb.id, read, whatWorked);
            setReviewing(false);
          }}
        >
          Save
        </Cta>
      </Sheet>
    </main>
  );
}

/** The rest countdown as a ring. Tap to skip. */
function RestRing({ left, total }: { left: number; total: number }) {
  const r = 24;
  const round = 2 * Math.PI * r;
  return (
    <button
      type="button"
      onClick={stopRest}
      aria-label={`Resting, ${clock(left)} left. Tap to skip.`}
      className="relative flex h-[3.75rem] w-[3.75rem] flex-none items-center justify-center rounded-full bg-white"
    >
      <svg width="60" height="60" viewBox="0 0 60 60" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="30" cy="30" r={r} fill="none" stroke="#EEF2FB" strokeWidth="5" />
        <circle
          cx="30"
          cy="30"
          r={r}
          fill="none"
          stroke="#A080F5"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={round}
          strokeDashoffset={round * (1 - left / Math.max(1, total))}
          style={{ transition: "stroke-dashoffset 500ms linear" }}
        />
      </svg>
      <span className="relative text-center leading-none">
        <span className="display block text-[0.8125rem] tabular-nums">{clock(left)}</span>
        <span className="muted block text-[0.625rem] font-bold">skip</span>
      </span>
    </button>
  );
}

/** The payoff for guessing your attempts before the first go. */
function CalledIt({
  verdict,
  guess,
  took,
  line,
  reads,
}: {
  verdict: "right" | "harder" | "easier";
  guess: string;
  took: number;
  line: string;
  reads: { judged: number; right: number };
}) {
  useEffect(() => {
    if (verdict !== "right") return;
    const t = setTimeout(() => sfx("called"), 350);
    return () => clearTimeout(t);
  }, [verdict]);
  return (
    <div className="-mt-1 rounded-[1.5rem] px-4 py-3.5" style={{ background: verdict === "right" ? "#FFDD55" : "#EEF2FB" }}>
      <div className="flex items-center gap-3">
        {verdict === "right" && (
          <span className="stamp display flex-none rounded-[0.875rem] border-[3px] border-ink px-2.5 py-1 text-[0.9375rem] leading-none">
            Called it!
          </span>
        )}
        <p className="text-[0.9375rem] font-bold leading-snug">{line}</p>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2 text-sm font-bold">
        <span className="rounded-full bg-white px-3 py-1.5">Guessed {guess}</span>
        <span className="rounded-full bg-white px-3 py-1.5">Took {took}</span>
        {reads.judged >= 2 && (
          <span className="rounded-full bg-ink px-3 py-1.5 text-white">
            {reads.right} of {reads.judged} reads called
          </span>
        )}
      </div>
    </div>
  );
}

const marks = (falls: number, sent: boolean): Pick<Attempt, "id" | "result">[] => [
  ...Array.from({ length: falls }, (_, i) => ({ id: String(i), result: "fall" as const })),
  ...(sent ? [{ id: "send", result: "send" as const }] : []),
];

const tagLine = (c: { holds: string[]; styles: string[] }) =>
  [
    ...c.holds.map((h) => HOLDS.find((x) => x.id === h)?.label ?? h),
    ...c.styles.map((st) => STYLES.find((x) => x.id === st)?.short ?? st),
  ].join(", ");

/** Asks why a fall happened, or lets an existing attempt be relabelled or removed. */
function ReasonSheet({ attemptId, stat, onClose }: { attemptId: string | null; stat: ClimbStat; onClose: () => void }) {
  const attempt = stat.attempts.find((a) => a.id === attemptId);
  const number = attempt ? stat.attempts.indexOf(attempt) + 1 : 0;
  return (
    <Sheet
      open={!!attempt}
      onClose={onClose}
      title={attempt?.result === "send" ? `Attempt ${number}: sent` : "Why did you come off?"}
      aside={
        attempt && (
          <span className="flex h-[3.625rem] w-[3.625rem] flex-none flex-col items-center justify-center rounded-full bg-ink leading-none text-white">
            <span className="display text-xl">{number}</span>
            <span className="mt-0.5 text-[0.625rem] font-bold">attempt</span>
          </span>
        )
      }
    >
      {attempt?.result === "fall" && (
        <>
          <p className="muted -mt-2 mb-4 text-[0.9375rem]">Logged. One more tap to say why.</p>
          <div className="grid grid-cols-2 gap-2.5">
            {FAIL_REASONS.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={attempt.reason === r.id}
                data-sfx="reason"
                onClick={async () => {
                  await setAttemptReason(attempt.id, attempt.reason === r.id ? undefined : r.id);
                  onClose();
                }}
                className="flex min-h-[4.125rem] items-center justify-center rounded-full text-[1.0625rem] font-bold"
                style={{
                  background: r.color,
                  boxShadow: attempt.reason === r.id ? "0 0 0 3px #FFFFFF, 0 0 0 5.5px #1E1B3A" : undefined,
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-4 flex gap-2.5">
        {attempt && (
          <ConfirmButton
            label={attempt.result === "send" ? "Undo send" : "Remove attempt"}
            confirmLabel="Tap again to remove"
            className="btn btn-quiet min-h-[3.25rem] flex-1 text-danger"
            onConfirm={async () => {
              await deleteAttempt(attempt.id);
              onClose();
            }}
          />
        )}
        <button type="button" className="btn btn-outline min-h-[3.25rem] flex-1" onClick={onClose}>
          {attempt?.result === "fall" && !attempt.reason ? "Skip" : "Done"}
        </button>
      </div>
    </Sheet>
  );
}

/** Buddies who logged the same gym problem, with their falls, sends and beta. */
function BuddyResults({ problemId }: { problemId: string }) {
  const auth = useAuth();
  const [results, setResults] = useState<ProblemResult[] | null>(null);
  useEffect(() => {
    if (!auth) return;
    let alive = true;
    problemResults(problemId)
      .then((r) => alive && setResults(r))
      .catch(() => alive && setResults(null));
    return () => {
      alive = false;
    };
  }, [auth, problemId]);

  const others = results?.filter((r) => !r.isMe) ?? [];
  if (!auth || others.length === 0) return null;
  return (
    <section className="mt-3 rounded-[1.75rem] bg-white px-[1.125rem] py-4">
      <div className="flex items-center gap-2.5">
        <Hold kind="pinch" fill="#5FDDB0" shade="#3FC998" size={30} rotate={24} />
        <h2 className="h-card text-base">Buddies on this climb</h2>
      </div>
      <ul className="mt-2 divide-y-[1.5px] divide-wall">
        {others.map((r) => (
          <li key={r.who.id + r.climb.id} className="py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold">{nameOf(r.who)}</span>
              <FallCount attempts={marks(r.falls, r.sent)} />
            </div>
            {r.climb.whatWorked && <p className="muted mt-1 text-sm leading-relaxed">&ldquo;{r.climb.whatWorked}&rdquo;</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

