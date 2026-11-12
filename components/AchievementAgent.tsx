"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { earnedIds, progressAll, rarest } from "@/lib/achievements";
import { getMeta, setMeta } from "@/lib/db";
import { useData } from "@/lib/hooks";
import { crewAchievements } from "@/lib/social";
import { useAuth } from "@/lib/supabase";
import { AchievementUnlock } from "./AchievementUnlock";

/** Screens where an unlock would get in the way; it waits until you leave them. */
const BUSY = ["/climb", "/new", "/welcome", "/persona", "/lab"];

/** Watches the log and shows the full-screen unlock for each new achievement. */
export function AchievementAgent() {
  const data = useData();
  const pathname = usePathname();
  const auth = useAuth();
  const crew = useLiveQuery(async () => (await getMeta<string[]>("crewAch")) ?? [], []);
  const [queue, setQueue] = useState<{ id: string; more: number }[]>([]);

  const earned = useMemo(
    () => (data && crew ? earnedIds(progressAll(data.sessions, data.climbs, data.attempts, crew)) : undefined),
    [data, crew],
  );
  const key = earned?.join(",");

  useEffect(() => {
    if (!earned) return;
    let alive = true;
    (async () => {
      const seen = await getMeta<string[]>("achSeen");
      if (!alive) return;
      if (seen === undefined) {
        // First run on this device: what's already earned isn't news.
        await setMeta("achSeen", earned);
        return;
      }
      const fresh = earned.filter((id) => !seen.includes(id));
      if (fresh.length === 0) return;
      await setMeta("achSeen", [...new Set([...seen, ...earned])]);
      if (!alive) return;
      // A pile at once (say, a restored backup) shows the rarest, not a parade.
      const show = fresh.length > 3 ? [{ id: rarest(fresh)!.id, more: fresh.length - 1 }] : fresh.map((id) => ({ id, more: 0 }));
      setQueue((q) => [...q, ...show]);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Crew achievements need buddies' sessions and climbs, so check online now and then.
  const uid = auth?.user.id;
  useEffect(() => {
    if (!uid) return;
    const check = async () => {
      try {
        const { db } = await import("@/lib/db");
        const [sessions, climbs] = await Promise.all([db.sessions.toArray(), db.climbs.toArray()]);
        const problems = climbs.filter((c) => c.status === "sent" && c.problemId).map((c) => c.problemId!);
        const got = await crewAchievements(sessions, problems);
        const had = (await getMeta<string[]>("crewAch")) ?? [];
        const all = [...new Set([...had, ...got])];
        if (all.length !== had.length) await setMeta("crewAch", all);
      } catch {
        // Offline or not set up: try again later.
      }
    };
    void check();
    const t = setInterval(check, 10 * 60_000);
    return () => clearInterval(t);
  }, [uid]);

  const current = queue[0];
  if (!current || BUSY.some((p) => pathname.startsWith(p))) return null;
  return <AchievementUnlock key={current.id} id={current.id} more={current.more} onDone={() => setQueue((q) => q.slice(1))} />;
}
