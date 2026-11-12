"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyProfile, saveProfile, type Profile } from "@/lib/social";
import { cloudEnabled, sendCode, useAuth, verifyCode } from "@/lib/supabase";

/** Email sign-in with a six-digit code, which works inside an installed app. */
export function SignIn({ intro }: { intro?: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cloudEnabled) {
    return (
      <p className="muted text-sm leading-relaxed">
        Accounts aren&apos;t set up for this copy of HOLD! yet. Once the Supabase settings are added in
        Vercel, you can sign in here to sync between devices and climb with buddies.
      </p>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (step === "email") {
          void run(async () => {
            await sendCode(email);
            setStep("code");
          });
        } else {
          void run(() => verifyCode(email, code));
        }
      }}
    >
      {intro && <p className="muted mb-3 text-sm leading-relaxed">{intro}</p>}
      {step === "email" ? (
        <>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            className="field mt-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="btn btn-ink mt-3 w-full" disabled={busy || !email.includes("@")}>
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </>
      ) : (
        <>
          <label htmlFor="code" className="label">
            Code sent to {email}
          </label>
          <input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            className="field mt-2 text-center text-xl tracking-[0.4em]"
            placeholder="123456"
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <button type="submit" className="btn btn-ink mt-3 w-full" disabled={busy || code.length < 6}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button
            type="button"
            className="btn btn-quiet mt-1 w-full text-sm"
            onClick={() => {
              setStep("email");
              setCode("");
            }}
          >
            Use a different email
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

/** The signed-in climber's profile, reloaded on demand. */
export function useProfile() {
  const auth = useAuth();
  const uid = auth?.user.id;
  const [loaded, setLoaded] = useState<{ uid: string; profile: Profile | null } | null>(null);

  const reload = useCallback(async () => {
    if (!uid) return;
    let profile: Profile | null = null;
    try {
      profile = await getMyProfile();
    } catch {
      profile = null;
    }
    setLoaded({ uid, profile });
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    getMyProfile()
      .catch(() => null)
      .then((profile) => {
        if (alive) setLoaded({ uid, profile });
      });
    return () => {
      alive = false;
    };
  }, [uid]);

  const profile =
    auth === undefined ? undefined : !uid ? null : loaded?.uid === uid ? loaded.profile : undefined;
  return { auth, profile, reload };
}

/** Pick a username so buddies can find you. */
export function ProfileForm({ profile, onSaved }: { profile: Profile | null; onSaved: () => void }) {
  const [username, setUsername] = useState(profile?.username ?? "");
  const [name, setName] = useState(profile?.display_name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await saveProfile(username, name);
          onSaved();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="username" className="label">
        Username
      </label>
      <div className="relative mt-2">
        <span aria-hidden className="muted absolute left-5 top-1/2 -translate-y-1/2 font-semibold">
          @
        </span>
        <input
          id="username"
          className="field pl-9"
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="crimp_queen"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
        />
      </div>
      <p className="muted mt-1 pl-1 text-xs">Buddies add you with this. Letters, numbers and underscores.</p>
      <label htmlFor="display" className="label mt-4">
        Name buddies see
      </label>
      <input
        id="display"
        className="field mt-2"
        placeholder="Optional"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="btn btn-ink mt-4 w-full" disabled={busy || username.length < 3}>
        {busy ? "Saving…" : "Save"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
