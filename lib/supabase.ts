"use client";

import { createClient, type Session as AuthSession, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** False until the Supabase settings are added in Vercel; the app then runs on-device only. */
export const cloudEnabled = Boolean(url && key);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!cloudEnabled) return null;
  if (!client) {
    client = createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "tickmark-auth" },
    });
  }
  return client;
}

/** The signed-in account, or null. Undefined while it is still being read. */
export function useAuth(): AuthSession | null | undefined {
  const [session, setSession] = useState<AuthSession | null | undefined>(
    cloudEnabled ? undefined : null,
  );
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (alive) setSession(data.session);
    });
    const { data } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return session;
}

export async function sendCode(email: string) {
  const sb = supabase();
  if (!sb) throw new Error("Accounts are not set up yet.");
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: true,
      // Free Supabase projects send a link instead of a code; it lands back here signed in.
      emailRedirectTo: `${window.location.origin}/settings`,
    },
  });
  if (error) throw new Error(error.message);
}

export async function verifyCode(email: string, code: string) {
  const sb = supabase();
  if (!sb) throw new Error("Accounts are not set up yet.");
  const { error } = await sb.auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: "email",
  });
  if (error) throw new Error(error.message);
}

export async function accessToken(): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}
