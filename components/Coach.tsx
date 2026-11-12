"use client";

import Link from "next/link";
import { useState } from "react";
import { Hold } from "./Hold";
import { aiAvailable } from "@/lib/ai";
import { useAuth } from "@/lib/supabase";
import type { CoachNote } from "@/lib/types";

function Sparkle() {
  return (
    <span aria-hidden className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-sun">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1E1B3A">
        <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
        <path d="M19 15l0.8 2.2L22 18l-2.2 0.8L19 21l-0.8-2.2L16 18l2.2-0.8z" />
      </svg>
    </span>
  );
}

/**
 * AI coach notes: shows the saved note, lets the climber ask for a fresh one
 * or ask a question. `request` does the network call and saving.
 */
export function CoachCard({
  note,
  request,
  cta = "Get coach notes",
  intro,
}: {
  note?: CoachNote;
  request: (question?: string) => Promise<void>;
  cta?: string;
  intro?: string;
}) {
  const auth = useAuth();
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!aiAvailable) return null;

  const run = async (q?: string) => {
    setBusy(true);
    setError(null);
    try {
      await request(q);
      setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Coach notes" className="tile relative bg-ink p-[1.125rem] text-white">
      <Hold kind="volume" fill="#34305E" shade="#2A2650" size={120} rotate={20} plain style={{ position: "absolute", right: -30, top: -34 }} />
      <div className="relative flex items-center gap-2.5">
        <Sparkle />
        <span>
          <span className="block display text-base font-bold">Coach notes</span>
          <span className="block text-xs text-line">Written by AI from your log. Check it against how it felt.</span>
        </span>
      </div>

      {!auth ? (
        <p className="relative mt-3.5 text-[0.9375rem] leading-relaxed">
          <Link href="/settings" className="font-bold underline underline-offset-4">
            Sign in
          </Link>{" "}
          to get notes on what changed between your falls and your send, and what to practise next.
        </p>
      ) : note ? (
        <>
          {note.question && <p className="relative mt-3.5 text-sm italic text-line">&ldquo;{note.question}&rdquo;</p>}
          <p className="relative mt-3 text-[0.9375rem] leading-relaxed">{note.summary}</p>
          {note.practice.length > 0 && (
            <>
              <h3 className="relative mb-2 mt-3.5 text-[0.8125rem] font-bold text-line">Practise next session</h3>
              <ul className="relative flex flex-wrap gap-1.5 text-sm font-bold">
                {note.practice.map((p) => (
                  <li key={p} className="rounded-2xl bg-white px-3 py-1.5 text-ink">
                    {p}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <>
          {intro && <p className="relative mt-3 text-[0.9375rem] leading-relaxed text-line">{intro}</p>}
          <button type="button" className="btn relative mt-3.5 w-full" disabled={busy} onClick={() => run()}>
            {busy ? "Thinking…" : cta}
          </button>
        </>
      )}

      {auth && (
        <form
          className="relative mt-3.5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (question.trim()) void run(question);
          }}
        >
          <label htmlFor="ask" className="sr-only">
            Ask the coach
          </label>
          <input
            id="ask"
            className="h-12 min-w-0 flex-1 rounded-full bg-ink-2 px-4 text-[0.9375rem] text-white placeholder:text-[#A6A3C8]"
            placeholder={note ? "Ask a follow-up" : "Or ask a question"}
            value={question}
            maxLength={500}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button
            type="submit"
            aria-label="Ask"
            disabled={busy || !question.trim()}
            className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-sun disabled:opacity-60"
          >
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none" stroke="#1E1B3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 11h13M12 5l6 6-6 6" />
            </svg>
          </button>
        </form>
      )}
      {busy && note && <p className="relative mt-2 text-sm text-line">Thinking…</p>}
      {error && (
        <p role="alert" className="relative mt-2.5 text-sm font-semibold text-sun">
          {error}
        </p>
      )}
    </section>
  );
}
