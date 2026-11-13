"use client";

import { useSyncExternalStore } from "react";

/** Appearance: follow the phone, or force light or dark. Stored on the device. */
export type Theme = "system" | "light" | "dark";
const KEY = "hold-theme";
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply() {
  const t = getTheme();
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  // The browser bar follows the app, not just the phone setting.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", dark ? "#131129" : "#EEF2FB"));
}

export function setTheme(t: Theme) {
  try {
    if (t === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    // Blocked storage: the choice lasts until the app is closed.
  }
  apply();
  for (const fn of listeners) fn();
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", apply);
  return () => {
    listeners.delete(fn);
    mq.removeEventListener("change", apply);
  };
};

export const useTheme = (): Theme => useSyncExternalStore(subscribe, getTheme, () => "system");

/** Runs before the page paints, so there is no flash of the wrong theme. */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;
