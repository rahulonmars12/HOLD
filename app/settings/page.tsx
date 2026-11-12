"use client";

import { useRef, useState } from "react";
import { ConfirmButton } from "@/components/ConfirmButton";
import { clearAll, exportBackup, parseBackup, restoreBackup } from "@/lib/db";
import { buildDemo } from "@/lib/demo";
import { plural } from "@/lib/format";
import { useData } from "@/lib/hooks";

export default function SettingsPage() {
  const data = useData();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  if (!data) return null;

  const hasData = data.sessions.length + data.climbs.length > 0;
  const isDemo = data.sessions.some((s) => s.id.startsWith("demo-"));

  const download = async () => {
    const backup = await exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickmark-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
      setMessage(
        error instanceof Error ? error.message : "That backup could not be read.",
      );
    }
  };

  return (
    <main>
      <h1 className="h-page">Settings</h1>

      {message && (
        <p role="status" className="panel mt-4">
          {message}
        </p>
      )}

      <section className="mt-7">
        <h2 className="h-section">Your data</h2>
        <p className="muted mt-1">
          Your log is stored on this device only: {plural(data.sessions.length, "session")},{" "}
          {plural(data.climbs.length, "climb")}, {plural(data.attempts.length, "attempt")}.
          Clearing this browser&apos;s site data erases it, so save a backup now
          and then.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn" onClick={download} disabled={!hasData}>
            Save a backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Backup file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) restore(file);
              e.target.value = "";
            }}
          />
          {hasData ? (
            <ConfirmButton
              label="Restore a backup"
              confirmLabel="Tap again: replaces current log"
              className="btn"
              onConfirm={() => fileInput.current?.click()}
            />
          ) : (
            <button
              type="button"
              className="btn"
              onClick={() => fileInput.current?.click()}
            >
              Restore a backup
            </button>
          )}
        </div>
      </section>

      <section className="mt-9">
        <h2 className="h-section">Demo data</h2>
        <p className="muted mt-1">
          Ten weeks of made-up sessions, to see what Insights looks like once
          you have a log.
          {hasData && !isDemo && " Loading it replaces your current log, so save a backup first."}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {hasData && !isDemo ? (
            <ConfirmButton
              label="Load demo data"
              confirmLabel="Tap again: replaces current log"
              className="btn"
              onConfirm={async () => {
                await restoreBackup(buildDemo());
                setMessage("Demo data loaded. Open Insights to look around.");
              }}
            />
          ) : (
            <button
              type="button"
              className="btn"
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
              className="btn"
              onClick={async () => {
                await clearAll();
                setMessage("Demo data removed. The log is empty.");
              }}
            >
              Remove demo data
            </button>
          )}
        </div>
      </section>

      <section className="mt-9">
        <h2 className="h-section">Use it at the gym</h2>
        <p className="muted mt-1">
          Add Tickmark to your home screen from the browser&apos;s share or
          menu button. It then opens full screen and keeps working with no
          signal.
        </p>
      </section>

      {hasData && !isDemo && (
        <section className="mt-9">
          <h2 className="h-section">Start over</h2>
          <p className="muted mt-1">
            Deletes every session, climb and attempt on this device. This
            cannot be undone.
          </p>
          <div className="mt-4">
            <ConfirmButton
              label="Delete everything"
              confirmLabel="Tap again to delete everything"
              onConfirm={async () => {
                await clearAll();
                setMessage("Everything was deleted.");
              }}
            />
          </div>
        </section>
      )}
    </main>
  );
}
