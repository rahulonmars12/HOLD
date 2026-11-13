"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignIn } from "@/components/Account";
import { Cta } from "@/components/Cta";
import { Hold } from "@/components/Hold";
import { HoldPattern } from "@/components/HoldPattern";
import { Tally } from "@/components/Tally";
import { setMeta, startSession } from "@/lib/db";
import { useData } from "@/lib/hooks";
import { cloudEnabled, useAuth, usernameOf } from "@/lib/supabase";

/**
 * First run: what HOLD! does, an account (everyone who joins is buddies with
 * everyone else), then the first session.
 */

const TOUR = ["log", "insights", "crew"] as const;
type Step = "hello" | (typeof TOUR)[number] | "account" | "gym";

export default function WelcomePage() {
  const router = useRouter();
  const auth = useAuth();
  const data = useData();
  const [step, setStep] = useState<Step>("hello");
  const [accountMode, setAccountMode] = useState<"create" | "signin">("create");
  const [gym, setGym] = useState("");

  const steps: Step[] = ["hello", ...TOUR, ...(cloudEnabled ? (["account"] as const) : []), "gym"];
  // Once signed in, the account step is done.
  const current: Step = step === "account" && auth ? "gym" : step;
  const index = steps.indexOf(current);
  const next = () => setStep(steps[Math.min(index + 1, steps.length - 1)]);
  const back = () => setStep(steps[Math.max(index - 1, 0)]);

  const finish = async (startAt?: string) => {
    await setMeta("onboarded", true);
    if (startAt !== undefined) await startSession(startAt);
    router.replace("/");
  };

  if (current === "hello") {
    return (
      <main className="-mx-5 -mt-6 flex min-h-dvh flex-col">
        <div className="relative h-[22rem] overflow-hidden rounded-b-[2.5rem] bg-ink">
          <HoldPattern className="h-full w-full" />
        </div>
        <div className="flex flex-1 flex-col px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7">
          <h1 className="display text-[4.25rem] leading-none tracking-[-0.03em]">HOLD!</h1>
          <p className="display mt-3 text-[1.375rem] leading-[1.2]">The climbing log that counts every fall.</p>
          <p className="muted mt-2.5 text-[0.9375rem] leading-relaxed">
            Log every go, see what holds you back, and climb with your crew.
          </p>
          <div className="mt-auto pt-6">
            <Cta onClick={next}>Get started</Cta>
            {cloudEnabled && (
              <button
                type="button"
                className="mt-1 flex min-h-12 w-full items-center justify-center text-[0.9375rem] font-bold underline underline-offset-4"
                onClick={() => {
                  setAccountMode("signin");
                  setStep("account");
                }}
              >
                I already have an account
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100dvh-1.5rem)] flex-col pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Back"
          onClick={back}
          className="flex h-[2.875rem] w-[2.875rem] items-center justify-center rounded-full bg-white"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 4l-6 6 6 6" />
          </svg>
        </button>
        <ol aria-label={`Step ${index} of ${steps.length - 1}`} className="flex gap-1.5">
          {steps.slice(1).map((s, i) => (
            <li
              key={s}
              className={`h-2 rounded-full transition-all ${i + 1 === index ? "w-6 bg-ink" : i + 1 < index ? "w-2 bg-ink" : "w-2 bg-line"}`}
            />
          ))}
        </ol>
        <span className="w-[2.875rem]" />
      </div>

      {current === "log" && (
        <Panel
          title="One tap for every go"
          body="Fell or Sent, right after each attempt. After a fall, one more tap says why: wrong beta, couldn't hold it, foot slipped."
          art={<LogArt />}
          onNext={next}
        />
      )}
      {current === "insights" && (
        <Panel
          title="See what holds you back"
          body="Insights turns your falls into what to practise: your grade pyramid, the holds and angles you avoid, and why you come off. Ask the AI coach about any climb."
          art={<InsightsArt />}
          onNext={next}
        />
      )}
      {current === "crew" && (
        <Panel
          title="Climb with your crew"
          body="Everyone on HOLD! is your buddy. See who's at the wall right now, cheer their sends, and compare notes on the climbs you share."
          art={<CrewArt />}
          onNext={next}
        />
      )}

      {current === "account" && (
        <section className="mt-6">
          <h1 className="display text-[1.875rem] leading-[1.1]">
            {accountMode === "create" ? "Make your account" : "Welcome back"}
          </h1>
          <p className="muted mt-2 text-[0.9375rem] leading-relaxed">
            {accountMode === "create"
              ? "A username and password. Your log syncs to every device, and everyone else on HOLD! becomes your buddy."
              : "Sign in and your log comes back."}
          </p>
          <div className="card mt-5">
            <SignIn key={accountMode} initialMode={accountMode} />
          </div>
          <button
            type="button"
            className="muted mt-3 flex min-h-12 w-full items-center justify-center text-[0.9375rem] font-semibold"
            onClick={() => setStep("gym")}
          >
            Skip for now, keep it on this phone
          </button>
        </section>
      )}

      {current === "gym" &&
        (data && data.sessions.length > 0 ? (
          <section className="mt-6 flex flex-1 flex-col">
            <Hold kind="jug" fill="#5FDDB0" shade="#3FC998" size={120} rotate={-10} />
            <h1 className="display mt-4 text-[1.875rem] leading-[1.1]">
              {auth ? `Welcome back, @${usernameOf(auth)}` : "Welcome back"}
            </h1>
            <p className="muted mt-2 text-[0.9375rem] leading-relaxed">
              Your log is here: {data.sessions.length} {data.sessions.length === 1 ? "session" : "sessions"} and counting.
            </p>
            <div className="mt-auto pt-6">
              <Cta onClick={() => void finish()}>Go to my log</Cta>
            </div>
          </section>
        ) : (
          <form
            className="mt-6 flex flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              void finish(gym);
            }}
          >
            <h1 className="display text-[1.875rem] leading-[1.1]">
              {auth ? `You're in, @${usernameOf(auth)}.` : "Where do you climb?"}
            </h1>
            <p className="muted mt-2 text-[0.9375rem] leading-relaxed">
              {auth ? "Where do you climb? " : ""}Your gym groups your sessions, and lets buddies see when you&apos;re
              both at the same wall.
            </p>
            <label htmlFor="gym" className="label mt-6">
              Gym
            </label>
            <input
              id="gym"
              className="field field-white mt-2"
              placeholder="Gym name"
              autoComplete="off"
              value={gym}
              onChange={(e) => setGym(e.target.value)}
            />
            <div className="mt-auto pt-6">
              <Cta type="submit">Start first session</Cta>
              <button
                type="button"
                className="mt-1 flex min-h-12 w-full items-center justify-center text-[0.9375rem] font-bold"
                onClick={() => void finish()}
              >
                Not climbing right now
              </button>
              <Link
                href="/settings#demo"
                onClick={() => void setMeta("onboarded", true)}
                className="muted flex min-h-10 items-center justify-center text-sm font-semibold underline underline-offset-4"
              >
                Preview with demo data
              </Link>
            </div>
          </form>
        ))}
    </main>
  );
}

