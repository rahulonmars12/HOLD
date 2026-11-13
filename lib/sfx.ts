"use client";

/**
 * Small sounds and haptics, synthesised with Web Audio so there are no files
 * to download and they work offline. One switch in Settings turns both off.
 */

export type Sound = "tap" | "fall" | "send" | "reason" | "sheet" | "save" | "nav" | "persona" | "achievement" | "clink" | "recap" | "ready" | "cheer" | "called" | "mission";

const KEY = "hold-sound";
const VOLUME = 0.7;

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

const listeners = new Set<() => void>();

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Private mode or blocked storage: the switch just won't stick.
  }
  for (const fn of listeners) fn();
}

/** For useSyncExternalStore: re-render when the Sound switch changes. */
export function subscribeSound(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

let ctx: AudioContext | null = null;
let lastAt = 0;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    try {
      // Safari 17+: "ambient" follows the iPhone's silent switch.
      const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
      if (session) session.type = "ambient";
    } catch {
      // Older browsers have no audio session; nothing to set.
    }
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  c: AudioContext,
  freq: number,
  at: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.15,
  toFreq?: number,
) {
  const t = c.currentTime + 0.005 + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (toFreq) osc.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol * VOLUME, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

const SOUNDS: Record<Sound, (c: AudioContext) => void> = {
  tap: (c) => tone(c, 900, 0, 0.07, "sine", 0.09, 1300),
  nav: (c) => tone(c, 700, 0, 0.05, "sine", 0.06, 780),
  reason: (c) => tone(c, 1500, 0, 0.045, "square", 0.03),
  fall: (c) => {
    tone(c, 520, 0, 0.26, "sine", 0.18, 170);
    tone(c, 260, 0.02, 0.2, "triangle", 0.05, 120);
  },
  send: (c) => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, f, i * 0.07, 0.4, "triangle", 0.13)),
  sheet: (c) => tone(c, 330, 0, 0.16, "sine", 0.06, 620),
  achievement: (c) => {
    [392, 523.25, 659.25, 783.99].forEach((f, i) => tone(c, f, i * 0.11, 0.3, "triangle", 0.12));
    [523.25, 659.25, 783.99, 1046.5].forEach((f) => tone(c, f, 0.48, 1.1, "triangle", 0.06));
    tone(c, 2093, 0.5, 0.6, "sine", 0.03);
  },
  clink: (c) => {
    tone(c, 2637, 0, 0.35, "sine", 0.07);
    tone(c, 3951, 0.005, 0.25, "sine", 0.04);
    tone(c, 1760, 0, 0.12, "triangle", 0.05);
  },
  persona: (c) => {
    [1046.5, 1318.5, 1568, 1760, 2093, 2637].forEach((f, i) => tone(c, f, i * 0.06, 0.5, "sine", 0.05));
    tone(c, 196, 0.1, 1.2, "triangle", 0.08, 392);
  },
  recap: (c) => {
    [392, 493.88, 587.33, 783.99].forEach((f, i) => tone(c, f, i * 0.13, 0.5, "triangle", 0.1));
    [392, 587.33, 783.99].forEach((f) => tone(c, f, 0.56, 1.0, "sine", 0.05));
  },
  ready: (c) => {
    tone(c, 659.25, 0, 0.18, "sine", 0.1);
    tone(c, 987.77, 0.14, 0.34, "sine", 0.1);
  },
  cheer: (c) => {
    tone(c, 880, 0, 0.09, "triangle", 0.09, 1320);
    tone(c, 1320, 0.08, 0.16, "triangle", 0.08, 1760);
  },
  called: (c) => {
    [783.99, 987.77, 1174.66, 1567.98].forEach((f, i) => tone(c, f, i * 0.06, 0.32, "triangle", 0.1));
    tone(c, 2349, 0.26, 0.4, "sine", 0.04);
  },
  mission: (c) => {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(c, f, i * 0.09, 0.45, "triangle", 0.11));
    [523.25, 783.99, 1046.5].forEach((f) => tone(c, f, 0.5, 1.0, "sine", 0.05));
  },
  save: (c) => {
    tone(c, 420, 0, 0.18, "sine", 0.07, 980);
    tone(c, 980, 0.12, 0.12, "sine", 0.05, 1400);
  },
};

const HAPTICS: Partial<Record<Sound, number | number[]>> = {
  fall: 14,
  send: [12, 50, 24],
  reason: 8,
  save: 10,
  persona: [10, 60, 10, 60, 30],
  achievement: [20, 60, 40],
  clink: 12,
  recap: [14, 70, 30],
  ready: [18, 40, 18],
  cheer: 10,
  called: [10, 40, 10, 40, 24],
  mission: [20, 60, 40],
};

export function sfx(name: Sound) {
  if (!soundOn()) return;
  const now = performance.now();
  // A sheet opening right after a tap would muddy the tap's sound.
  if (name === "sheet" && now - lastAt < 300) return;
  lastAt = now;
  try {
    const c = audio();
    if (c) SOUNDS[name](c);
    const pattern = HAPTICS[name];
    if (pattern && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    // Sound is decoration; never let it break a tap.
  }
}

/** The evolution screen: a blip that climbs in pitch with each swap, then a hum to start. */
export function evolveSound(step: number | "start") {
  if (!soundOn()) return;
  try {
    const c = audio();
    if (!c) return;
    if (step === "start") {
      tone(c, 220, 0, 1.2, "triangle", 0.08, 330);
      tone(c, 330, 0.1, 1.1, "sine", 0.04, 440);
      return;
    }
    tone(c, 300 * Math.pow(1.06, step), 0, 0.09, "square", 0.025);
  } catch {
    // Decoration only.
  }
}

/** A soft pop for each piece of a badge landing, a little higher each time. */
export function pieceSound(i: number) {
  if (!soundOn()) return;
  try {
    const c = audio();
    if (c) tone(c, 520 * Math.pow(1.09, i), 0, 0.08, "sine", 0.08, 760 * Math.pow(1.09, i));
  } catch {
    // Decoration only.
  }
}

/** Plays the sound named by a tapped element's data-sfx, or a tap by default. */
export function soundForClick(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const el = target.closest<HTMLElement>("[data-sfx], button, a[href], [role='button'], summary, input[type='checkbox'], input[type='radio']");
  if (!el || (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
  const name = el.closest<HTMLElement>("[data-sfx]")?.dataset.sfx ?? "tap";
  if (name === "none") return;
  if (name in SOUNDS) sfx(name as Sound);
}
