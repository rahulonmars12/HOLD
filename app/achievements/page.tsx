"use client";

import { Loading } from "@/components/Loading";
import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AchievementUnlock } from "@/components/AchievementUnlock";
import { Badge } from "@/components/Badge";
import { ACHIEVEMENTS, CATEGORIES, RARITY_LABEL, progressAll } from "@/lib/achievements";
import { getMeta } from "@/lib/db";
import { useData } from "@/lib/hooks";

/** The pin board: every achievement, numbered, earned or still to get. */
export default function AchievementsPage() {
  const data = useData();
  const crew = useLiveQuery(async () => (await getMeta<string[]>("crewAch")) ?? [], []);
  const [replay, setReplay] = useState<string | null>(null);
  const progress = useMemo(
    () => (data && crew ? progressAll(data.sessions, data.climbs, data.attempts, crew) : undefined),
    [data, crew],
  );
  if (!progress) return <Loading />;
  const earned = ACHIEVEMENTS.filter((a) => progress[a.id]?.earned).length;

  return (
    <main className="pb-6">
      <Link href="/insights" aria-label="Back to Insights" className="relative flex h-[2.875rem] w-[2.875rem] items-center justify-center rounded-full bg-white">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1E1B3A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 4l-6 6 6 6" />
        </svg>
      </Link>
      <h1 className="h-page mt-4">Achievements</h1>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white">
          <div className="grow-x h-3 rounded-full bg-ink" style={{ width: `${(earned / ACHIEVEMENTS.length) * 100}%` }} />
        </div>
        <span className="text-[0.9375rem] font-bold">
          {earned} of {ACHIEVEMENTS.length}
        </span>
      </div>
      <p className="muted mt-2 text-sm">Tap a pin you&apos;ve earned to watch it again.</p>

      {CATEGORIES.map((cat) => {
        const list = ACHIEVEMENTS.filter((a) => a.category === cat);
        const got = list.filter((a) => progress[a.id]?.earned).length;
        return (
          <section key={cat} className="card mt-4">
            <div className="flex items-baseline justify-between">
              <h2 className="h-card">{cat}</h2>
              <span className="muted text-sm font-bold">
                {got} of {list.length}
              </span>
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-x-2 gap-y-4">
              {list.map((a) => {
                const p = progress[a.id];
                const inner = (
                  <>
                    <Badge id={a.id} size={84} locked={!p.earned} />
                    <span className="muted block text-[0.6875rem] font-bold">No. {String(a.no).padStart(2, "0")}</span>
                    <span className={`block text-[0.8125rem] font-bold leading-tight ${p.earned ? "" : "text-muted"}`}>{a.name}</span>
                    {p.earned ? (
                      <span className="muted mt-0.5 block text-[0.6875rem]">{RARITY_LABEL[a.rarity]}</span>
                    ) : p.need ? (
                      <span className="mt-1 block w-full">
                        <span className="block h-1.5 overflow-hidden rounded-full bg-wall">
                          <span className="block h-1.5 rounded-full bg-ink" style={{ width: `${((p.have ?? 0) / p.need) * 100}%` }} />
                        </span>
                        <span className="muted mt-0.5 block text-[0.6875rem]">
                          {p.have} of {p.need.toLocaleString()}
                        </span>
                      </span>
                    ) : (
                      <span className="muted mt-0.5 block text-[0.6875rem] leading-snug">{a.hint}</span>
                    )}
                  </>
                );
                return (
                  <li key={a.id} className="min-w-0 text-center">
                    {p.earned ? (
                      <button type="button" className="flex w-full flex-col items-center" onClick={() => setReplay(a.id)} aria-label={`Watch ${a.name} again`}>
                        {inner}
                      </button>
                    ) : (
                      <div className="flex flex-col items-center">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      {replay && <AchievementUnlock key={replay} id={replay} onDone={() => setReplay(null)} />}
    </main>
  );
}
