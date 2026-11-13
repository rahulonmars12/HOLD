"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { earnedIds, progressAll } from "@/lib/achievements";
import { colorLabel, gradeLabel, gymKey } from "@/lib/constants";
import { getMeta, setMeta } from "@/lib/db";
import { useData } from "@/lib/hooks";
import { sfx } from "@/lib/sfx";
import { nudgesSince, publishEvent, publishPins, type Nudge } from "@/lib/social";
import { useAuth } from "@/lib/supabase";
import { NudgeToast } from "./Crew";

/**
 * Keeps buddies in the loop: shares your pins, and shows a small banner when a
 * buddy cheers you, sends one of your projects or arrives at your gym.
 */
export function CrewAgent() {
  const auth = useAuth();
  const uid = auth?.user.id;
  const data = useData();
  const crew = useLiveQuery(async () => (await getMeta<string[]>("crewAch")) ?? [], []);
  const [queue, setQueue] = useState<Nudge[]>([]);

  const earned = useMemo(
    () => (data && crew ? earnedIds(progressAll(data.sessions, data.climbs, data.attempts, crew)) : undefined),
    [data, crew],
  );
  const pinKey = earned ? [...earned].sort().join(",") : undefined;

  // Share pins on the profile; new ones also go in the crew feed.
  useEffect(() => {
    if (!uid || !earned || pinKey === undefined) return;
    (async () => {
      const shared = await getMeta<{ uid: string; pins: string[] }>("pinsShared");
      const before = shared?.uid === uid ? shared.pins : undefined;
      if (before && [...before].sort().join(",") === pinKey) return;
      try {
        await publishPins(earned);
        // The first time, everything already earned isn't news.
        if (before) for (const id of earned.filter((p) => !before.includes(p)).slice(0, 5)) await publishEvent("pin", id);
        await setMeta("pinsShared", { uid, pins: earned });
      } catch {
        // Database without crew features yet (migration 0005), or offline: try again later.
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, pinKey]);

  // Look for news about you every so often while the app is open.
  const projects = useMemo(
    () =>
      (data?.climbs ?? [])
        .filter((c) => c.status === "project" && c.problemId)
        .map((c) => ({ problemId: c.problemId!, label: c.name || `${colorLabel(c.color).toLowerCase()} ${gradeLabel(c.grade)}` })),
    [data],
  );
  const projectKey = projects.map((p) => p.problemId).join(",");
  const activeGym = data?.active ? gymKey(data.active.gym) : undefined;

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    const check = async () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      try {
        const last = await getMeta<{ uid: string; at: number; ids: string[] }>("nudgeSeen");
        const mine = last?.uid === uid ? last : undefined;
        const now = Date.now();
        // Never reach back further than a day, so a long break doesn't flood the screen.
        const since = Math.max(mine?.at ?? now - 3_600_000, now - 86_400_000);
        const found = await nudgesSince(since, projects, activeGym);
        const fresh = found.filter((n) => !mine?.ids.includes(n.id));
        await setMeta("nudgeSeen", { uid, at: now - 120_000, ids: [...(mine?.ids ?? []), ...fresh.map((n) => n.id)].slice(-60) });
        if (alive && fresh.length) setQueue((q) => [...q, ...fresh].slice(0, 4));
      } catch {
        // Offline, or the database has no cheers yet.
      }
    };
    const first = setTimeout(check, 4000);
    const t = setInterval(check, 75_000);
    const onShow = () => void check();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(t);
      document.removeEventListener("visibilitychange", onShow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, projectKey, activeGym]);

  const current = queue[0];
  const currentId = current?.id;
  useEffect(() => {
    if (!currentId) return;
    sfx("cheer");
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 6000);
    return () => clearTimeout(t);
  }, [currentId]);

  if (!current) return null;
  return <NudgeToast key={current.id} nudge={current} onClose={() => setQueue((q) => q.slice(1))} />;
}
