"use client";

import { useEffect } from "react";
import { forgetDevice, getMeta, setMeta } from "@/lib/db";
import { startSync } from "@/lib/sync";
import { useAuth } from "@/lib/supabase";

/**
 * Keeps the log in sync while someone is signed in. If a different account
 * signs in on this device, the previous account's local copy is cleared first
 * so logs never mix.
 */
export function SyncAgent() {
  const auth = useAuth();
  const uid = auth?.user.id;

  useEffect(() => {
    if (!uid) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const owner = await getMeta<string>("owner");
      if (owner && owner !== uid) await forgetDevice();
      await setMeta("owner", uid);
      if (!cancelled) stop = startSync(uid);
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [uid]);

  return null;
}
