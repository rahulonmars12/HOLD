"use client";

import { useSyncExternalStore } from "react";
import { sfx } from "./sfx";

/**
 * The optional rest timer you start with a tap. It lives outside any screen so it
 * keeps counting while you move around the app, and chimes once when done.
 */
const KEY = "hold-rest";
export const REST_CHOICES = [60, 120, 180] as const;
const DEFAULT = 120;

export interface Rest {
  climbId: string;
  startedAt: number;
  until: number;
  /** Set once the timer has run out; cleared a little later. */
  done: boolean;
}

let rest: Rest | null = null;
let endTimer: ReturnType<typeof setTimeout> | undefined;
let clearTimer: ReturnType<typeof setTimeout> | undefined;
let ticker: ReturnType<typeof setInterval> | undefined;
let tick = 0;
const listeners = new Set<() => void>();
const emit = () => {
  tick++;
  for (const fn of listeners) fn();
};

export function restSeconds(): number {
  try {
    const raw = localStorage.getItem(KEY);
    const n = raw === null ? DEFAULT : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export function setRestSeconds(n: number) {
  try {
    localStorage.setItem(KEY, String(n));
  } catch {
    // Blocked storage: the choice just won't stick.
  }
  emit();
}

function clearTimers() {
  clearTimeout(endTimer);
  clearTimeout(clearTimer);
  clearInterval(ticker);
}

export function startRest(climbId: string) {
  const seconds = restSeconds();
  clearTimers();
  if (seconds <= 0) {
    rest = null;
    emit();
    return;
  }
  const now = Date.now();
  rest = { climbId, startedAt: now, until: now + seconds * 1000, done: false };
  ticker = setInterval(emit, 500);
  endTimer = setTimeout(() => {
    if (!rest) return;
    rest = { ...rest, done: true };
    clearInterval(ticker);
    sfx("ready");
    emit();
    // "Ready" stays up for a moment, then the companion goes back to idle.
    clearTimer = setTimeout(() => {
      rest = null;
      emit();
    }, 12000);
  }, seconds * 1000);
  emit();
}

export function stopRest() {
  clearTimers();
  rest = null;
  emit();
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

/** The running rest, with seconds left, or null. Re-renders twice a second while it runs. */
export function useRest(): (Rest & { left: number; total: number }) | null {
  useSyncExternalStore(subscribe, () => tick, () => 0);
  if (!rest) return null;
  return {
    ...rest,
    // eslint-disable-next-line react-hooks/purity
    left: rest.done ? 0 : Math.max(0, Math.ceil((rest.until - Date.now()) / 1000)),
    total: Math.round((rest.until - rest.startedAt) / 1000),
  };
}

export function useRestSetting(): number {
  return useSyncExternalStore(subscribe, restSeconds, () => DEFAULT);
}

export const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
