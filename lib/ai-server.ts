import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { cloud } from "./cloud-config";

/** Requests per climber per rolling 24 hours, to keep the API bill predictable. */
export const DAILY_LIMIT = 40;

export const MODEL = process.env.TICKMARK_AI_MODEL || "claude-sonnet-5-5";

let anthropic: Anthropic | null = null;

export function claude() {
  anthropic ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

const fail = (status: number, error: string) => ({
  ok: false as const,
  response: Response.json({ error }, { status }),
});

/**
 * Checks the caller is signed in and under the daily cap, then records the
 * call. Uses the caller's own token, so row-level security applies.
 */
export async function authorize(req: Request, kind: string) {
  const { url, key } = cloud;
  if (!process.env.ANTHROPIC_API_KEY) return fail(503, "AI isn't set up yet. Add ANTHROPIC_API_KEY in Vercel.");
  if (!url || !key) return fail(503, "Accounts aren't set up yet, and AI needs you signed in.");

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return fail(401, "Sign in to use AI.");

  const sb = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return fail(401, "Your sign-in has expired. Sign in again.");

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await sb
    .from("ai_calls")
    .select("id", { count: "exact", head: true })
    .gte("at", since);
  if (countError) return fail(500, countError.message);
  if ((count ?? 0) >= DAILY_LIMIT) {
    return fail(429, `You've used today's ${DAILY_LIMIT} AI requests. More tomorrow.`);
  }
  await sb.from("ai_calls").insert({ kind });
  return { ok: true as const, userId: data.user.id };
}

export function aiError(e: unknown) {
  if (e instanceof Anthropic.APIError) {
    const status = e.status === 429 ? 429 : 502;
    return Response.json(
      { error: status === 429 ? "The AI service is busy. Try again in a minute." : "The AI service failed. Try again." },
      { status },
    );
  }
  return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
}
