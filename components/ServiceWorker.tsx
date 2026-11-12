"use client";

import { useEffect } from "react";

/**
 * Registers the service worker that keeps the app usable with no signal,
 * and asks it to refresh its copy of every screen whenever we are online.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        if (navigator.onLine) registration.active?.postMessage("warm");
      })
      .catch(() => {
        // Offline support is a bonus; the app still works online without it.
      });
  }, []);
  return null;
}
