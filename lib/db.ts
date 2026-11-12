import Dexie, { type EntityTable } from "dexie";
import type {
  Attempt,
  Backup,
  Climb,
  CoachNote,
  CustomColor,
  FailReason,
  ReadResult,
  Session,
} from "./types";

/**
 * The log lives in IndexedDB on the device, so logging works with no signal.
 * When signed in, lib/sync.ts copies changes to and from the cloud.
 */

export type SyncedTable = "sessions" | "climbs" | "attempts";

export interface Tombstone {
  key: string;
  table: SyncedTable;
  rowId: string;
  at: number;
}

export interface MetaRow {
  key: string;
  value: unknown;
}

export interface PhotoRow {
  climbId: string;
  blob: Blob;
  /** Set once the photo is in cloud storage. */
  uploaded?: boolean;
}

export const db = new Dexie("tickmark") as Dexie & {
  sessions: EntityTable<Session, "id">;
  climbs: EntityTable<Climb, "id">;
  attempts: EntityTable<Attempt, "id">;
  tombstones: EntityTable<Tombstone, "key">;
  meta: EntityTable<MetaRow, "key">;
  photos: EntityTable<PhotoRow, "climbId">;
};

db.version(1).stores({
  sessions: "id, startedAt, endedAt",
  climbs: "id, createdAt, gym, status, grade",
  attempts: "id, climbId, sessionId, at",
});

db.version(2)
  .stores({
    sessions: "id, startedAt, endedAt, updatedAt",
    climbs: "id, createdAt, gym, status, grade, updatedAt, problemId",
    attempts: "id, climbId, sessionId, at, updatedAt",
    tombstones: "key, at",
    meta: "key",
    photos: "climbId",
  })
  .upgrade(async (tx) => {
    // Rows from before sync existed get a change time so the first sync uploads them.
    await tx
      .table("sessions")
      .toCollection()
      .modify((s: Session) => {
        s.updatedAt ??= s.endedAt ?? s.startedAt;
      });
    await tx
      .table("climbs")
      .toCollection()
      .modify((c: Climb) => {
        c.updatedAt ??= c.sentAt ?? c.createdAt;
      });
    await tx
      .table("attempts")
      .toCollection()
      .modify((a: Attempt) => {
        a.updatedAt ??= a.at;
      });
  });

/* Change tracking */

/** While true, writes come from the cloud and keep their own change times. */
let applyingRemote = false;

export async function asRemote<T>(fn: () => Promise<T>): Promise<T> {
  applyingRemote = true;
  try {
    return await fn();
  } finally {
    applyingRemote = false;
  }
}

for (const table of [db.sessions, db.climbs, db.attempts] as const) {
  table.hook("creating", (_key, obj) => {
    if (!applyingRemote) (obj as { updatedAt?: number }).updatedAt = Date.now();
  });
  table.hook("updating", () => {
    if (!applyingRemote) return { updatedAt: Date.now() };
  });
}

const listeners = new Set<() => void>();

/** Lets the sync engine know local data changed. */
export function onLocalChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function changed() {
  if (applyingRemote) return;
  for (const fn of listeners) fn();
}

async function tombstone(table: SyncedTable, ids: string[]) {
  if (applyingRemote || ids.length === 0) return;
  const at = Date.now();
  await db.tombstones.bulkPut(
    ids.map((rowId) => ({ key: `${table}:${rowId}`, table, rowId, at })),
  );
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/* Meta */

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined;
}

export async function setMeta(key: string, value: unknown) {
  await db.meta.put({ key, value });
}

export async function getCustomColors(): Promise<CustomColor[]> {
  return (await getMeta<CustomColor[]>("customColors")) ?? [];
}

export async function saveCustomColor(color: CustomColor) {
  const list = await getCustomColors();
  const rest = list.filter((c) => c.hex.toLowerCase() !== color.hex.toLowerCase());
  await setMeta("customColors", [...rest, color]);
}

