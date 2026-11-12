"use client";

import { ANGLES, FAIL_REASONS, GUESSES, HOLDS, STYLES, gradeLabel, labelOf } from "./constants";
import { accessToken, cloudEnabled } from "./supabase";
import {
  biggestGap,
  climbStats,
  failReasons,
  pyramid,
  reading,
  summary,
  tagProfile,
  type Window,
} from "./stats";
import type { Angle, Attempt, Climb, CoachNote, Hold, HoldColor, Session, Style } from "./types";

export const aiAvailable = cloudEnabled;

async function post<T>(path: string, body: unknown): Promise<T> {
  const token = await accessToken();
  if (!token) throw new Error("Sign in to use AI features.");
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new Error("You're offline. AI needs a connection.");
  }
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
  return data as T;
}

/* Context: a compact summary of the log, so requests stay small. */

const ALL: Window = { since: 0, until: Infinity };

function history(climbs: Climb[], attempts: Attempt[], sessions: Session[]) {
  const since = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const w: Window = { since, until: Infinity };
  const stats = climbStats(climbs, attempts);
  const sum = summary(stats, sessions, w);
  const profile = (["angle", "holds", "styles"] as const).flatMap((d) =>
    tagProfile(stats, d, w).map((r) => ({
      tag: `${d}: ${r.label}`,
      tried: r.tried,
      sent: r.sent,
      bestSend: r.topSent === null ? null : gradeLabel(r.topSent),
      attemptsPerSend: r.attemptsPerSend === null ? null : Number(r.attemptsPerSend.toFixed(1)),
    })),
  );
  const reasons = failReasons(attempts, w);
  const gap = biggestGap(
    (["angle", "holds", "styles"] as const).flatMap((d) => tagProfile(stats, d, w)),
    sum.topGrade,
  );
  return {
    period: "last 90 days",
    sessions: sum.sessions,
    climbsTried: sum.climbs,
    sends: sum.sends,
    flashRate: sum.flashRate === null ? null : Math.round(sum.flashRate * 100) + "%",
    topSend: sum.topGrade === null ? null : gradeLabel(sum.topGrade),
    weakestTag: gap ? `${gap.row.dimension}: ${gap.row.label}` : null,
    byTag: profile,
    fallReasons: reasons.rows.filter((r) => r.count > 0).map((r) => ({ reason: r.label, share: Math.round(r.share * 100) + "%" })),
    pyramid: pyramid(stats, w).map((r) => ({ grade: gradeLabel(r.grade), flashed: r.flashes, sentAfterFalls: r.sends, notSent: r.open })),
    reading: reading(stats, w),
  };
}

export function climbContext(climb: Climb, climbs: Climb[], attempts: Attempt[], sessions: Session[]) {
  const mine = attempts.filter((a) => a.climbId === climb.id).sort((a, b) => a.at - b.at);
  return {
    climb: {
      grade: gradeLabel(climb.grade),
      angle: labelOf(ANGLES, climb.angle),
      holds: climb.holds.map((h) => labelOf(HOLDS, h)),
      styles: climb.styles.map((s) => labelOf(STYLES, s)),
      name: climb.name ?? null,
      status: climb.status,
      guessedAttempts: climb.guess ? GUESSES.find((g) => g.id === climb.guess)?.label : null,
      plannedBeta: climb.plan ?? null,
      readHeldUp: climb.read ?? null,
      whatWorked: climb.whatWorked ?? null,
      attempts: mine.map((a, i) => ({
        n: i + 1,
        result: a.result,
        reason: a.reason ? labelOf(FAIL_REASONS, a.reason) : null,
        sessionDay: new Date(a.at).toISOString().slice(0, 10),
      })),
    },
    history: history(climbs, attempts, sessions),
  };
}

export function insightsContext(climbs: Climb[], attempts: Attempt[], sessions: Session[]) {
  return { history: history(climbs, attempts, sessions), allTimeTop: summary(climbStats(climbs, attempts), sessions, ALL).topGrade };
}

export async function askCoach(
  mode: "climb" | "insights",
  context: unknown,
  question?: string,
): Promise<CoachNote> {
  const out = await post<{ summary: string; practice: string[] }>("/api/ai/coach", { mode, context, question });
  return { ...out, at: Date.now(), question: question?.trim() || undefined };
}

export interface PhotoTags {
  color: HoldColor | null;
  angle: Angle;
  holds: Hold[];
  styles: Style[];
  grade: number | null;
  beta: string;
}

export async function tagsFromPhoto(jpeg: Blob): Promise<PhotoTags> {
  const image = await blobToBase64(jpeg);
  return post<PhotoTags>("/api/ai/photo", { image });
}

/* Images */

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Couldn't read the photo."));
    reader.readAsDataURL(blob);
  });
}

/** Scales a photo down to at most 1568px on its long side, as JPEG. */
export async function shrinkPhoto(file: Blob, max = 1568): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process the photo."))), "image/jpeg", 0.85),
  );
}
