"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Aurora } from "@/components/Aurora";
import { Badge } from "@/components/Badge";
import { describeClimb, GradeChip } from "@/components/ClimbCards";
import { Companion } from "@/components/Companion";
import { Hold } from "@/components/Hold";
import { HoldRain } from "@/components/HoldRain";
import { Loading } from "@/components/Loading";
import { byId } from "@/lib/achievements";
import { colorLabel, gradeLabel } from "@/lib/constants";
import { getMeta, setMeta } from "@/lib/db";
import { dayLabel, duration, plural } from "@/lib/format";
import { useCustomColors, useData } from "@/lib/hooks";
import { PERSONAS, personaImage } from "@/lib/persona";
import { buildRecap, type Recap } from "@/lib/recap";
import { sfx } from "@/lib/sfx";
import { shareCard } from "@/lib/share";
import { useCountUp } from "@/lib/useCountUp";
import { usePersona } from "@/lib/usePersona";
import { recapLine, recapTitle } from "@/lib/voice";

const noop = () => () => {};

/** The wrap-up after ending a session: what you did, what you earned, what changed. */
export default function RecapPage() {
  const search = useSyncExternalStore(noop, () => window.location.search, () => null);
  const data = useData();
  const custom = useCustomColors();
  const crew = useLiveQuery(async () => (await getMeta<string[]>("crewAch")) ?? [], []);

  const recap = useMemo(() => {
    if (!data || !crew || search === null) return undefined;
    const wanted = new URLSearchParams(search).get("s");
    const latest = data.sessions.filter((s) => s.endedAt !== undefined).sort((a, b) => b.startedAt - a.startedAt)[0];
    const id = wanted ?? latest?.id;
    return id ? buildRecap(id, data.sessions, data.climbs, data.attempts, crew, custom) : null;
  }, [data, crew, search, custom]);

  if (recap === undefined) return <Loading />;
  if (!recap) {
    return (
      <main className="pb-10">
        <h1 className="h-page">No session to wrap up</h1>
        <p className="muted mt-3">Finish a session and its recap shows up here.</p>
        <Link href="/" className="btn mt-5">
          Back to Session
        </Link>
      </main>
    );
  }
  return <RecapScreen key={recap.session.id} recap={recap} />;
}

