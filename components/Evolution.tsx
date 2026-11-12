"use client";

import { useEffect, useState } from "react";
import { PERSONAS, personaImage, type PersonaId } from "@/lib/persona";
import { evolveSound, sfx } from "@/lib/sfx";
import { Hold } from "./Hold";

type Phase = "intro" | "morph" | "flash" | "done";

/** Swap times for the morph: slow at first, then faster and faster. */
const SWAPS = (() => {
  const out: number[] = [];
  let t = 0;
  let gap = 420;
  while (t < 3200) {
    t += gap;
    out.push(t);
    gap = Math.max(55, gap * 0.84);
  }
  return out;
})();
const INTRO_MS = 1500;
const MORPH_MS = SWAPS[SWAPS.length - 1] + 120;

const SILHOUETTE = "brightness(0) invert(1) drop-shadow(0 0 22px rgb(255 255 255 / 0.85))";

/**
 * The persona change, told like a creature evolving: the old persona glows,
 * flickers between its shape and the new one faster and faster, a flash, and
 * the new persona appears. `from` is "new" the first time, when a hold hatches.
 */
export function Evolution({ from, to, onDone }: { from: PersonaId | "new"; to: PersonaId; onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => {
        setPhase("done");
        sfx("persona");
      }, 0);
      return () => clearTimeout(t);
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    at(150, () => evolveSound("start"));
    at(INTRO_MS, () => setPhase("morph"));
    SWAPS.forEach((ms, i) =>
      at(INTRO_MS + ms, () => {
        setShowNew((v) => !v);
        evolveSound(i);
      }),
    );
    at(INTRO_MS + MORPH_MS, () => {
      setShowNew(true);
      setPhase("flash");
      sfx("persona");
    });
    at(INTRO_MS + MORPH_MS + 450, () => setPhase("done"));
    return () => timers.forEach(clearTimeout);
  }, []);

  const fromName = from === "new" ? null : PERSONAS[from].name;
  const toInfo = PERSONAS[to];
  const morphing = phase === "morph" || phase === "flash";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`You now climb like ${toInfo.article} ${toInfo.name}`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-ink px-6 text-center text-white"
    >
      <div
        aria-hidden
        className={`evo-rays pointer-events-none absolute left-1/2 top-1/2 h-[60rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full ${morphing ? "evo-rays-fast" : ""}`}
        style={{
          background:
            phase === "done"
              ? `repeating-conic-gradient(${toInfo.tint}66 0deg 9deg, transparent 9deg 20deg)`
              : "repeating-conic-gradient(rgb(255 255 255 / 0.08) 0deg 9deg, transparent 9deg 20deg)",
        }}
      />

      <p className="relative min-h-14 max-w-[18rem] text-lg font-bold leading-snug">
        {phase === "done"
          ? "Your climbing changed shape!"
          : fromName
            ? `Your ${fromName} is evolving…`
            : "Your climbing is taking shape…"}
      </p>

      <div className="relative mt-4 flex h-64 w-64 items-center justify-center">
        {phase === "done" ? (
          <>
            <Sparkles />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={personaImage(to)} alt="" width={240} height={240} className="persona-pop relative" />
          </>
        ) : (
          <>
            <span className={`absolute inset-0 flex items-center justify-center ${phase === "intro" ? "evo-glow" : ""}`} style={{ opacity: showNew ? 0 : 1 }}>
              {from === "new" ? (
                <Hold
                  kind="jug"
                  fill={morphing ? "#FFFFFF" : "#FFDD55"}
                  shade={morphing ? "#FFFFFF" : "#E8BE2A"}
                  bolt={morphing ? "#FFFFFF" : undefined}
                  size={200}
                  style={morphing ? { filter: "drop-shadow(0 0 22px rgb(255 255 255 / 0.85))" } : undefined}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={personaImage(from)} alt="" width={240} height={240} style={morphing ? { filter: SILHOUETTE } : undefined} />
              )}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={personaImage(to)}
              alt=""
              width={240}
              height={240}
              className="absolute"
              style={{ opacity: showNew ? 1 : 0, filter: SILHOUETTE }}
            />
          </>
        )}
      </div>

      <div className="relative mt-4 min-h-36">
        {phase === "done" && (
          <>
            <p className="rise-1 text-lg font-bold">You now climb like {toInfo.article}</p>
            <p className="rise-1 display mt-1 text-[2.75rem] leading-none" style={{ color: toInfo.tint }}>
              {toInfo.name}
            </p>
            <p className="rise-2 mx-auto mt-3 max-w-[18rem] text-[0.9375rem] leading-relaxed text-white/80">{toInfo.line}</p>
          </>
        )}
      </div>

      <div className="absolute inset-x-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {phase === "done" ? (
          <button type="button" className="cta cta-center rise-3" onClick={onDone}>
            See why
          </button>
        ) : (
          <button type="button" className="mx-auto block min-h-11 px-4 text-sm font-semibold text-white/60" onClick={onDone} data-sfx="none">
            Skip
          </button>
        )}
      </div>

      {phase === "flash" && <div aria-hidden className="evo-flash pointer-events-none absolute inset-0 bg-white" />}
    </div>
  );
}

function Sparkles() {
  const spots = [
    [8, 18, 0], [82, 10, 0.2], [92, 58, 0.4], [14, 76, 0.1], [50, 2, 0.35], [70, 88, 0.15], [30, 40, 0.5], [2, 48, 0.3],
  ];
  return (
    <span aria-hidden className="pointer-events-none absolute -inset-6">
      {spots.map(([x, y, d], i) => (
        <svg
          key={i}
          width="22"
          height="22"
          viewBox="0 0 20 20"
          className="sparkle absolute"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }}
        >
          <path d="M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z" fill="#FFDD55" />
        </svg>
      ))}
    </span>
  );
}
