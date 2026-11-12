"use client";

/**
 * Small sounds and haptics, synthesised with Web Audio so there are no files
 * to download and they work offline. One switch in Settings turns both off.
 */

export type Sound = "tap" | "fall" | "send" | "reason" | "sheet" | "save" | "nav";

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

/** Plays the sound named by a tapped element's data-sfx, or a tap by default. */
export function soundForClick(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const el = target.closest<HTMLElement>("[data-sfx], button, a[href], [role='button'], summary, input[type='checkbox'], input[type='radio']");
  if (!el || (el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return;
  const name = el.closest<HTMLElement>("[data-sfx]")?.dataset.sfx ?? "tap";
  if (name === "none") return;
  if (name in SOUNDS) sfx(name as Sound);
}
