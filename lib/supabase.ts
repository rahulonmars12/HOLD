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

/*
 * Accounts are a username and a password; no email is ever sent. Supabase
 * needs an email address per account, so each username maps to an address on
 * the reserved .invalid domain, which can never receive mail.
 */

export const USERNAME_RULE = /^[a-z0-9_]{3,20}$/;
export const MIN_PASSWORD = 8;

export function cleanUsername(username: string) {
  return username.trim().toLowerCase().replace(/^@/, "");
}

const loginEmail = (username: string) => `${cleanUsername(username)}@hold.invalid`;

/** The username of a signed-in account. */
export function usernameOf(session: AuthSession): string {
  const meta = session.user.user_metadata?.username;
  if (typeof meta === "string" && meta) return meta;
  return (session.user.email ?? "").replace(/@hold\.invalid$/, "");
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("network")) return "Couldn't reach the server. Check your connection.";
  if (m.includes("invalid login credentials")) return "Wrong username or password.";
  if (m.includes("already registered") || m.includes("already exists")) return "That username is taken.";
  if (m.includes("signups not allowed") || m.includes("signup is disabled"))
    return "New accounts are switched off in Supabase (Authentication, Sign In / Providers).";
  if (m.includes("email not confirmed") || m.includes("confirmation"))
    return "Turn off \u201cConfirm email\u201d in Supabase (Authentication, Sign In / Providers, Email), then try again.";
  if (m.includes("database error saving new user")) return "That username is taken.";
  if (m.includes("password")) return message;
  if (m.includes("rate limit") || m.includes("too many")) return "Too many tries. Wait a few minutes and try again.";
  return message;
}

export async function createAccount(username: string, password: string, displayName: string) {
  const sb = supabase();
  if (!sb) throw new Error("Accounts are not set up yet.");
  const name = cleanUsername(username);
  if (!USERNAME_RULE.test(name)) throw new Error("Usernames are 3 to 20 letters, numbers or underscores.");
  if (password.length < MIN_PASSWORD) throw new Error(`Use at least ${MIN_PASSWORD} characters for the password.`);
  const { data, error } = await sb.auth.signUp({
    email: loginEmail(name),
    password,
    options: { data: { username: name, display_name: displayName.trim() || null } },
  });
  if (error) throw new Error(friendly(error.message));
  if (!data.session) {
    // With email confirmation on, Supabase creates the account but won't sign it in.
    throw new Error(friendly("email not confirmed"));
  }
}

export async function signIn(username: string, password: string) {
  const sb = supabase();
  if (!sb) throw new Error("Accounts are not set up yet.");
  const { error } = await sb.auth.signInWithPassword({ email: loginEmail(username), password });
  if (error) throw new Error(friendly(error.message));
}

export async function changePassword(password: string) {
  const sb = supabase();
  if (!sb) throw new Error("Accounts are not set up yet.");
  if (password.length < MIN_PASSWORD) throw new Error(`Use at least ${MIN_PASSWORD} characters for the password.`);
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw new Error(friendly(error.message));
}

export async function accessToken(): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}
