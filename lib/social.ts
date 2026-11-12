"use client";

import { gymKey } from "./constants";
import { supabase } from "./supabase";
import type { Angle, Attempt, Climb, Hold, HoldColor, Session, Style } from "./types";

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
}

export interface BuddyLink {
  other: Profile;
  status: "pending" | "accepted";
  /** True when the other climber sent the request. */
  incoming: boolean;
}

export interface Problem {
  id: string;
  created_by: string;
  gym_key: string;
  gym: string;
  grade: number;
  color: HoldColor;
  angle: Angle;
  holds: Hold[];
  styles: Style[];
  name: string | null;
  photo_path: string | null;
  retired: boolean;
  created_at: string;
}

function sb() {
  const client = supabase();
  if (!client) throw new Error("Accounts are not set up yet.");
  return client;
}

async function uid() {
  const { data } = await sb().auth.getUser();
  if (!data.user) throw new Error("Sign in first.");
  return data.user.id;
}

export const nameOf = (p?: Profile | null) =>
  p?.display_name || (p?.username ? `@${p.username}` : "A buddy");

/* Profile */

/** Personas are shared on the profile so buddies can see them. Needs migration 0004. */
export async function publishPersona(persona: string, dash: string) {
  const me = await uid();
  const { error } = await sb().from("profiles").update({ persona, persona_dash: dash }).eq("id", me);
  if (error) throw new Error(error.message);
}

/** Buddies' personas by id. Empty when the database doesn't have personas yet. */
export async function personasOf(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  try {
    const { data, error } = await sb().from("profiles").select("id, persona").in("id", ids);
    if (error || !data) return new Map();
    return new Map((data as { id: string; persona: string | null }[]).filter((p) => p.persona).map((p) => [p.id, p.persona!]));
  } catch {
    return new Map();
  }
}

export async function getMyProfile(): Promise<Profile | null> {
  const me = await uid();
  const { data, error } = await sb().from("profiles").select("id, username, display_name").eq("id", me).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Profile | null;
}

export async function saveProfile(username: string, displayName: string) {
  const me = await uid();
  const clean = username.trim().toLowerCase().replace(/^@/, "");
  if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
    throw new Error("Usernames are 3 to 20 letters, numbers or underscores.");
  }
  const { error } = await sb()
    .from("profiles")
    .upsert({ id: me, username: clean, display_name: displayName.trim() || null });
  if (error) {
    if (error.code === "23505") throw new Error("That username is taken.");
    throw new Error(error.message);
  }
}

async function profilesById(ids: string[]): Promise<Map<string, Profile>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data, error } = await sb().from("profiles").select("id, username, display_name").in("id", unique);
  if (error) throw new Error(error.message);
  return new Map((data as Profile[]).map((p) => [p.id, p]));
}

/* Buddies */

const pair = (a: string, b: string) => (a < b ? { user_a: a, user_b: b } : { user_a: b, user_b: a });

export async function listBuddies(): Promise<BuddyLink[]> {
  const me = await uid();
  const { data, error } = await sb().from("buddies").select("user_a, user_b, requested_by, status");
  if (error) throw new Error(error.message);
  const rows = data as { user_a: string; user_b: string; requested_by: string; status: "pending" | "accepted" }[];
  const others = rows.map((r) => (r.user_a === me ? r.user_b : r.user_a));
  const profiles = await profilesById(others);
  return rows.map((r, i) => ({
    other: profiles.get(others[i]) ?? { id: others[i], username: null, display_name: null },
    status: r.status,
    incoming: r.requested_by !== me,
  }));
}

export async function requestBuddy(username: string) {
  const me = await uid();
  const clean = username.trim().toLowerCase().replace(/^@/, "");
  const { data, error } = await sb().from("profiles").select("id").eq("username", clean).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`No climber called @${clean}.`);
  if (data.id === me) throw new Error("That's you.");
  const { error: e2 } = await sb()
    .from("buddies")
    .insert({ ...pair(me, data.id), requested_by: me, status: "pending" });
  if (e2) {
    if (e2.code === "23505") throw new Error(`You and @${clean} are already connected or have a request open.`);
    throw new Error(e2.message);
  }
}

export async function acceptBuddy(otherId: string) {
  const me = await uid();
  const { error } = await sb().from("buddies").update({ status: "accepted" }).match(pair(me, otherId));
  if (error) throw new Error(error.message);
}

export async function removeBuddy(otherId: string) {
  const me = await uid();
  const { error } = await sb().from("buddies").delete().match(pair(me, otherId));
  if (error) throw new Error(error.message);
}

/* What buddies are doing */

export interface LiveSession {
  who: Profile;
  session: Session;
}

