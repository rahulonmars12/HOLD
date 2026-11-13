"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { getMeta, setMeta } from "@/lib/db";
import type { Data } from "@/lib/hooks";
import { missionProgress, planMission, weekStart, type MissionPlan } from "@/lib/mission";
import { sfx } from "@/lib/sfx";
import { HoldRain } from "./HoldRain";

/** This week's mission with a progress ring. Celebrates once when it's completed. */
export function MissionCard({ data, now, className = "" }: { data: Data; now: number; className?: string }) {
  const week = weekStart(now);
  const saved = useLiveQuery(async () => (await getMeta<MissionPlan>("mission")) ?? null, []);
  const celebrated = useLiveQuery(async () => (await getMeta<number>("missionDone")) ?? 0, []);
  const [party, setParty] = useState(false);

  // Choose the mission once per week and keep it.
  const fresh = useMemo(() => planMission(data.climbs, data.attempts, now), [data.climbs, data.attempts, now]);
  const plan = saved && saved.week === week ? saved : saved === undefined ? undefined : fresh;
  const stale = saved !== undefined && (!saved || saved.week !== week);
  useEffect(() => {
    if (stale && data.climbs.length > 0) void setMeta("mission", fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale, week]);

  const mission = plan ? missionProgress(plan, data.climbs, data.attempts) : undefined;
  const done = mission?.done;
  useEffect(() => {
    if (!done || celebrated === undefined || celebrated === week) return;
    let alive = true;
    (async () => {
      await setMeta("missionDone", week);
      if (!alive) return;
      setParty(true);
      sfx("mission");
    })();
    return () => {
      alive = false;
    };
  }, [done, celebrated, week]);

  if (!mission || data.climbs.length === 0) return null;
  const r = 21;
  const round = 2 * Math.PI * r;
  return (
    <section className={`relative flex items-center gap-3.5 rounded-[1.75rem] px-4 py-3.5 ${mission.done ? "bg-mint" : "bg-white"} ${className}`} aria-label="This week's mission">
      <span className="relative flex h-14 w-14 flex-none items-center justify-center">
        <svg width="56" height="56" viewBox="0 0 56 56" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="28" cy="28" r={r} fill="none" stroke={mission.done ? "#FFFFFF" : "var(--color-wall)"} strokeWidth="6" />
          <circle
            cx="28"
            cy="28"
            r={r}
            fill="none"
            stroke={mission.done ? "#1E1B3A" : "#F06C5B"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={round}
            strokeDashoffset={round * (1 - mission.have / mission.need)}
            style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.2, 1, 0.4, 1)" }}
          />
        </svg>
        {mission.done ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className="relative" aria-hidden>
            <path d="M5 12l5 5 9-10" />
          </svg>
        ) : (
          <span className="display relative text-[0.9375rem] tabular-nums">
            {mission.have}/{mission.need}
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-xs font-bold ${mission.done ? "" : "muted"}`}>{mission.done ? "Mission complete!" : "This week's mission"}</span>
        <span className="display block text-[1.0625rem] leading-tight">{mission.title}</span>
        <span className={`mt-0.5 block text-[0.8125rem] leading-snug ${mission.done ? "" : "muted"}`}>
          {mission.done ? "Nice work. A new one lands on Monday." : mission.why}
        </span>
      </span>
      {party && <HoldRain />}
    </section>
  );
}
