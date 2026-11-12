"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { describeClimb } from "@/components/ClimbTag";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Sheet } from "@/components/Sheet";
import { Tally } from "@/components/Tally";
import {
  FAIL_REASONS,
  GUESSES,
  READ_RESULTS,
  gradeLabel,
  holdHex,
  labelOf,
} from "@/lib/constants";
import {
  deleteAttempt,
  deleteClimb,
  logAttempt,
  saveRead,
  setAttemptReason,
  startSession,
  updateClimb,
} from "@/lib/db";
import { dayLabel, plural, timeLabel } from "@/lib/format";
import { useData, type Data } from "@/lib/hooks";
import { climbStats, type ClimbStat } from "@/lib/stats";
import type { ReadResult } from "@/lib/types";

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
    return climbStats(
      [climb],
      data.attempts.filter((a) => a.climbId === id),
    )[0];
  }, [data, id]);

  if (!data) return null;
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
  // Keyed so sheets and drafts reset when moving from one climb to another.
  return <ClimbScreen key={stat.climb.id} data={data} stat={stat} />;
}

function ClimbScreen({ data, stat }: { data: Data; stat: ClimbStat }) {
  const router = useRouter();
  const { climb, attempts } = stat;
  const active = data.active;

  // The attempt waiting for a reason, and whether the send review is open.
  const [labelling, setLabelling] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [read, setRead] = useState<ReadResult | undefined>(climb.read);
  const [whatWorked, setWhatWorked] = useState(climb.whatWorked ?? "");
  const [justLogged, setJustLogged] = useState(false);
  const [busy, setBusy] = useState(false);

  const fresh = active
    ? new Set(attempts.filter((a) => a.sessionId === active.id).map((a) => a.id))
    : undefined;
  const guess = GUESSES.find((g) => g.id === climb.guess);
  const sessionOf = new Map(data.sessions.map((s) => [s.id, s]));

  const fell = async () => {
    if (!active || busy) return;
    setBusy(true);
    const attempt = await logAttempt(climb.id, active.id, "fall");
    setJustLogged(true);
    setLabelling(attempt.id);
    setBusy(false);
  };

  const sent = async () => {
    if (!active || busy) return;
    setBusy(true);
    await logAttempt(climb.id, active.id, "send");
    setJustLogged(true);
    setReviewing(true);
    setBusy(false);
  };

  const summary =
    stat.total === 0
      ? "No attempts yet"
      : `${plural(stat.total, "attempt")} over ${plural(stat.sessions, "session")}`;

  // Attempts grouped by session, newest session first.
  const groups = [...new Set(attempts.map((a) => a.sessionId))]
    .map((sessionId) => ({
      sessionId,
      list: attempts.filter((a) => a.sessionId === sessionId),
    }))
    .reverse();

  return (
    <main className="pb-44">
      <Link href="/" className="muted inline-flex min-h-11 items-center text-sm">
        Back to session
      </Link>

      <div className="mt-1 flex items-stretch gap-4">
        <span
          aria-hidden
          className="w-3 shrink-0 rounded-full"
          style={{
            background: holdHex(climb.color),
            boxShadow:
              climb.color === "black"
                ? "inset 0 0 0 1.5px var(--color-mat-4)"
                : undefined,
          }}
        />
        <div className="min-w-0">
          <h1 className="grade text-[5.5rem]">{gradeLabel(climb.grade)}</h1>
          {climb.name && <p className="mt-2 text-lg font-semibold">{climb.name}</p>}
          <p className="muted mt-1">{describeClimb(climb)}</p>
        </div>
      </div>

      <div className="mt-7 min-h-12">
        <Tally attempts={attempts} size={40} fresh={fresh} animateLast={justLogged} />
      </div>
      <p className="mt-2" aria-live="polite">
        {climb.status === "sent" ? (
          <>
            <span className="font-semibold">
              {stat.flash ? "Flashed" : `Sent on attempt ${stat.attemptsToSend}`}
            </span>
            <span className="muted">, {dayLabel(stat.sentAt!).toLowerCase()}</span>
          </>
        ) : (
          <span className="muted">{summary}</span>
        )}
      </p>

      {(guess || climb.plan || climb.status === "sent") && (
        <div className="mt-6 rounded-2xl border border-dashed border-mat-4 p-4">
          <h2 className="font-medium">Your read</h2>
          {guess && (
            <p className="muted mt-1">
              You guessed {guess.id === "flash" ? "a flash" : `${guess.label} attempts`}.
            </p>
          )}
          {climb.plan && <p className="mt-2 whitespace-pre-wrap">{climb.plan}</p>}
          {climb.status === "sent" && (
            <p className="mt-3 border-t border-mat-3 pt-3">
              {climb.read ? (
                <>
                  <span className="muted">Did it hold up? </span>
                  {labelOf(READ_RESULTS, climb.read)}
                  {climb.whatWorked && (
                    <span className="mt-1 block whitespace-pre-wrap">
                      {climb.whatWorked}
                    </span>
                  )}
                </>
              ) : (
                <span className="muted">Not reviewed yet.</span>
              )}{" "}
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => setReviewing(true)}
              >
                {climb.read ? "Change" : "Review it"}
              </button>
            </p>
          )}
        </div>
      )}

      {groups.length > 0 && (
        <section className="mt-8">
          <h2 className="h-section">Attempts</h2>
          {groups.map(({ sessionId, list }) => {
            const session = sessionOf.get(sessionId);
            return (
              <div key={sessionId} className="mt-3">
                <p className="muted text-sm">
                  {session ? dayLabel(session.startedAt) : "Earlier"}
                </p>
                <ul className="mt-1 divide-y divide-mat-3">
                  {list.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        className="flex min-h-12 w-full items-center justify-between gap-3 text-left"
                        onClick={() => {
                          setJustLogged(false);
                          setLabelling(a.id);
                        }}
                      >
                        <span>
                          <span className="muted mr-3 tabular-nums">
                            {attempts.indexOf(a) + 1}
                          </span>
                          {a.result === "send"
                            ? "Sent"
                            : a.reason
                              ? labelOf(FAIL_REASONS, a.reason)
                              : "Fell, no reason given"}
                        </span>
                        <span className="muted text-sm tabular-nums">
                          {timeLabel(a.at)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      <section className="mt-10 flex flex-wrap gap-3">
        {climb.status === "project" && (
          <button
            type="button"
            className="btn"
            onClick={() => updateClimb(climb.id, { status: "retired" })}
          >
            Retire climb
          </button>
        )}
        {climb.status === "retired" && (
          <button
            type="button"
            className="btn"
            onClick={() => updateClimb(climb.id, { status: "project" })}
          >
            Reopen climb
          </button>
        )}
        <ConfirmButton
          label="Delete climb"
          confirmLabel="Tap again to delete"
          onConfirm={async () => {
            await deleteClimb(climb.id);
            router.replace("/");
          }}
        />
        {climb.status === "project" && (
          <p className="muted w-full text-sm">
            Retire a climb when the set is taken down or you are done with it.
            It leaves your open projects and stays in your stats.
          </p>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 border-t border-mat-3 bg-mat/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {climb.status === "sent" ? (
            <Link href="/" className="btn min-h-14 w-full text-lg">
              Back to session
            </Link>
          ) : climb.status === "retired" ? (
            <p className="muted py-3 text-center">
              Retired. Reopen it to log more attempts.
            </p>
          ) : !active ? (
            <button
              type="button"
              className="btn btn-tape min-h-14 w-full text-lg"
              onClick={() => startSession(climb.gym)}
            >
              Start a session to log attempts
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="btn btn-xl" onClick={fell} disabled={busy}>
                Fell
              </button>
              <button
                type="button"
                className="btn btn-xl btn-tape"
                onClick={sent}
                disabled={busy}
              >
                Sent
              </button>
            </div>
          )}
        </div>
      </div>

      <ReasonSheet
        attemptId={labelling}
        stat={stat}
        onClose={() => setLabelling(null)}
      />

      <Sheet
        open={reviewing}
        onClose={() => setReviewing(false)}
        title={
          stat.flash
            ? "Flashed it"
            : `Sent on attempt ${stat.attemptsToSend ?? stat.total}`
        }
      >
        {guess && (
          <p className="muted -mt-2 mb-4">
            You guessed {guess.id === "flash" ? "a flash" : `${guess.label} attempts`}.
          </p>
        )}
        <p className="mb-2 font-medium">Did your read hold up?</p>
        <div role="group" aria-label="Did your read hold up?" className="grid grid-cols-3 gap-2">
          {READ_RESULTS.map((r) => (
            <button
              key={r.id}
              type="button"
              className="chip"
              aria-pressed={read === r.id}
              onClick={() => setRead(read === r.id ? undefined : r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <label htmlFor="worked" className="mt-4 mb-2 block font-medium">
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
        <button
          type="button"
          className="btn btn-tape mt-4 w-full"
          onClick={async () => {
            await saveRead(climb.id, read, whatWorked);
            setReviewing(false);
          }}
        >
          Save
        </button>
      </Sheet>
    </main>
  );
}

/** Asks why a fall happened, or lets an existing attempt be relabelled or removed. */
function ReasonSheet({
  attemptId,
  stat,
  onClose,
}: {
  attemptId: string | null;
  stat: ClimbStat;
  onClose: () => void;
}) {
  const attempt = stat.attempts.find((a) => a.id === attemptId);
  const number = attempt ? stat.attempts.indexOf(attempt) + 1 : 0;
  return (
    <Sheet
      open={!!attempt}
      onClose={onClose}
      title={
        attempt?.result === "send"
          ? `Attempt ${number}: sent`
          : "Why did you come off?"
      }
    >
      {attempt?.result === "fall" && (
        <div className="grid grid-cols-2 gap-2">
          {FAIL_REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className="chip min-h-14 rounded-xl"
              aria-pressed={attempt.reason === r.id}
              onClick={async () => {
                await setAttemptReason(
                  attempt.id,
                  attempt.reason === r.id ? undefined : r.id,
                );
                onClose();
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex gap-3">
        {attempt && (
          <ConfirmButton
            label={attempt.result === "send" ? "Undo send" : "Remove attempt"}
            confirmLabel="Tap again to remove"
            className="btn btn-danger flex-1"
            onConfirm={async () => {
              await deleteAttempt(attempt.id);
              onClose();
            }}
          />
        )}
        <button type="button" className="btn flex-1" onClick={onClose}>
          {attempt?.result === "fall" && !attempt.reason ? "Skip" : "Done"}
        </button>
      </div>
    </Sheet>
  );
}
