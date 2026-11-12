"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyProfile, saveProfile, type Profile } from "@/lib/social";
import {
  MIN_PASSWORD,
  USERNAME_RULE,
  changePassword,
  cleanUsername,
  cloudEnabled,
  cloudProblem,
  createAccount,
  signIn,
  useAuth,
} from "@/lib/supabase";

/** Sign in or create an account with a username and password. No email needed. */
export function SignIn({ intro }: { intro?: string }) {
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cloudEnabled && cloudProblem) {
    return (
      <p role="alert" className="text-sm font-semibold leading-relaxed text-danger">
        {cloudProblem} Then redeploy.
      </p>
    );
  }
  if (!cloudEnabled) {
    return (
      <p className="muted text-sm leading-relaxed">
        Accounts aren&apos;t set up for this copy of HOLD! yet. Once the Supabase settings are added in
        Vercel, you can sign in here to sync between devices and climb with buddies.
      </p>
    );
  }

  const creating = mode === "create";
  const clean = cleanUsername(username);
  const ready = USERNAME_RULE.test(clean) && password.length >= (creating ? MIN_PASSWORD : 1);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          if (creating) await createAccount(clean, password, name);
          else await signIn(clean, password);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {intro && <p className="muted mb-3 text-sm leading-relaxed">{intro}</p>}
      <div role="group" aria-label="Account" className="segmented mb-4 w-full bg-wall">
        {(
          [
            ["signin", "Sign in"],
            ["create", "New account"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            className="flex-1 justify-center"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <label htmlFor="username" className="label">
        Username
      </label>
      <div className="relative mt-2">
        <span aria-hidden className="muted absolute left-5 top-1/2 -translate-y-1/2 font-semibold">
          @
        </span>
        <input
          id="username"
          name="username"
          className="field pl-9"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="crimp_queen"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
        />
      </div>
      {creating && (
        <p className="muted mt-1 pl-1 text-xs">Buddies add you with this. Letters, numbers and underscores.</p>
      )}

      <label htmlFor="password" className="label mt-4">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        className="field mt-2"
        autoComplete={creating ? "new-password" : "current-password"}
        placeholder={creating ? `At least ${MIN_PASSWORD} characters` : ""}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {creating && (
        <>
          <p className="muted mt-1 pl-1 text-xs">
            There&apos;s no email reset, so let your phone save it.
          </p>
          <label htmlFor="display" className="label mt-4">
            Name buddies see
          </label>
          <input
            id="display"
            className="field mt-2"
            placeholder="Optional"
            autoComplete="nickname"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </>
      )}

      <button type="submit" className="btn btn-ink mt-4 w-full" disabled={busy || !ready}>
        {busy ? (creating ? "Creating…" : "Signing in…") : creating ? "Create account" : "Sign in"}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

/** Set a new password while signed in. */
export function PasswordForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await changePassword(password);
          onDone();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't change it.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="new-password" className="label">
        New password
      </label>
      <input
        id="new-password"
        type="password"
        className="field mt-2"
        autoComplete="new-password"
        placeholder={`At least ${MIN_PASSWORD} characters`}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn btn-soft flex-1" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-ink flex-1" disabled={busy || password.length < MIN_PASSWORD}>
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
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

/** The name buddies see; the username is fixed once chosen because it signs you in. */
export function ProfileForm({ profile, onSaved }: { profile: Profile | null; onSaved: () => void }) {
  const fixed = profile?.username ?? null;
  const [username, setUsername] = useState(fixed ?? "");
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
          await saveProfile(fixed ?? username, name);
          onSaved();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't save.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {!fixed && (
        <>
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
          <p className="muted mb-4 mt-1 pl-1 text-xs">Buddies add you with this. Letters, numbers and underscores.</p>
        </>
      )}
      <label htmlFor="display" className="label">
        Name buddies see
      </label>
      <input
        id="display"
        className="field mt-2"
        placeholder="Optional"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="submit" className="btn btn-ink mt-4 w-full" disabled={busy || (!fixed && username.length < 3)}>
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