/** Buddies with a session started in the last eight hours and not yet ended. */
export async function climbingNow(): Promise<LiveSession[]> {
  const me = await uid();
  const since = Date.now() - 8 * 60 * 60 * 1000;
  const { data, error } = await sb()
    .from("sessions")
    .select("user_id, data")
    .neq("user_id", me)
    .eq("deleted", false)
    .is("ended_at", null)
    .gt("started_at", since)
    .order("started_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data as { user_id: string; data: Session }[];
  const profiles = await profilesById(rows.map((r) => r.user_id));
  return rows.map((r) => ({ who: profiles.get(r.user_id)!, session: r.data })).filter((r) => r.who);
}

export interface BuddySend {
  who: Profile;
  climb: Climb;
}

export async function recentSends(days = 21): Promise<BuddySend[]> {
  const me = await uid();
  const since = Date.now() - days * 24 * 60 * 60 * 1000;
  const { data, error } = await sb()
    .from("climbs")
    .select("user_id, data")
    .neq("user_id", me)
    .eq("deleted", false)
    .eq("status", "sent")
    .gt("sent_at", since)
    .order("sent_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  const rows = data as { user_id: string; data: Climb }[];
  const profiles = await profilesById(rows.map((r) => r.user_id));
  return rows.map((r) => ({ who: profiles.get(r.user_id)!, climb: r.data })).filter((r) => r.who);
}

/* Shared gym problems */

export async function gymProblems(gym: string): Promise<Problem[]> {
  const { data, error } = await sb()
    .from("problems")
    .select("*")
    .eq("gym_key", gymKey(gym))
    .eq("retired", false)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(error.message);
  return data as Problem[];
}

/** Publishes a newly added climb as a gym problem buddies can log against. */
export async function createProblem(climb: Climb, problemId: string) {
  const { error } = await sb()
    .from("problems")
    .insert({
      id: problemId,
      gym_key: gymKey(climb.gym),
      gym: climb.gym,
      grade: climb.grade,
      color: climb.color,
      angle: climb.angle,
      holds: climb.holds,
      styles: climb.styles,
      name: climb.name ?? null,
    });
  if (error) throw new Error(error.message);
}

export async function retireProblem(problemId: string) {
  const me = await uid();
  await sb().from("problems").update({ retired: true }).eq("id", problemId).eq("created_by", me);
}

export interface ProblemResult {
  who: Profile;
  isMe: boolean;
  climb: Climb;
  falls: number;
  sent: boolean;
}

/** Everyone you can see who has logged this problem, with their falls and sends. */
export async function problemResults(problemId: string): Promise<ProblemResult[]> {
  const me = await uid();
  const { data, error } = await sb()
    .from("climbs")
    .select("user_id, id, data")
    .eq("problem_id", problemId)
    .eq("deleted", false);
  if (error) throw new Error(error.message);
  const climbs = data as { user_id: string; id: string; data: Climb }[];
  if (climbs.length === 0) return [];
  const { data: att, error: e2 } = await sb()
    .from("attempts")
    .select("user_id, climb_id, data")
    .in("climb_id", climbs.map((c) => c.id))
    .eq("deleted", false);
  if (e2) throw new Error(e2.message);
  const attempts = att as { user_id: string; climb_id: string; data: Attempt }[];
  const profiles = await profilesById(climbs.map((c) => c.user_id));
  return climbs
    .map((c) => {
      const mine = attempts.filter((a) => a.user_id === c.user_id && a.climb_id === c.id);
      return {
        who: profiles.get(c.user_id) ?? { id: c.user_id, username: null, display_name: null },
        isMe: c.user_id === me,
        climb: c.data,
        falls: mine.filter((a) => a.data.result === "fall").length,
        sent: mine.some((a) => a.data.result === "send"),
      };
    })
    .sort((a, b) => Number(b.sent) - Number(a.sent) || a.falls - b.falls);
}

/* Photos */

const signed = new Map<string, { url: string; until: number }>();

export async function photoUrl(path: string): Promise<string | null> {
  const hit = signed.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const client = supabase();
  if (!client) return null;
  const { data, error } = await client.storage.from("photos").createSignedUrl(path, 3600);
  if (error || !data) return null;
  signed.set(path, { url: data.signedUrl, until: Date.now() + 3500_000 });
  return data.signedUrl;
}

/* Crew achievements, which need buddies' data. */

export async function crewAchievements(mine: Session[], sentProblemIds: string[]): Promise<string[]> {
  const me = await uid();
  const out: string[] = [];
  const since = Date.now() - 365 * 86_400_000;
  const { data: theirs } = await sb()
    .from("sessions")
    .select("gym_key, started_at, ended_at")
    .neq("user_id", me)
    .eq("deleted", false)
    .gt("started_at", since)
    .limit(2000);
  const { overlapsBuddy } = await import("./achievements");
  if (
    theirs &&
    overlapsBuddy(
      mine,
      (theirs as { gym_key: string; started_at: number | string; ended_at: number | string | null }[]).map((t) => ({
        gym_key: t.gym_key,
        started_at: Number(t.started_at),
        ended_at: t.ended_at === null ? null : Number(t.ended_at),
      })),
    )
  ) {
    out.push("same-wall");
  }
  if (sentProblemIds.length) {
    const { data: also } = await sb()
      .from("climbs")
      .select("id")
      .neq("user_id", me)
      .eq("deleted", false)
      .eq("status", "sent")
      .in("problem_id", sentProblemIds.slice(0, 200))
      .limit(1);
    if (also && also.length) out.push("send-train");
  }
  return out;
}