export async function removeCustomColor(hex: string) {
  const list = await getCustomColors();
  await setMeta(
    "customColors",
    list.filter((c) => c.hex.toLowerCase() !== hex.toLowerCase()),
  );
}

/* Sessions */

export async function getActiveSession(): Promise<Session | undefined> {
  const all = await db.sessions.orderBy("startedAt").reverse().toArray();
  return all.find((s) => s.endedAt === undefined);
}

export async function startSession(gym: string): Promise<Session> {
  const active = await getActiveSession();
  if (active) return active;
  const session: Session = {
    id: newId(),
    gym: gym.trim() || "My gym",
    startedAt: Date.now(),
  };
  await db.sessions.add(session);
  changed();
  return session;
}

export async function endSession(id: string, note?: string) {
  const attempts = await db.attempts.where("sessionId").equals(id).count();
  if (attempts === 0) {
    // An empty session is noise in the log.
    await db.sessions.delete(id);
    await tombstone("sessions", [id]);
  } else {
    await db.sessions.update(id, {
      endedAt: Date.now(),
      note: note?.trim() || undefined,
    });
  }
  changed();
}

export async function deleteSession(id: string) {
  await db.transaction(
    "rw",
    [db.sessions, db.attempts, db.climbs, db.tombstones],
    async () => {
      const attempts = await db.attempts.where("sessionId").equals(id).toArray();
      await db.attempts.bulkDelete(attempts.map((a) => a.id));
      await db.sessions.delete(id);
      await tombstone("attempts", attempts.map((a) => a.id));
      await tombstone("sessions", [id]);
      for (const climbId of new Set(attempts.map((a) => a.climbId))) {
        await syncClimbStatus(climbId);
      }
    },
  );
  changed();
}

/* Climbs */

export type NewClimb = Omit<Climb, "id" | "createdAt" | "status" | "sentAt">;

export async function addClimb(input: NewClimb, id = newId()): Promise<Climb> {
  const climb: Climb = {
    ...input,
    name: input.name?.trim() || undefined,
    plan: input.plan?.trim() || undefined,
    id,
    createdAt: Date.now(),
    status: "project",
  };
  await db.climbs.add(climb);
  changed();
  return climb;
}

export async function updateClimb(id: string, changes: Partial<Climb>) {
  await db.climbs.update(id, changes);
  changed();
}

export async function deleteClimb(id: string) {
  await db.transaction(
    "rw",
    [db.climbs, db.attempts, db.tombstones, db.photos],
    async () => {
      const attempts = await db.attempts.where("climbId").equals(id).primaryKeys();
      await db.attempts.bulkDelete(attempts);
      await db.climbs.delete(id);
      await db.photos.delete(id);
      await tombstone("attempts", attempts);
      await tombstone("climbs", [id]);
    },
  );
  changed();
}

export async function saveRead(
  id: string,
  read: ReadResult | undefined,
  whatWorked: string,
) {
  await db.climbs.update(id, {
    read,
    whatWorked: whatWorked.trim() || undefined,
  });
  changed();
}

export async function saveCoach(id: string, coach: CoachNote) {
  await db.climbs.update(id, { coach });
  changed();
}

export async function savePhoto(climbId: string, blob: Blob) {
  await db.photos.put({ climbId, blob, uploaded: false });
  changed();
}

/** Keeps a climb's status in step with its attempts after an add or a delete. */
async function syncClimbStatus(climbId: string) {
  const climb = await db.climbs.get(climbId);
  if (!climb) return;
  const attempts = await db.attempts.where("climbId").equals(climbId).toArray();
  const send = attempts
    .filter((a) => a.result === "send")
    .sort((a, b) => a.at - b.at)[0];
  if (send) {
    if (climb.status !== "sent" || climb.sentAt !== send.at) {
      await db.climbs.update(climbId, { status: "sent", sentAt: send.at });
    }
  } else if (climb.status === "sent") {
    await db.climbs.update(climbId, { status: "project", sentAt: undefined });
  }
}

