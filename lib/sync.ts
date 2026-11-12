"use client";

import { useEffect, useState } from "react";
import { gymKey } from "./constants";
import {
  asRemote,
  db,
  getMeta,
  onLocalChange,
  setMeta,
  updateClimb,
  type SyncedTable,
} from "./db";
import { supabase } from "./supabase";
import type { Attempt, Climb, Session } from "./types";

/**
 * Two-way sync between this device and the cloud.
 *
 * Push: every local row changed since the last push is upserted, and local
 * deletions (tombstones) are sent as `deleted = true`. Pull: every cloud row
 * whose server time is newer than the last pull is applied, keeping whichever
 * side changed last. The database trigger enforces the same rule server-side.
 */

const TABLES: SyncedTable[] = ["sessions", "climbs", "attempts"];
const CHUNK = 500;
/** Pull a little before the last pull time to cover slow, overlapping writes. */
const OVERLAP_MS = 60_000;

type AnyRow = Session | Climb | Attempt;

interface CloudRow {
  id: string;
  data: AnyRow | null;
  updated_at: number;
  deleted: boolean;
  synced_at: string;
}

function toRow(table: SyncedTable, obj: AnyRow, uid: string) {
  const base = {
    user_id: uid,
    id: obj.id,
    data: obj,
    updated_at: obj.updatedAt ?? Date.now(),
    deleted: false,
  };
  if (table === "sessions") {
    const s = obj as Session;
    return { ...base, gym_key: gymKey(s.gym), started_at: s.startedAt, ended_at: s.endedAt ?? null };
  }
  if (table === "climbs") {
    const c = obj as Climb;
    return {
      ...base,
      gym_key: gymKey(c.gym),
      problem_id: c.problemId ?? null,
      status: c.status,
      sent_at: c.sentAt ?? null,
    };
  }
  return { ...base, climb_id: (obj as Attempt).climbId };
}

async function push(uid: string) {
  const sb = supabase()!;
  const since = (await getMeta<number>(`pushedAt:${uid}`)) ?? 0;
  const startedAt = Date.now();

  for (const table of TABLES) {
    const rows = (await db.table(table).where("updatedAt").aboveOrEqual(since).toArray()) as AnyRow[];
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await sb
        .from(table)
        .upsert(rows.slice(i, i + CHUNK).map((r) => toRow(table, r, uid)), { onConflict: "user_id,id" });
      if (error) throw new Error(error.message);
    }
  }

  const stones = await db.tombstones.toArray();
  const sent: string[] = [];
  for (const table of TABLES) {
    const mine = stones.filter((t) => t.table === table);
    // A row deleted and then restored (from a backup) is no longer gone.
    const alive = new Set(
      (await db.table(table).bulkGet(mine.map((t) => t.rowId))).filter(Boolean).map((r) => (r as AnyRow).id),
    );
    const dead = mine.filter((t) => !alive.has(t.rowId));
    for (let i = 0; i < dead.length; i += CHUNK) {
      const { error } = await sb.from(table).upsert(
        dead.slice(i, i + CHUNK).map((t) => ({
          user_id: uid,
          id: t.rowId,
          data: null,
          updated_at: t.at,
          deleted: true,
        })),
        { onConflict: "user_id,id" },
      );
      if (error) throw new Error(error.message);
    }
    sent.push(...mine.map((t) => t.key));
  }
  await db.tombstones.bulkDelete(sent);
  await setMeta(`pushedAt:${uid}`, startedAt);
}

async function pull(uid: string) {
  const sb = supabase()!;
  const last = await getMeta<string>(`pulledAt:${uid}`);
  const from = last ? new Date(new Date(last).getTime() - OVERLAP_MS).toISOString() : "1970-01-01T00:00:00Z";
  let newest = last ?? from;

  for (const table of TABLES) {
    for (let page = 0; ; page++) {
      const { data, error } = await sb
        .from(table)
        .select("id, data, updated_at, deleted, synced_at")
        .eq("user_id", uid)
        .gt("synced_at", from)
        .order("synced_at", { ascending: true })
        .range(page * 1000, page * 1000 + 999);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as CloudRow[];
      if (rows.length === 0) break;
      await applyRows(table, rows);
      for (const r of rows) if (r.synced_at > newest) newest = r.synced_at;
      if (rows.length < 1000) break;
    }
  }
  await setMeta(`pulledAt:${uid}`, newest);
}

