"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "./db";
import type { Attempt, Climb, Session } from "./types";

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

/** The current time, refreshed every half minute, for elapsed-time labels. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
