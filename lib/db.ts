import Dexie, { type EntityTable } from "dexie";
import type {
  Attempt,
  Backup,
  Climb,
  FailReason,
  ReadResult,
  Session,
} from "./types";

/**
 * Everything is stored in IndexedDB on the device, so logging works with no
 * signal and no account. Export a backup from Settings to move data.
 */
export const db = new Dexie("tickmark") as Dexie & {
  sessions: EntityTable<Session, "id">;
  climbs: EntityTable<Climb, "id">;
  attempts: EntityTable<Attempt, "id">;
};

db.version(1).stores({
  sessions: "id, startedAt, endedAt",
  climbs: "id, createdAt, gym, status, grade",
  attempts: "id, climbId, sessionId, at",
});

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

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
  return session;
}

export async function endSession(id: string, note?: string) {
  const attempts = await db.attempts.where("sessionId").equals(id).count();
  if (attempts === 0) {
    // An empty session is noise in the log.
    await db.sessions.delete(id);
    return;
  }
  await db.sessions.update(id, {
    endedAt: Date.now(),
    note: note?.trim() || undefined,
  });
}

export async function deleteSession(id: string) {
  await db.transaction("rw", db.sessions, db.attempts, db.climbs, async () => {
    const attempts = await db.attempts.where("sessionId").equals(id).toArray();
    await db.attempts.bulkDelete(attempts.map((a) => a.id));
    await db.sessions.delete(id);
    for (const climbId of new Set(attempts.map((a) => a.climbId))) {
      await syncClimbStatus(climbId);
    }
  });
}

/* Climbs */

export type NewClimb = Omit<Climb, "id" | "createdAt" | "status" | "sentAt">;

export async function addClimb(input: NewClimb): Promise<Climb> {
  const climb: Climb = {
    ...input,
    name: input.name?.trim() || undefined,
    plan: input.plan?.trim() || undefined,
    id: newId(),
    createdAt: Date.now(),
    status: "project",
  };
  await db.climbs.add(climb);
  return climb;
}

export async function updateClimb(id: string, changes: Partial<Climb>) {
  await db.climbs.update(id, changes);
}

export async function deleteClimb(id: string) {
  await db.transaction("rw", db.climbs, db.attempts, async () => {
    await db.attempts.where("climbId").equals(id).delete();
    await db.climbs.delete(id);
  });
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
    await db.climbs.update(climbId, { status: "sent", sentAt: send.at });
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
  return attempt;
}

export async function setAttemptReason(id: string, reason?: FailReason) {
  await db.attempts.update(id, { reason });
}

export async function deleteAttempt(id: string) {
  await db.transaction("rw", db.climbs, db.attempts, async () => {
    const attempt = await db.attempts.get(id);
    if (!attempt) return;
    await db.attempts.delete(id);
    await syncClimbStatus(attempt.climbId);
  });
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
    throw new Error("That file is not a Tickmark backup.");
  }
  return b as Backup;
}

/** Replaces everything on this device with the contents of a backup. */
export async function restoreBackup(backup: Backup) {
  await db.transaction("rw", db.sessions, db.climbs, db.attempts, async () => {
    await Promise.all([
      db.sessions.clear(),
      db.climbs.clear(),
      db.attempts.clear(),
    ]);
    await db.sessions.bulkAdd(backup.sessions);
    await db.climbs.bulkAdd(backup.climbs);
    await db.attempts.bulkAdd(backup.attempts);
  });
}

export async function clearAll() {
  await db.transaction("rw", db.sessions, db.climbs, db.attempts, async () => {
    await Promise.all([
      db.sessions.clear(),
      db.climbs.clear(),
      db.attempts.clear(),
    ]);
  });
}
