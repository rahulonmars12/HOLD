"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { db, getCustomColors } from "./db";
import { photoUrl } from "./social";
import type { Attempt, Climb, CustomColor, Session } from "./types";

export interface Data {
  sessions: Session[];
  climbs: Climb[];
  attempts: Attempt[];
  active?: Session;
}

/**
 * Everything in the log, kept live. A personal log is a few thousand rows at
 * most, so loading it whole keeps every screen simple and instant.
 * Returns undefined until the first read finishes.
 */
export function useData(): Data | undefined {
  return useLiveQuery(async () => {
    const [sessions, climbs, attempts] = await Promise.all([
      db.sessions.toArray(),
      db.climbs.toArray(),
      db.attempts.toArray(),
    ]);
    const active = sessions
      .filter((s) => s.endedAt === undefined)
      .sort((a, b) => b.startedAt - a.startedAt)[0];
    return { sessions, climbs, attempts, active };
  }, []);
}

export function useCustomColors(): CustomColor[] {
  return useLiveQuery(getCustomColors, []) ?? [];
}

/** The current time, refreshed every half minute, for elapsed-time labels. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** A displayable URL for a climb's photo: the local copy, else the cloud copy. */
export function usePhoto(climbId: string | undefined, path?: string): string | null {
  const local = useLiveQuery(async () => (climbId ? db.photos.get(climbId) : undefined), [climbId]);
  const localUrl = useMemo(() => (local?.blob ? URL.createObjectURL(local.blob) : null), [local]);
  const [remote, setRemote] = useState<{ path: string; url: string | null } | null>(null);

  useEffect(() => () => {
    if (localUrl) URL.revokeObjectURL(localUrl);
  }, [localUrl]);

  useEffect(() => {
    if (localUrl || !path) return;
    let alive = true;
    photoUrl(path).then((url) => {
      if (alive) setRemote({ path, url });
    });
    return () => {
      alive = false;
    };
  }, [localUrl, path]);

  return localUrl ?? (remote && remote.path === path ? remote.url : null);
}