async function applyRows(table: SyncedTable, rows: CloudRow[]) {
  const t = db.table(table);
  await asRemote(() =>
    db.transaction("rw", t, async () => {
      const local = (await t.bulkGet(rows.map((r) => r.id))) as (AnyRow | undefined)[];
      const puts: AnyRow[] = [];
      const deletes: string[] = [];
      rows.forEach((row, i) => {
        const mine = local[i];
        const mineAt = mine?.updatedAt ?? 0;
        if (row.deleted) {
          if (mine && mineAt <= row.updated_at) deletes.push(row.id);
        } else if (row.data && (!mine || mineAt < row.updated_at)) {
          puts.push({ ...row.data, updatedAt: row.updated_at });
        }
      });
      if (puts.length) await t.bulkPut(puts);
      if (deletes.length) await t.bulkDelete(deletes);
    }),
  );
}

async function uploadPhotos(uid: string) {
  const sb = supabase()!;
  const pending = await db.photos.filter((p) => !p.uploaded).toArray();
  for (const photo of pending) {
    const climb = await db.climbs.get(photo.climbId);
    if (!climb) {
      await db.photos.delete(photo.climbId);
      continue;
    }
    const path = `${uid}/${photo.climbId}.jpg`;
    const { error } = await sb.storage
      .from("photos")
      .upload(path, photo.blob, { upsert: true, contentType: "image/jpeg" });
    if (error) throw new Error(error.message);
    await db.photos.update(photo.climbId, { uploaded: true });
    if (climb.photoPath !== path) await updateClimb(climb.id, { photoPath: path });
    if (climb.problemId) {
      // Only changes the shared problem if this climber created it.
      await sb.from("problems").update({ photo_path: path }).eq("id", climb.problemId).eq("created_by", uid);
    }
  }
}

/* Running sync */

export type SyncState = "off" | "idle" | "syncing" | "error" | "offline";

interface Status {
  state: SyncState;
  lastSyncedAt?: number;
  error?: string;
}

let status: Status = { state: "off" };
const watchers = new Set<(s: Status) => void>();

function setStatus(next: Partial<Status>) {
  status = { ...status, ...next };
  for (const w of watchers) w(status);
}

export function useSyncStatus() {
  const [s, setS] = useState(status);
  useEffect(() => {
    watchers.add(setS);
    return () => {
      watchers.delete(setS);
    };
  }, []);
  return s;
}

let currentUid: string | null = null;
let running = false;
let again = false;

export async function syncNow() {
  const uid = currentUid;
  if (!uid || !supabase()) return;
  if (running) {
    again = true;
    return;
  }
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setStatus({ state: "offline" });
    return;
  }
  running = true;
  setStatus({ state: "syncing" });
  try {
    await push(uid);
    await pull(uid);
    await uploadPhotos(uid);
    if (currentUid === uid) setStatus({ state: "idle", lastSyncedAt: Date.now(), error: undefined });
  } catch (e) {
    setStatus({ state: "error", error: e instanceof Error ? e.message : "Sync failed." });
  } finally {
    running = false;
    if (again) {
      again = false;
      void syncNow();
    }
  }
}

/** Starts syncing for this account. Returns a function that stops it. */
export function startSync(uid: string) {
  currentUid = uid;
  setStatus({ state: "idle" });
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const soon = () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => void syncNow(), 1500);
  };
  const stopListening = onLocalChange(soon);
  const onVisible = () => {
    if (document.visibilityState === "visible") void syncNow();
  };
  const onOnline = () => void syncNow();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("online", onOnline);
  const interval = setInterval(() => {
    if (document.visibilityState === "visible") void syncNow();
  }, 60_000);
  void syncNow();

  return () => {
    currentUid = null;
    clearTimeout(debounce);
    clearInterval(interval);
    stopListening();
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("online", onOnline);
    setStatus({ state: "off", lastSyncedAt: undefined, error: undefined });
  };
}