/* Attempts */

export async function logAttempt(
  climbId: string,
  sessionId: string,
  result: Attempt["result"],
  reason?: FailReason,
): Promise<Attempt> {
  const attempt: Attempt = {
    id: newId(),
    climbId,
    sessionId,
    at: Date.now(),
    result,
    reason,
  };
  await db.transaction("rw", db.climbs, db.attempts, async () => {
    await db.attempts.add(attempt);
    await syncClimbStatus(climbId);
  });
  changed();
  return attempt;
}

export async function setAttemptReason(id: string, reason?: FailReason) {
  await db.attempts.update(id, { reason });
  changed();
}

export async function deleteAttempt(id: string) {
  await db.transaction(
    "rw",
    [db.climbs, db.attempts, db.tombstones],
    async () => {
      const attempt = await db.attempts.get(id);
      if (!attempt) return;
      await db.attempts.delete(id);
      await tombstone("attempts", [id]);
      await syncClimbStatus(attempt.climbId);
    },
  );
  changed();
}

/* Backup */

export async function exportBackup(): Promise<Backup> {
  const [sessions, climbs, attempts] = await Promise.all([
    db.sessions.toArray(),
    db.climbs.toArray(),
    db.attempts.toArray(),
  ]);
  return {
    app: "tickmark",
    version: 1,
    exportedAt: Date.now(),
    sessions,
    climbs,
    attempts,
  };
}

export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That file is not valid JSON.");
  }
  const b = data as Partial<Backup>;
  if (
    !b ||
    b.app !== "tickmark" ||
    !Array.isArray(b.sessions) ||
    !Array.isArray(b.climbs) ||
    !Array.isArray(b.attempts)
  ) {
    throw new Error("That file is not a HOLD! backup.");
  }
  return b as Backup;
}

/** Replaces everything on this device with the contents of a backup. */
export async function restoreBackup(backup: Backup) {
  await db.transaction(
    "rw",
    [db.sessions, db.climbs, db.attempts, db.tombstones],
    async () => {
      await removeAll();
      // Restored rows count as new changes, so they upload when signed in.
      const now = Date.now();
      await db.sessions.bulkAdd(backup.sessions.map((s) => ({ ...s, updatedAt: now })));
      await db.climbs.bulkAdd(backup.climbs.map((c) => ({ ...c, updatedAt: now })));
      await db.attempts.bulkAdd(backup.attempts.map((a) => ({ ...a, updatedAt: now })));
    },
  );
  changed();
}

async function removeAll() {
  const [s, c, a] = await Promise.all([
    db.sessions.toCollection().primaryKeys(),
    db.climbs.toCollection().primaryKeys(),
    db.attempts.toCollection().primaryKeys(),
  ]);
  await Promise.all([db.sessions.clear(), db.climbs.clear(), db.attempts.clear()]);
  await tombstone("sessions", s);
  await tombstone("climbs", c);
  await tombstone("attempts", a);
}

/** Deletes the whole log, here and (when signed in) in the cloud. */
export async function clearAll() {
  await db.transaction(
    "rw",
    [db.sessions, db.climbs, db.attempts, db.tombstones, db.photos],
    async () => {
      await removeAll();
      await db.photos.clear();
    },
  );
  changed();
}

/** Wipes this device only, for signing out. Nothing is deleted in the cloud. */
export async function forgetDevice() {
  await asRemote(async () => {
    await Promise.all([
      db.sessions.clear(),
      db.climbs.clear(),
      db.attempts.clear(),
      db.tombstones.clear(),
      db.photos.clear(),
    ]);
  });
  const keep = ["customColors"];
  const keys = await db.meta.toCollection().primaryKeys();
  await db.meta.bulkDelete(keys.filter((k) => !keep.includes(k)));
}
