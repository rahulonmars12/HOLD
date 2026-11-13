"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Aurora, Halo } from "@/components/Aurora";
import { Badge } from "@/components/Badge";
import { describeClimb, GradeChip } from "@/components/ClimbCards";
import { Hold } from "@/components/Hold";
import { Loading } from "@/components/Loading";
import { ACHIEVEMENTS, byId } from "@/lib/achievements";
import { demoCrew, isDemoId } from "@/lib/demo-crew";
import { dayLabel, plural } from "@/lib/format";
import { PERSONAS, PERSONA_COLORS, personaImage, type PersonaId } from "@/lib/persona";
import { buddyProfile, nameOf, type BuddyProfile } from "@/lib/social";
import { useAuth } from "@/lib/supabase";

const noop = () => () => {};

/** A buddy's page: who they climb like, the pins they've earned and their best sends. */
export default function BuddyPage() {
  const search = useSyncExternalStore(noop, () => window.location.search, () => null);
  const id = search === null ? null : new URLSearchParams(search).get("u");
  const auth = useAuth();
  const [state, setState] = useState<{ id: string; profile: BuddyProfile | null; error?: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    if (isDemoId(id)) {
      // A made-up buddy from the demo data: no account needed.
      const t = setTimeout(() => alive && setState({ id, profile: demoCrew(Date.now()).buddies.find((b) => b.who.id === id) ?? null }), 0);
      return () => {
        alive = false;
        clearTimeout(t);
      };
    }
    if (!auth) return;
    buddyProfile(id)
      .then((profile) => alive && setState({ id, profile }))
      .catch((e) => alive && setState({ id, profile: null, error: e instanceof Error ? e.message : "Couldn't load this buddy." }));
    return () => {
      alive = false;
    };
  }, [auth, id]);

  const back = (
    <Link href="/buddies" aria-label="Back to Buddies" className="relative z-10 flex h-[2.875rem] w-[2.875rem] items-center justify-center rounded-full bg-white">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 4l-6 6 6 6" />
      </svg>
    </Link>
  );

  const demo = isDemoId(id);
  if (search === null || (auth === undefined && !demo)) return <Loading />;
  if ((!auth && !demo) || !id) {
    return (
      <main className="pb-6">
        {back}
        <h1 className="h-page mt-4">Buddies</h1>
        <p className="muted mt-3">{auth ? "Pick a buddy from the Buddies tab." : "Sign in to see your buddies."}</p>
      </main>
    );
  }
  if (!state || state.id !== id) return <Loading />;
  const p = state.profile;
  if (!p) {
    return (
      <main className="pb-6">
        {back}
        <h1 className="h-page mt-4">Can&apos;t find them</h1>
        <p className="muted mt-3">{state.error ?? "This climber isn't on HOLD! any more."}</p>
      </main>
    );
  }

  const persona = p.persona && p.persona in PERSONAS ? PERSONAS[p.persona as PersonaId] : null;
  const dash = p.dash && p.dash in PERSONAS ? PERSONAS[p.dash as PersonaId] : null;
  const pins = p.pins.filter((x) => byId(x));
  const first = nameOf(p.who).split(" ")[0];

  return (
    <main className="pb-6">
      <section
        className={`relative -mx-5 -mt-[calc(1.5rem+env(safe-area-inset-top))] overflow-hidden px-5 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))] ${persona ? "light" : ""}`}
        style={{ background: persona?.tint ?? "var(--color-card)" }}
      >
        {persona && <Aurora colors={PERSONA_COLORS[persona.id]} base={persona.tint} />}
        {back}
        <div className="relative flex flex-col items-center text-center">
          <div className="relative mt-1">
            {persona ? (
              <>
                <Halo colors={PERSONA_COLORS[persona.id]} size={200} className="opacity-60" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={personaImage(persona.id)} alt="" width={176} height={176} className="bob relative" />
              </>
            ) : (
              <Hold kind="jug" fill="#FFDD55" shade="#E8BE2A" size={130} className="my-5" />
            )}
          </div>
          <h1 className="display text-[2.25rem] leading-none tracking-[-0.03em]">{nameOf(p.who)}</h1>
          {p.who.username && p.who.display_name && <p className="mt-1.5 text-sm font-bold text-ink/70">@{p.who.username}</p>}
          {persona ? (
            <p className="mt-3 inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-bold">
              Climbs like {persona.article} {persona.name}
              {dash ? `, with a dash of ${dash.name}` : ""}
            </p>
          ) : (
            <p className="mt-3 inline-flex min-h-10 items-center rounded-full bg-wall px-4 text-sm font-bold">Persona still hatching</p>
          )}
          {persona && <p className="mt-3 text-[0.9375rem] font-bold">{persona.tag}</p>}
        </div>
      </section>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        {[
          [p.sends, p.sends === 1 ? "send" : "sends"],
          [p.sessions30, "sessions this month"],
          [pins.length, pins.length === 1 ? "pin" : "pins"],
        ].map(([v, label]) => (
          <div key={label as string} className="rounded-[1.5rem] bg-white px-3.5 py-3">
            <dd className="display text-[1.75rem] leading-none">{v}</dd>
            <dt className="muted mt-1 text-xs font-bold leading-tight">{label}</dt>
          </div>
        ))}
      </dl>

      <section className="card mt-3">
        <div className="flex items-baseline justify-between">
          <h2 className="h-card">Pin board</h2>
          <span className="muted text-sm font-bold">
            {pins.length} of {ACHIEVEMENTS.length}
          </span>
        </div>
        {pins.length === 0 ? (
          <p className="muted mt-2 text-sm">No pins shared yet.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-4 gap-x-1 gap-y-3">
            {pins.map((id) => (
              <li key={id} className="flex flex-col items-center text-center">
                <Badge id={id} size={64} />
                <span className="mt-0.5 line-clamp-2 text-[0.6875rem] font-bold leading-tight">{byId(id)!.name}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="h-card">Top sends</h2>
        {p.topSends.length === 0 ? (
          <p className="muted mt-2 text-[0.9375rem]">
            {p.isBuddy ? "No sends logged yet." : `You and ${first} aren't buddies right now, so their log is hidden.`}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {p.topSends.map((c) => (
              <li key={c.id} className="rounded-[1.5rem] bg-white py-2.5 pl-2.5 pr-4">
                <div className="flex items-center gap-3.5">
                  <GradeChip climb={c} size={52} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-bold">{c.name || describeClimb(c)}</span>
                    <span className="muted block truncate text-[0.8125rem]">
                      {c.gym}, {dayLabel(c.sentAt ?? c.createdAt).toLowerCase()}
                    </span>
                  </span>
                </div>
                {c.whatWorked && <p className="muted ml-[4.125rem] mt-1 text-sm leading-relaxed">&ldquo;{c.whatWorked}&rdquo;</p>}
              </li>
            ))}
          </ul>
        )}
        {p.lastGym && <p className="muted mt-3 px-1 text-sm">Last seen at {p.lastGym}. {plural(p.sessions30, "session")} in the last 30 days.</p>}
      </section>
    </main>
  );
}