function Stat({ value, label, tone, delay }: { value: number; label: string; tone: string; delay: number }) {
  const [go, setGo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGo(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const shown = useCountUp(go ? value : 0, 900);
  return (
    <div className="pop-in rounded-[1.5rem] px-4 pb-3 pt-3.5" style={{ background: tone, animationDelay: `${delay}ms` }}>
      <dd className="display text-[2.5rem] leading-none tabular-nums">{shown}</dd>
      <dt className="mt-1.5 text-sm font-bold">{label}</dt>
    </div>
  );
}

function RecapScreen({ recap }: { recap: Recap }) {
  const router = useRouter();
  const data = useData();
  const custom = useCustomColors();
  const personaResult = usePersona(data);
  const seen = useLiveQuery(async () => (await getMeta<string>("personaSeen")) ?? null, []);
  const [shareState, setShareState] = useState<"idle" | "busy" | "saved" | "failed">("idle");
  const pinRef = useRef<HTMLUListElement>(null);

  const persona = personaResult?.ready ? personaResult.persona.id : undefined;
  // The persona you last saw revealed; a different one now means it is about to evolve.
  const shown = seen && seen in PERSONAS ? (seen as keyof typeof PERSONAS) : undefined;
  const evolving = seen !== undefined && persona !== undefined && persona !== seen;
  const { session } = recap;
  const title = recapTitle(recap.sends, recap.attempts);
  const line = recapLine({ sends: recap.sends, falls: recap.falls, flashes: recap.flashes, topGrade: recap.top?.grade ?? null });
  const length = duration((session.endedAt ?? session.startedAt) - session.startedAt);

  useEffect(() => {
    const t = setTimeout(() => sfx("recap"), 250);
    return () => clearTimeout(t);
  }, []);

  const share = async () => {
    if (shareState === "busy") return;
    setShareState("busy");
    const result = await shareCard(
      {
        kicker: `${dayLabel(session.startedAt)} at ${session.gym}`,
        title,
        lines: recap.highlights.slice(0, 2),
        stats: [
          { value: String(recap.climbs), label: "climbs" },
          { value: String(recap.attempts), label: "goes" },
          { value: String(recap.sends), label: "sends" },
          ...(recap.top ? [{ value: gradeLabel(recap.top.grade), label: "top send" }] : []),
        ],
        art: (shown ?? persona) ? { src: personaImage((shown ?? persona)!) } : undefined,
        footer: length,
      },
      "hold-session",
      `${title} ${recap.sends} ${recap.sends === 1 ? "send" : "sends"} in ${recap.attempts} goes at ${session.gym}. Logged on HOLD!`,
    );
    setShareState(result === "shared" ? "idle" : result);
  };

  const done = async () => {
    if (evolving && persona) {
      await setMeta("personaSeen", persona);
      router.replace(`/persona?from=${seen ?? "new"}`);
    } else router.replace("/");
  };

  return (
    <main className="relative -mx-5 -mt-[calc(1.5rem+env(safe-area-inset-top))] min-h-dvh overflow-hidden px-5 pb-[calc(8.5rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <Aurora colors={["#FFEA9C", "#DCCBFF", "#BCD6FF", "#FFD0E2", "#C4F2DF"]} particles />
      {recap.sends > 0 && <HoldRain />}

      <div className="relative">
        <p className="rise-1 inline-flex h-9 items-center rounded-full bg-white/80 px-4 text-sm font-bold">
          {dayLabel(session.startedAt)} · {session.gym.length > 22 ? `${session.gym.slice(0, 21)}…` : session.gym} · {length}
        </p>
        <h1 className="rise-1 display mt-4 text-[2.75rem] leading-[1.02] tracking-[-0.03em]">{title}</h1>
        <Companion persona={shown ?? persona} mood={recap.sends > 0 ? "send" : "idle"} size={92} line={line} className="rise-2 mt-4" />

        <dl className="mt-5 grid grid-cols-2 gap-2.5">
          <Stat value={recap.climbs} label={recap.climbs === 1 ? "climb" : "climbs"} tone="#FFFFFF" delay={350} />
          <Stat value={recap.attempts} label={recap.attempts === 1 ? "go" : "goes"} tone="#FFFFFF" delay={500} />
          <Stat value={recap.sends} label={recap.sends === 1 ? "send" : "sends"} tone="#5FDDB0" delay={650} />
          <Stat value={recap.flashes} label={recap.flashes === 1 ? "flash" : "flashes"} tone="#FFDD55" delay={800} />
        </dl>

        {recap.top && (
          <Link href={`/climb?id=${recap.top.id}`} className="rise-3 mt-3 flex items-center gap-3.5 rounded-[1.75rem] bg-ink px-4 py-3.5 text-white">
            <GradeChip climb={recap.top} size={58} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-sun">Top send</span>
              <span className="display block truncate text-lg leading-tight">
                {recap.top.name || `${colorLabel(recap.top.color, custom)} ${gradeLabel(recap.top.grade)}`}
              </span>
              <span className="block truncate text-sm text-white/75">{describeClimb(recap.top)}</span>
            </span>
          </Link>
        )}

        {recap.highlights.length > (recap.top ? 1 : 0) && (
          <section className="rise-3 card mt-3">
            <h2 className="h-card text-base">Worth remembering</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {recap.highlights.slice(recap.top ? 1 : 0).map((h, i) => (
                <li key={h} className="flex items-start gap-2.5 text-[0.9375rem] font-semibold leading-snug">
                  <Hold kind={(["pinch", "sloper", "pocket"] as const)[i % 3]} fill={["#FF9CC2", "#7EB3FF", "#FFA45C"][i % 3]} size={22} className="mt-0.5 flex-none" />
                  {h}
                </li>
              ))}
            </ul>
          </section>
        )}

        {recap.newPins.length > 0 && (
          <section className="rise-3 card mt-3">
            <div className="flex items-baseline justify-between">
              <h2 className="h-card text-base">{plural(recap.newPins.length, "new pin")}</h2>
              <Link href="/achievements" className="text-sm font-bold underline underline-offset-4">
                Pin board
              </Link>
            </div>
            <ul ref={pinRef} className="mt-3 grid grid-cols-4 gap-x-1 gap-y-3">
              {recap.newPins.slice(0, 8).map((id, i) => (
                <li key={id} className="pop-in flex flex-col items-center text-center" style={{ animationDelay: `${900 + i * 120}ms` }}>
                  <Badge id={id} size={66} />
                  <span className="mt-0.5 line-clamp-2 text-[0.6875rem] font-bold leading-tight">{byId(id)?.name}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {evolving && (
          <section className="rise-3 relative mt-3 flex items-center gap-3 overflow-hidden rounded-[1.75rem] bg-white px-4 py-3.5">
            <span className="evo-glow flex-none">
              {shown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={personaImage(shown)} alt="" width={72} height={72} />
              ) : (
                <Hold kind="jug" fill="#FFDD55" shade="#E8BE2A" size={64} />
              )}
            </span>
            <p className="text-[0.9375rem] font-bold leading-snug">
              {shown ? `Something's happening to your ${PERSONAS[shown].name}…` : "Something's stirring in this hold…"}
              <span className="muted block text-sm font-medium">Your climbing changed shape today.</span>
            </p>
          </section>
        )}

        {session.note && (
          <section className="rise-3 card mt-3">
            <h2 className="h-card text-base">Your note</h2>
            <p className="mt-1.5 whitespace-pre-wrap leading-relaxed">{session.note}</p>
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-b from-wall/0 via-wall/90 to-wall">
        <div className="mx-auto grid max-w-md grid-cols-[1fr_1.6fr] gap-3 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-6">
          <button type="button" className="btn min-h-16 bg-white text-base" onClick={share} disabled={shareState === "busy"} data-sfx="save">
            {shareState === "busy" ? "Making…" : shareState === "saved" ? "Saved" : shareState === "failed" ? "Try again" : "Share"}
          </button>
          <button type="button" className="cta cta-center min-h-16" onClick={done}>
            {evolving ? "See what's happening" : "Done"}
          </button>
        </div>
      </div>
    </main>
  );
}
