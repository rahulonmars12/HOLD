"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { Evolution } from "@/components/Evolution";
import { useData } from "@/lib/hooks";
import { MIN_SESSIONS, PERSONAS, PERSONA_ORDER, personaImage, type Persona, type PersonaId } from "@/lib/persona";
import { usePersona } from "@/lib/usePersona";

const noop = () => () => {};

/** Your climbing persona, full screen, with every persona below it. */
export default function PersonaPage() {
  const data = useData();
  const result = usePersona(data);
  const router = useRouter();
  const search = useSyncExternalStore(noop, () => window.location.search, () => "");
  const [watched, setWatched] = useState(false);
  const fromParam = new URLSearchParams(search).get("from");
  const from = fromParam === "new" ? "new" : fromParam && fromParam in PERSONAS ? (fromParam as PersonaId) : null;

  if (!result) return null;
  const evolving = result.ready && from !== null && !watched && from !== result.persona.id;
  return (
    <main className="-mx-5 -mt-6 pb-10">
      {evolving && (
        <Evolution
          from={from}
          to={result.persona.id}
          onDone={() => {
            setWatched(true);
            router.replace("/persona");
          }}
        />
      )}
      {result.ready ? <Reveal persona={result.persona} /> : <NotYet sessions={result.sessions} />}
      <Catalog current={result.ready ? result.persona.id : undefined} />
    </main>
  );
}

function PersonaImg({ id, size, className = "" }: { id: PersonaId; size: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={personaImage(id)} alt="" width={size} height={size} className={`flex-none select-none ${className}`} draggable={false} />
  );
}

function Close() {
  return (
    <Link
      href="/insights"
      aria-label="Close"
      className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/80"
    >
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#1E1B3A" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
        <path d="M5 5l10 10M15 5L5 15" />
      </svg>
    </Link>
  );
}

function Reveal({ persona }: { persona: Persona }) {
  const info = PERSONAS[persona.id];
  const dash = PERSONAS[persona.dash];
  const edge = PERSONAS[info.edge.from];
  const [shared, setShared] = useState(false);

  const share = async () => {
    const text = `I climb like ${info.article} ${info.name} on HOLD!, with a dash of ${dash.name}. ${info.line}`;
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My HOLD! persona", text, url });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShared(true);
    } catch {
      // Nothing more to try; the button just stays as it is.
    }
  };

  return (
    <section className="relative overflow-hidden pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]" style={{ background: info.tint }}>
      <div
        aria-hidden
        className="rays pointer-events-none absolute left-1/2 top-[-12rem] h-[48rem] w-[48rem] -translate-x-1/2 rounded-full"
        style={{ background: "repeating-conic-gradient(rgb(255 255 255 / 0.55) 0deg 9deg, transparent 9deg 20deg)" }}
      />
      <Close />
      <div className="relative flex flex-col items-center px-5 text-center">
        <p className="rise-1 flex h-9 items-center rounded-full bg-white/80 px-4 text-sm font-bold">Your climbing persona</p>
        <div className="persona-pop mt-2">
          <div className="bob">
            <PersonaImg id={persona.id} size={230} />
          </div>
        </div>
        <p className="rise-1 text-lg font-bold">You climb like {info.article}</p>
        <h1 className="rise-1 display mt-0.5 text-[3.25rem] leading-none tracking-[-0.03em]">{info.name}</h1>
        <p className="rise-2 mt-3 flex h-11 items-center gap-1.5 rounded-full bg-white pl-1 pr-4 text-sm font-bold">
          <PersonaImg id={persona.dash} size={38} />
          with a dash of {dash.name}
        </p>
        <p className="rise-2 mt-3 max-w-[19rem] text-[0.9375rem] font-medium leading-relaxed">{info.line}</p>
        <ul className="rise-3 mt-4 flex w-full flex-col gap-2 text-left">
          {persona.facts.map((f) => (
            <li key={f.text} className="flex items-center gap-3 rounded-[1.25rem] bg-white/80 px-4 py-3">
              <span className="display min-w-[3.25rem] text-lg">{f.value}</span>
              <span className="text-sm font-semibold leading-snug">{f.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mx-5 mt-4 overflow-hidden rounded-[1.75rem] bg-ink px-5 pb-5 pt-4 text-white">
        <PersonaImg id={edge.id} size={110} className="absolute -bottom-3 -right-2" />
        <p className="text-sm font-bold text-sun">Growth edge</p>
        <h2 className="display mt-1 max-w-[13rem] text-xl leading-tight">Borrow from the {edge.name}</h2>
        <p className="mt-2 max-w-[14.5rem] text-[0.9375rem] leading-relaxed text-white/85">{info.edge.tip}</p>
      </div>

      <div className="relative mx-5 mt-4 grid grid-cols-2 gap-3">
        <button type="button" className="btn min-h-14 bg-white text-base" onClick={share} data-sfx="save">
          {shared ? "Copied" : "Share"}
        </button>
        <Link href="/insights" className="btn btn-ink min-h-14 text-base">
          Nice!
        </Link>
      </div>
      <p className="muted relative mt-3 px-5 text-center text-xs">
        From your last 90 days ({persona.sessions} {persona.sessions === 1 ? "session" : "sessions"}). It can change
        after every session.
      </p>
    </section>
  );
}

function NotYet({ sessions }: { sessions: number }) {
  return (
    <section className="relative overflow-hidden bg-white px-5 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <Close />
      <div className="flex -space-x-6">
        {(["gecko", "monkey", "owl"] as const).map((id) => (
          <PersonaImg key={id} id={id} size={96} className="opacity-35 grayscale" />
        ))}
      </div>
      <h1 className="display mt-3 text-[1.75rem] leading-tight">Your persona is on its way</h1>
      <p className="muted mt-2 text-[0.9375rem] leading-relaxed">
        After your first session, HOLD! works out which climber you are from your angles, holds, styles, falls and
        reads. It can change after every session.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-wall">
          <div
            className="grow-x h-3 rounded-full bg-ink"
            style={{ width: `${Math.min(100, (sessions / MIN_SESSIONS) * 100)}%` }}
          />
        </div>
        <span className="text-sm font-bold">
          {Math.min(sessions, MIN_SESSIONS)} of {MIN_SESSIONS}
        </span>
      </div>
    </section>
  );
}

function Catalog({ current }: { current?: PersonaId }) {
  return (
    <section className="px-5 pt-7">
      <h2 className="h-card">All 12 personas</h2>
      <p className="muted mt-1 text-sm">You get a main one plus a dash of the runner-up.</p>
      <ul className="mt-4 grid grid-cols-2 gap-3">
        {PERSONA_ORDER.map((id) => {
          const p = PERSONAS[id];
          return (
            <li
              key={id}
              className={`flex flex-col rounded-[1.5rem] bg-white px-3.5 pb-4 pt-2 ${id === current ? "shadow-[inset_0_0_0_3px_#1E1B3A]" : ""}`}
            >
              <PersonaImg id={id} size={104} className="self-center" />
              <span className="display mt-1 text-base leading-tight">{p.name}</span>
              <span className="mt-1 self-start rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: p.tint }}>
                {p.tag}
              </span>
              <span className="muted mt-2 text-xs leading-relaxed">{p.rule}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
