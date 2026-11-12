"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { getMeta, setMeta } from "./db";
import type { Data } from "./hooks";
import { computePersona, type PersonaResult } from "./persona";
import { publishPersona } from "./social";
import { useAuth } from "./supabase";

export function usePersona(data: Data | undefined): PersonaResult | undefined {
  return useMemo(
    () => (data ? computePersona(data.sessions, data.climbs, data.attempts) : undefined),
    [data],
  );
}

/**
 * Shows the full-screen reveal the first time a persona appears and whenever it
 * changes, and shares it on the profile for buddies.
 */
export function usePersonaReveal(result: PersonaResult | undefined) {
  const router = useRouter();
  const auth = useAuth();
  const id = result?.ready ? result.persona.id : undefined;
  const dash = result?.ready ? result.persona.dash : undefined;
  const uid = auth?.user.id;

  useEffect(() => {
    if (!id) return;
    let alive = true;
    (async () => {
      const seen = await getMeta<string>("personaSeen");
      if (!alive || seen === id) return;
      await setMeta("personaSeen", id);
      // The old persona, if any, evolves into the new one on the next screen.
      router.push(`/persona?from=${seen ?? "new"}`);
    })();
    return () => {
      alive = false;
    };
  }, [id, router]);

  useEffect(() => {
    if (!id || !dash || !uid) return;
    const key = `${uid}:${id}:${dash}`;
    (async () => {
      if ((await getMeta<string>("personaShared")) === key) return;
      try {
        await publishPersona(id, dash);
        await setMeta("personaShared", key);
      } catch {
        // Database without personas yet (migration 0004): try again another time.
      }
    })();
  }, [id, dash, uid]);
}
