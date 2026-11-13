"use client";

import { PERSONAS, personaImage, type PersonaId } from "@/lib/persona";
import { Hold } from "./Hold";

export type Mood = "idle" | "fall" | "send" | "rest" | "ready";

/**
 * Your persona as a little companion that reacts to what you do. Before you
 * have a persona it is a hold waiting to hatch.
 */
export function Companion({
  persona,
  mood = "idle",
  size = 84,
  line,
  side = "right",
  className = "",
}: {
  persona?: PersonaId;
  mood?: Mood;
  size?: number;
  /** A short line in a speech bubble. */
  line?: string;
  /** Which side the bubble sits on. */
  side?: "left" | "right";
  className?: string;
}) {
  const name = persona ? PERSONAS[persona].name : "Your companion";
  const body = (
    <span className={`comp comp-${mood} relative block flex-none`} style={{ width: size, height: size }} key={mood}>
      {persona ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={personaImage(persona)} alt="" width={size} height={size} draggable={false} className="select-none" />
      ) : (
        <Hold kind="jug" fill="#FFDD55" shade="#E8BE2A" size={size * 0.8} style={{ margin: size * 0.1 }} />
      )}
      {mood === "rest" && (
        <span aria-hidden className="comp-zz absolute -right-1 -top-1 text-sm font-black text-ink/60">
          z<span className="text-xs">z</span>
        </span>
      )}
    </span>
  );
  return (
    <div className={`flex items-center gap-2 ${side === "left" ? "flex-row-reverse" : ""} ${className}`} role="group" aria-label={line ? `${name} says: ${line}` : name}>
      {body}
      {line && (
        <p key={line} className={`bubble bubble-${side} relative min-w-0 rounded-[1.25rem] bg-white px-3.5 py-2.5 text-sm font-semibold leading-snug`} aria-hidden>
          {line}
        </p>
      )}
    </div>
  );
}
