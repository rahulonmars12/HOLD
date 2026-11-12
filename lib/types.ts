export type Angle = "slab" | "vertical" | "overhang" | "steep" | "roof";

export type Hold = "crimp" | "sloper" | "pinch" | "pocket" | "jug" | "volume";

export type Style =
  | "dynamic"
  | "coordination"
  | "compression"
  | "power"
  | "tension"
  | "balance"
  | "hooks"
  | "mantle";

export type FailReason =
  | "beta"
  | "strength"
  | "commit"
  | "foot"
  | "precision"
  | "fatigue";

/** How many attempts the climber expects a climb to take, guessed before pulling on. */
export type AttemptGuess = "flash" | "few" | "several" | "many";

export type ReadResult = "yes" | "partly" | "no";

export type HoldColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "white"
  | "black";

export interface Session {
  id: string;
  gym: string;
  startedAt: number;
  endedAt?: number;
  note?: string;
}

export interface Climb {
  id: string;
  createdAt: number;
  gym: string;
  /** V-scale number, 0–14. */
  grade: number;
  color: HoldColor;
  name?: string;
  angle: Angle;
  holds: Hold[];
  styles: Style[];
  status: "project" | "sent" | "retired";
  sentAt?: number;
  /** The read made before the first attempt. */
  guess?: AttemptGuess;
  plan?: string;
  /** Filled in after the send: did the read hold up? */
  read?: ReadResult;
  whatWorked?: string;
}

export interface Attempt {
  id: string;
  climbId: string;
  sessionId: string;
  at: number;
  result: "fall" | "send";
  reason?: FailReason;
}

export interface Backup {
  app: "tickmark";
  version: 1;
  exportedAt: number;
  sessions: Session[];
  climbs: Climb[];
  attempts: Attempt[];
}
