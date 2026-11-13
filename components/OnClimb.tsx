"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ANGLES, FAIL_REASONS, colorLabel, gradeLabel, holdHex, holdShade, isDark, labelOf } from "@/lib/constants";
import { setCurrentClimb } from "@/lib/current";
import { logAttempt, setAttemptReason } from "@/lib/db";
import { plural } from "@/lib/format";
import { useCustomColors } from "@/lib/hooks";
import type { PersonaId } from "@/lib/persona";
import { clock, restSeconds, startRest, stopRest, useRest } from "@/lib/rest";
import type { ClimbStat } from "@/lib/stats";
import type { Session } from "@/lib/types";
import { fallLine, firstGoLine, readyLine, returnLine } from "@/lib/voice";
import { describeClimb, mainHold } from "./ClimbCards";
import { Companion, type Mood } from "./Companion";
import { Hold } from "./Hold";
import { Sheet } from "./Sheet";
import { Tally } from "./Tally";

/** Minutes and seconds since the session started, ticking every second. */
function useElapsed(since: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - since) / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(s % 60).padStart(2, "0")}`;
}

export function SessionClock({ since }: { since: number }) {
  return <>{useElapsed(since)}</>;
}

/**
 * The climb you're on, full screen: nothing but the climb and three choices,
 * Fell, Sent and Let's move on. Covers the tab bar on purpose.
 */
export function OnClimb({ stat, session, persona }: { stat: ClimbStat; session: Session; persona?: PersonaId }) {
  const router = useRouter();
  const custom = useCustomColors();
  const { climb, attempts } = stat;
  const [labelling, setLabelling] = useState<string | null>(null);
  const [fellNow, setFellNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const rest = useRest();
  const resting = rest && rest.climbId === climb.id ? rest : null;
  const dark = isDark(climb.color);
  const fresh = new Set(attempts.filter((a) => a.sessionId === session.id).map((a) => a.id));
  const last = attempts[attempts.length - 1];
  const seed = stat.total + (climb.createdAt % 89);

  const mood: Mood = resting?.done ? "ready" : resting ? "rest" : fellNow ? "fall" : "idle";
  const line = resting?.done
    ? readyLine(seed)
    : (resting || fellNow) && last?.result === "fall"
      ? fallLine(seed, last.reason)
      : stat.total === 0
        ? firstGoLine(seed)
        : returnLine(seed, stat.total);

  const fell = async () => {
    if (busy) return;
    setBusy(true);
    const attempt = await logAttempt(climb.id, session.id, "fall");
    setFellNow(true);
    setLabelling(attempt.id);
    setBusy(false);
  };

  const sent = async () => {
    if (busy) return;
    setBusy(true);
    await logAttempt(climb.id, session.id, "send");
    stopRest();
    setCurrentClimb(null);
    // The climb page plays the celebration and asks how the read held up, then returns here.
    router.push(`/climb?id=${climb.id}&sent=1`);
  };

  const moveOn = () => {
    stopRest();
    setCurrentClimb(null);
  };

  const attempt = attempts.find((a) => a.id === labelling);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`On the wall now: ${gradeLabel(climb.grade)}`}
      className="fixed inset-0 z-30 overflow-hidden bg-wall text-ink"
    >
      <div className="relative mx-auto flex h-full max-w-md flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <Hold
          kind={mainHold(climb)}
          fill={dark ? "#C3C7DA" : holdHex(climb.color)}
          shade={dark ? "#A9AEC6" : holdShade(climb.color)}
          bolt={false}
          size={mainHold(climb) === "crimp" ? 560 : 430}
          rotate={-8}
          style={{ position: "absolute", left: -70, top: mainHold(climb) === "crimp" ? -40 : 50 }}
        />

        <div className="relative flex items-center justify-between gap-2">
          <p className="flex h-10 min-w-0 items-center gap-2 rounded-full bg-white px-3.5 text-sm font-bold">
            <span aria-hidden className="h-2.5 w-2.5 flex-none rounded-full bg-mint-deep" />
            <span className="tabular-nums">
              <SessionClock since={session.startedAt} />
            </span>
            <span className="muted truncate font-semibold">at {session.gym}</span>
          </p>
          <Link href={`/climb?id=${climb.id}`} className="btn min-h-11 flex-none px-4 text-sm">
            Details
          </Link>
        </div>

        <div className="on-color relative mt-9 !bg-transparent">
          <p className="text-[0.9375rem] font-bold">On the wall now</p>
          <h1 className="hero-grade display mt-0.5 text-[7.25rem] leading-[0.95] tracking-[-0.04em]">{gradeLabel(climb.grade)}</h1>
          <p className="display mt-2.5 text-xl">
            {climb.name || `${colorLabel(climb.color, custom)} ${labelOf(ANGLES, climb.angle).toLowerCase()}`}
          </p>
          <p className="mt-1 font-semibold">{describeClimb(climb)}</p>
        </div>

        <div className="relative mt-8 flex items-center justify-between gap-3">
          <span className="on-color !bg-transparent">
            <Tally attempts={attempts} size={28} fresh={fresh} animateLast={fellNow} pending />
          </span>
          <p className="flex-none text-right text-[0.9375rem] font-bold leading-tight">
            {stat.total === 0 ? "First go" : plural(stat.total, "go", "goes")}
            <br />
            <span className="muted font-medium">{stat.total === 0 ? "take your time" : `go ${stat.total + 1} is next`}</span>
          </p>
        </div>

        <div className="relative mt-auto">
          <div className="flex items-center gap-2">
            <Companion persona={persona} mood={mood} size={60} line={line} className="min-w-0 flex-1" />
            {resting && !resting.done ? (
              <button
                type="button"
                onClick={stopRest}
                aria-label={`Resting, ${clock(resting.left)} left. Tap to stop.`}
                className="btn min-h-12 flex-none flex-col gap-0 px-3.5 leading-none"
                data-sfx="none"
              >
                <span className="display text-sm tabular-nums">{clock(resting.left)}</span>
                <span className="muted text-[0.625rem] font-bold">stop</span>
              </button>
            ) : (
              <button type="button" className="btn min-h-12 flex-none px-3.5 text-sm" onClick={() => startRest(climb.id)}>
                Rest {restSeconds() / 60} min
              </button>
            )}
          </div>
          <div className="mt-3.5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={fell}
              disabled={busy}
              data-sfx="fall"
              className="btn display h-24 bg-white text-[1.625rem] shadow-[inset_0_0_0_3px_var(--color-ink)]"
            >
              Fell
            </button>
            <button type="button" onClick={sent} disabled={busy} data-sfx="send" className="cta cta-center display h-24 !text-[1.625rem]">
              Sent
            </button>
          </div>
          <button type="button" className="btn btn-ink mt-3 min-h-14 w-full" onClick={moveOn}>
            Let&apos;s move on
            <svg width="18" height="18" viewBox="0 0 22 22" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 11h14M12 5l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <Sheet open={!!attempt} onClose={() => setLabelling(null)} title="Why did you come off?">
        <p className="muted -mt-2 text-[0.9375rem]">Logged. One more tap to say why.</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {FAIL_REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              data-sfx="reason"
              className="on-color reason flex min-h-[4.125rem] items-center justify-center text-[1.0625rem] font-bold"
              style={{ background: r.color }}
              onClick={async () => {
                if (attempt) await setAttemptReason(attempt.id, r.id);
                setLabelling(null);
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-outline mt-4 min-h-[3.25rem] w-full" onClick={() => setLabelling(null)}>
          Skip
        </button>
      </Sheet>
    </div>,
    document.body,
  );
}
