"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { RARITY_LABEL, byId } from "@/lib/achievements";
import { pieceSound, sfx } from "@/lib/sfx";
import { Aurora, Burst, Halo, RARITY_BG } from "./Aurora";
import { Badge, assembleMs, piecesOf } from "./Badge";
import { HoldRain } from "./HoldRain";

const RARITY_PILL: Record<string, string> = {
  bronze: "#F6C9A6",
  silver: "#E3E8F5",
  gold: "#FFE58A",
  holo: "linear-gradient(90deg,#FF9CC2,#FFDD55,#5FDDB0,#7EB3FF,#B79BFF)",
};

/**
 * Full-screen unlock: the hold pieces fly in and snap together, the rim locks
 * around them with a clink, a shine sweeps across, then the name.
 */
export function AchievementUnlock({ id, more = 0, onDone }: { id: string; more?: number; onDone: () => void }) {
  const def = byId(id);
  const [shown, setShown] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (!def) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    if (calm) {
      at(0, () => {
        setShown(true);
        setLocked(true);
        sfx("achievement");
      });
    } else {
      const n = piecesOf(id);
      for (let i = 0; i < n; i++) at(120 + i * 90 + 450, () => pieceSound(i));
      const { lock, piecesDone } = assembleMs(id);
      at(lock + 200, () => {
        sfx("clink");
        setLocked(true);
      });
      at(piecesDone + 150, () => {
        setShown(true);
        sfx("achievement");
      });
    }
    return () => timers.forEach(clearTimeout);
  }, [def, id]);

  if (!def) return null;
  if (typeof document === "undefined") return null;
  // Rendered at the top of the page so nothing, like the tab bar, can sit above it.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Achievement unlocked: ${def.name}`}
      className="fixed inset-0 z-[60] flex flex-col items-center overflow-hidden bg-wall px-6 pt-[calc(4rem+env(safe-area-inset-top))] text-center text-ink"
    >
      <Aurora colors={RARITY_BG[def.rarity].colors} base={RARITY_BG[def.rarity].base} rainbow={def.rarity === "holo"} particles />
      <p className="relative flex h-9 items-center rounded-full bg-white/75 px-4 text-sm font-bold backdrop-blur">Achievement unlocked</p>
      <div className="relative mt-8">
        <Halo colors={RARITY_BG[def.rarity].halo} size={310} className={locked ? "" : "halo-fast"} />
        {locked && <Burst delay={0} />}
        <div className={`relative ${locked ? "coin-float" : ""}`} style={{ filter: "drop-shadow(0 18px 24px rgb(30 27 58 / 0.25))" }}>
          <Badge id={id} size={250} assemble label={def.name} />
        </div>
      </div>
      <div className={`relative mt-6 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}>
        <p className="text-sm font-bold text-ink/70">No. {String(def.no).padStart(2, "0")} of 27</p>
        <h1 className="display mt-1 text-[2.25rem] leading-tight">{def.name}</h1>
        <p className="mx-auto mt-2 max-w-[18rem] text-[0.9375rem] leading-relaxed text-ink/80">{def.done}</p>
        <span
          className="mt-3 inline-flex h-8 items-center rounded-full px-3.5 text-sm font-bold text-ink shadow-[inset_0_0_0_1.5px_rgb(30_27_58/0.12)]"
          style={{ background: RARITY_PILL[def.rarity] }}
        >
          {RARITY_LABEL[def.rarity]}
        </span>
        {more > 0 && <p className="mt-3 text-sm font-semibold text-ink/70">+ {more} more in your collection</p>}
      </div>
      {shown && <HoldRain />}
      <div className="absolute inset-x-5 bottom-[calc(1.5rem+env(safe-area-inset-bottom))]">
        {shown ? (
          <button type="button" className="cta cta-center" onClick={onDone}>
            Nice!
          </button>
        ) : (
          <button type="button" className="mx-auto block min-h-11 px-4 text-sm font-semibold text-ink/60" onClick={onDone} data-sfx="none">
            Skip
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
