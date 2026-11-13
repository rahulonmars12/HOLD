"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { PasswordForm, ProfileForm, SignIn, useProfile } from "@/components/Account";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CornerHold } from "@/components/Hold";
import { clearAll, exportBackup, forgetDevice, parseBackup, removeCustomColor, restoreBackup } from "@/lib/db";
import { buildDemo } from "@/lib/demo";
import { plural, timeLabel } from "@/lib/format";
import { useCustomColors, useData } from "@/lib/hooks";
import { supabase, usernameOf } from "@/lib/supabase";
import { setSoundOn, sfx, soundOn, subscribeSound } from "@/lib/sfx";
import { setTheme, useTheme } from "@/lib/theme";
import { REST_CHOICES, setRestSeconds, useRestSetting } from "@/lib/rest";
import { syncNow, useSyncStatus } from "@/lib/sync";

export default function SettingsPage() {
  const data = useData();
  const colors = useCustomColors();
  const { auth, profile, reload } = useProfile();
  const sync = useSyncStatus();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  if (!data) return null;

  const hasData = data.sessions.length + data.climbs.length > 0;
  const isDemo = data.sessions.some((s) => s.id.startsWith("demo-"));

  const download = async () => {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hold-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(
      `Backup saved: ${plural(backup.sessions.length, "session")}, ${plural(backup.climbs.length, "climb")}, ${plural(backup.attempts.length, "attempt")}.`,
    );
  };

  const restore = async (file: File) => {
    try {
      const backup = parseBackup(await file.text());
      await restoreBackup(backup);
      setMessage(
        `Backup restored: ${plural(backup.sessions.length, "session")}, ${plural(backup.climbs.length, "climb")}, ${plural(backup.attempts.length, "attempt")}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That backup could not be read.");
    }
  };

  const syncLine =
    sync.state === "syncing"
      ? "Syncing…"
      : sync.state === "offline"
        ? "Offline. Changes will sync when you're back online."
        : sync.state === "error"
          ? `Sync failed: ${sync.error}`
          : sync.lastSyncedAt
            ? `Synced at ${timeLabel(sync.lastSyncedAt)}.`
            : "Waiting to sync.";

  return (
    <main>
      <CornerHold kind="pocket" fill="#C9D1E8" shade="#B3BDDB" rotate={-18} size={220} right={-70} top={-76} />
      <h1 className="h-page relative">Settings</h1>

      {message && (
        <p role="status" className="relative mt-4 rounded-[1.25rem] bg-white px-4 py-3 text-[0.9375rem] font-semibold">
          {message}
        </p>
      )}

      <section className="card relative mt-6">
        <h2 className="h-card">Account</h2>
        {auth === undefined ? null : !auth ? (
          <div className="mt-3">
            <SignIn intro="Sign in to back up your log, use it on more than one device, get AI coaching and climb with buddies. Your log stays usable offline." />
          </div>
        ) : (
          <>
            <p className="mt-2 text-[0.9375rem]">
              Signed in as <strong>@{profile?.username ?? usernameOf(auth)}</strong>
            </p>
            <p className={`mt-1 text-sm ${sync.state === "error" ? "font-semibold text-danger" : "muted"}`}>{syncLine}</p>
            {changingPassword ? (
              <div className="mt-4">
                <PasswordForm
                  onDone={() => setChangingPassword(false)}
                />
              </div>
            ) : editingProfile || (profile !== undefined && !profile?.username) ? (
              <div className="mt-4">
                <ProfileForm
                  profile={profile ?? null}
                  onSaved={() => {
                    setEditingProfile(false);
                    void reload();
                  }}
                />
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className="btn btn-soft flex-1" onClick={() => void syncNow()}>
                  Sync now
                </button>
                <button type="button" className="btn btn-soft flex-1" onClick={() => setEditingProfile(true)}>
                  Edit name
                </button>
                <button type="button" className="btn btn-soft w-full" onClick={() => setChangingPassword(true)}>
                  Change password
                </button>
              </div>
            )}
            <ConfirmButton
              label="Sign out"
              confirmLabel="Tap again: clears this device"
              className="btn btn-quiet mt-2 w-full text-[0.9375rem]"
              onConfirm={async () => {
                await syncNow();
                await supabase()?.auth.signOut();
                await forgetDevice();
                setMessage("Signed out. Your log is safe in your account; sign in again to bring it back.");
              }}
            />
          </>
        )}
      </section>

      <section className="card mt-3">
        <h2 className="h-card">Your data</h2>
        <dl className="mt-3.5 grid grid-cols-3 gap-2 text-center">
          {[
            [data.sessions.length, "sessions"],
            [data.climbs.length, "climbs"],
            [data.attempts.length, "attempts"],
          ].map(([n, l]) => (
            <div key={l} className="rounded-[1.25rem] bg-wall px-1 py-2.5">
              <dd className="display text-xl">{n}</dd>
              <dt className="muted text-xs font-semibold">{l}</dt>
            </div>
          ))}
        </dl>
        <p className="muted mt-3.5 text-sm leading-relaxed">
          {auth
            ? "Your log is on this phone and in your account."
            : "Your log lives on this phone only. Clearing the browser's site data erases it, so save a backup now and then, or sign in."}
        </p>
        <div className="mt-3.5 flex gap-2">
          <button type="button" className="btn btn-ink flex-1" onClick={download} disabled={!hasData}>
            Back up
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Backup file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void restore(file);
              e.target.value = "";
            }}
          />
          {hasData ? (
            <ConfirmButton
              label="Restore"
              confirmLabel="Replaces log: tap again"
              className="btn btn-soft flex-1"
              onConfirm={() => fileInput.current?.click()}
            />
          ) : (
            <button type="button" className="btn btn-soft flex-1" onClick={() => fileInput.current?.click()}>
              Restore
            </button>
          )}
        </div>
      </section>

      <ThemeCard />
      <SoundCard />
      <RestCard />

      <section className="card mt-3">
        <h2 className="h-card">Your colours</h2>
        {colors.length === 0 ? (
          <p className="muted mt-1.5 text-sm">Hold colours you add when logging a climb show up here.</p>
        ) : (
          <ul className="mt-2">
            {colors.map((c) => (
              <li key={c.hex} className="flex min-h-[3.25rem] items-center gap-3">
                <span aria-hidden className="h-8 w-8 rounded-full" style={{ background: c.hex }} />
                <span className="flex-1 font-semibold">{c.label}</span>
                <button type="button" className="btn btn-soft min-h-9 px-3.5 text-sm" onClick={() => removeCustomColor(c.hex)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-3">
        <h2 className="h-card">Use it at the gym</h2>
        <p className="muted mt-2 text-sm leading-relaxed">
          Add HOLD! to your home screen from the browser&apos;s share or menu button. It opens full screen and keeps
          logging with no signal.
        </p>
      </section>

      <section id="demo" className="card mt-3 scroll-mt-6">
        <h2 className="h-card">Demo and animations</h2>
        <p className="muted mt-2 text-sm leading-relaxed">
          Watch every celebration on demand: achievement unlocks, persona evolutions, the send shower and all the
          sounds.
        </p>
        <Link href="/lab" className="btn btn-ink mt-3 w-full">
          Open the animation lab
        </Link>
        <h3 className="mt-5 text-[0.9375rem] font-bold">Demo data</h3>
        {auth ? (
          <p className="muted mt-2 text-sm leading-relaxed">
            Demo data isn&apos;t available while signed in, so it never mixes with your real log.
          </p>
        ) : (
          <>
            <p className="muted mt-2 text-sm leading-relaxed">
              Ten weeks of made-up sessions, to see what Insights looks like once you have a log.
              {hasData && !isDemo && " Loading it replaces your current log, so save a backup first."}
            </p>
            <div className="mt-3 flex gap-2">
              {hasData && !isDemo ? (
                <ConfirmButton
                  label="Load demo data"
                  confirmLabel="Replaces log: tap again"
                  className="btn btn-soft flex-1"
                  onConfirm={async () => {
                    await restoreBackup(buildDemo());
                    setMessage("Demo data loaded. Open Insights to look around.");
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="btn btn-soft flex-1"
                  onClick={async () => {
                    await restoreBackup(buildDemo());
                    setMessage("Demo data loaded. Open Insights to look around.");
                  }}
                >
                  {isDemo ? "Reload demo data" : "Load demo data"}
                </button>
              )}
              {isDemo && (
                <button
                  type="button"
                  className="btn btn-soft flex-1"
                  onClick={async () => {
                    await forgetDevice();
                    setMessage("Demo data removed. The log is empty.");
                  }}
                >
                  Remove demo
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {hasData && !isDemo && (
        <section className="mt-6 px-1">
          <h2 className="text-[0.9375rem] font-bold">Start over</h2>
          <p className="muted mt-1.5 text-sm leading-relaxed">
            Deletes every session, climb and attempt{auth ? ", here and in your account" : " on this phone"}. This
            can&apos;t be undone.
          </p>
          <ConfirmButton
            label="Delete everything"
            confirmLabel="Tap again to delete everything"
            className="btn btn-danger mt-3 w-full"
            onConfirm={async () => {
              await clearAll();
              setMessage("Everything was deleted.");
            }}
          />
        </section>
      )}
    </main>
  );
}

function ThemeCard() {
  const theme = useTheme();
  return (
    <section className="card mt-3">
      <h2 className="h-card" id="theme-label">
        Appearance
      </h2>
      <div role="radiogroup" aria-labelledby="theme-label" className="mt-3 grid grid-cols-3 gap-2">
        {(["system", "light", "dark"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={theme === t}
            className={`btn min-h-12 px-2 text-sm ${theme === t ? "btn-ink" : "btn-soft"}`}
            onClick={() => setTheme(t)}
          >
            {t === "system" ? "Match phone" : t === "light" ? "Light" : "Dark"}
          </button>
        ))}
      </div>
    </section>
  );
}

function RestCard() {
  const seconds = useRestSetting();
  return (
    <section className="card mt-3">
      <h2 className="h-card" id="rest-label">
        Rest timer
      </h2>
      <p className="muted mt-1 text-sm leading-relaxed">
        Starts after each fall and chimes when you&apos;re rested. Tap the ring on a climb to skip it.
      </p>
      <div role="radiogroup" aria-labelledby="rest-label" className="mt-3 grid grid-cols-4 gap-2">
        {REST_CHOICES.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={seconds === n}
            className={`btn min-h-12 px-2 text-sm ${seconds === n ? "btn-ink" : "btn-soft"}`}
            onClick={() => setRestSeconds(n)}
          >
            {n === 0 ? "Off" : `${n / 60} min`}
          </button>
        ))}
      </div>
    </section>
  );
}

function SoundCard() {
  const on = useSyncExternalStore(subscribeSound, soundOn, () => true);
  return (
    <section className="card mt-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="h-card" id="sound-label">
            Sounds and buzzes
          </h2>
          <p className="muted mt-1 text-sm leading-relaxed">
            Little sounds for each tap, fall and send. On iPhone the silent switch mutes them.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby="sound-label"
          data-sfx="none"
          onClick={() => {
            setSoundOn(!on);
            if (!on) sfx("save");
          }}
          className={`relative h-9 w-16 flex-none rounded-full transition-colors ${on ? "bg-ink" : "bg-line"}`}
        >
          <span
            aria-hidden
            className="absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-[left] duration-200"
            style={{ left: on ? "2rem" : "0.25rem" }}
          />
        </button>
      </div>
    </section>
  );
}
