import { climbStats, tagProfile, biggestGap, type Dimension } from "./stats";
import type { Attempt, Climb } from "./types";

/**
 * The weekly mission: a small, winnable goal built from your "Work on" weakness.
 * It is chosen once at the start of the week and kept, so it doesn't move as you log.
 */
export interface MissionPlan {
  /** Monday 00:00 local, in ms. */
  week: number;
  kind: "tag" | "new";
  dimension?: Dimension;
  id?: string;
  label: string;
  need: number;
}

export interface Mission extends MissionPlan {
  have: number;
  done: boolean;
  title: string;
  why: string;
}

export function weekStart(now: number) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.getTime();
}

const NEED = 3;

/** Picks this week's mission from the last 90 days. */
export function planMission(climbs: Climb[], attempts: Attempt[], now: number): MissionPlan {
  const week = weekStart(now);
  // Judge the weakness on what was known before this week began.
  const before = attempts.filter((a) => a.at < week);
  const stats = climbStats(climbs, before);
  const w = { since: week - 90 * 86_400_000, until: week };
  const top = Math.max(-1, ...stats.filter((s) => s.sent && (s.sentAt ?? 0) >= w.since).map((s) => s.climb.grade));
  const rows = (["angle", "holds", "styles"] as const).flatMap((d) => tagProfile(stats, d, w));
  const gap = biggestGap(rows, top < 0 ? null : top);
  if (gap) return { week, kind: "tag", dimension: gap.row.dimension, id: gap.row.id, label: gap.row.label, need: NEED };
  return { week, kind: "new", label: "new climbs", need: NEED };
}

const tagsOf = (c: Climb, d: Dimension): string[] => (d === "angle" ? [c.angle] : d === "holds" ? c.holds : c.styles);

/** Where the mission stands: climbs that count are ones you tried this week. */
export function missionProgress(plan: MissionPlan, climbs: Climb[], attempts: Attempt[]): Mission {
  const tried = new Set(attempts.filter((a) => a.at >= plan.week && a.at < plan.week + 7 * 86_400_000).map((a) => a.climbId));
  const counted = climbs.filter((c) => {
    if (!tried.has(c.id)) return false;
    if (plan.kind === "tag" && plan.dimension && plan.id) return tagsOf(c, plan.dimension).includes(plan.id);
    return c.createdAt >= plan.week;
  });
  const have = Math.min(plan.need, counted.length);
  const label = plan.label.toLowerCase();
  return {
    ...plan,
    have,
    done: have >= plan.need,
    title:
      plan.kind === "tag"
        ? plan.dimension === "angle"
          ? `Try ${plan.need} ${label} climbs`
          : `Try ${plan.need} climbs with ${label}`
        : `Try ${plan.need} new climbs`,
    why:
      plan.kind === "tag"
        ? `${plan.label} is where your grades lag. Sends don't matter here, goes do.`
        : "No weak spot found yet, so go and explore the wall.",
  };
}