function Panel({
  title,
  body,
  art,
  onNext,
}: {
  title: string;
  body: string;
  art: React.ReactNode;
  onNext: () => void;
}) {
  return (
    <section className="mt-6 flex flex-1 flex-col">
      <div className="card flex min-h-[17rem] items-center justify-center overflow-hidden">{art}</div>
      <h1 className="display mt-7 text-[1.875rem] leading-[1.1]">{title}</h1>
      <p className="muted mt-2.5 text-[0.9375rem] leading-relaxed">{body}</p>
      <div className="mt-auto pt-6">
        <Cta onClick={onNext}>Next</Cta>
      </div>
    </section>
  );
}

function LogArt() {
  const attempts = [
    { id: "a", result: "fall" as const },
    { id: "b", result: "fall" as const },
    { id: "c", result: "fall" as const },
    { id: "d", result: "send" as const },
  ];
  return (
    <div className="w-full">
      <div className="flex items-center gap-4">
        <Hold kind="sloper" fill="#7EB3FF" shade="#5E9EF5" size={84} rotate={-6} />
        <div>
          <p className="display text-[2.5rem] leading-none">V6</p>
          <p className="muted mt-1 text-sm font-semibold">Blue overhang</p>
        </div>
      </div>
      <div className="mt-5">
        <Tally attempts={attempts} size={26} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <span className="btn btn-outline pointer-events-none min-h-14 text-lg">Fell</span>
        <span className="cta cta-center pointer-events-none min-h-14 text-lg">Sent</span>
      </div>
    </div>
  );
}

function InsightsArt() {
  const bars = [
    { label: "Wrong beta", pct: 42, color: "#B6C0FF" },
    { label: "Couldn't hold it", pct: 28, color: "#FFA45C" },
    { label: "Foot slipped", pct: 18, color: "#5FDDB0" },
    { label: "Didn't commit", pct: 12, color: "#FF9CC2" },
  ];
  return (
    <div className="w-full">
      <p className="h-card">Why you fall</p>
      <ul className="mt-4 flex flex-col gap-3">
        {bars.map((b) => (
          <li key={b.label}>
            <div className="flex justify-between text-sm font-semibold">
              <span>{b.label}</span>
              <span>{b.pct}%</span>
            </div>
            <div className="mt-1.5 h-3 rounded-full bg-wall">
              <div className="h-3 rounded-full" style={{ width: `${b.pct * 2}%`, background: b.color }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CrewArt() {
  const crew = [
    { name: "Maya", what: "is climbing now", kind: "jug" as const, fill: "#5FDDB0", shade: "#3FC998" },
    { name: "Sam", what: "sent the purple V7", kind: "pocket" as const, fill: "#B79BFF", shade: "#A080F5" },
    { name: "Leo", what: "is on your blue V6", kind: "pinch" as const, fill: "#FFA45C", shade: "#F58F40" },
  ];
  return (
    <ul className="flex w-full flex-col gap-2.5">
      {crew.map((c) => (
        <li key={c.name} className="flex items-center gap-3 rounded-[1.25rem] bg-wall px-3 py-2.5">
          <Hold kind={c.kind} fill={c.fill} shade={c.shade} size={40} rotate={-8} />
          <span className="text-[0.9375rem]">
            <strong>{c.name}</strong> {c.what}
          </span>
        </li>
      ))}
    </ul>
  );
}
