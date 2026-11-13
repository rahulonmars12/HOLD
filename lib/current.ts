"use client";

import { useSyncExternalStore } from "react";

/**
 * The climb you're on right now. While it is set, the Session tab shows that
 * climb full screen; clearing it (Sent, or "Let's move on") returns to the
 * session summary. Kept for the browser session so a reload doesn't lose it.
 */
const KEY = "hold-current";
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setCurrentClimb(id: string | null) {
  try {
    if (id) sessionStorage.setItem(KEY, id);
    else sessionStorage.removeItem(KEY);
  } catch {
    // Blocked storage: the full-screen climb just won't open by itself.
  }
  for (const fn of listeners) fn();
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const useCurrentClimb = (): string | null => useSyncExternalStore(subscribe, read, () => null);
