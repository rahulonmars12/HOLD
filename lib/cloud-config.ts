/**
 * Reads the Supabase settings from Vercel and tidies common paste mistakes,
 * so a wrong value shows a message in Settings instead of breaking the app.
 */

function normaliseUrl(raw: string): string | null {
  let v = raw.trim().replace(/^["']|["']$/g, "");
  // Just the project id, e.g. "abcdefghijklmnopqrst".
  if (/^[a-z0-9]{20}$/.test(v)) v = `https://${v}.supabase.co`;
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`;
  try {
    const u = new URL(v);
    return u.hostname.includes(".") ? u.origin : null;
  } catch {
    return null;
  }
}

function read() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim().replace(/^["']|["']$/g, "") ?? "";
  if (!rawUrl && !rawKey) return { url: null, key: null, problem: null };

  if (/^sb_/.test(rawUrl) || /^https?:\/\//i.test(rawKey)) {
    return {
      url: null,
      key: null,
      problem:
        "The two Supabase values in Vercel look swapped. NEXT_PUBLIC_SUPABASE_URL should be the https://….supabase.co address, and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY the sb_publishable_… key.",
    };
  }
  if (/^sb_secret_/.test(rawKey)) {
    return {
      url: null,
      key: null,
      problem:
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is set to the secret key, which must never go in the app. Use the sb_publishable_… key, then delete and recreate the secret key in Supabase (Project Settings, API Keys) to be safe.",
    };
  }
  if (!rawUrl) return { url: null, key: null, problem: "NEXT_PUBLIC_SUPABASE_URL is missing in Vercel." };
  if (!rawKey) return { url: null, key: null, problem: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing in Vercel." };

  const url = normaliseUrl(rawUrl);
  if (!url) {
    return {
      url: null,
      key: null,
      problem: `NEXT_PUBLIC_SUPABASE_URL in Vercel isn't a web address ("${rawUrl.slice(0, 40)}"). Use the Project URL, like https://abcdefgh.supabase.co.`,
    };
  }
  if (/(^|\.)supabase\.com$/.test(new URL(url).hostname)) {
    return {
      url: null,
      key: null,
      problem:
        "NEXT_PUBLIC_SUPABASE_URL is the dashboard link. Use the Project URL instead, like https://abcdefgh.supabase.co (Project Settings, Data API).",
    };
  }
  return { url, key: rawKey, problem: null };
}

export const cloud = read();
