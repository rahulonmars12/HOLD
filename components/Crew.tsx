"use client";

import Link from "next/link";
import { useState } from "react";
import { byId } from "@/lib/achievements";
import { gradeLabel } from "@/lib/constants";
import { dayLabel, plural } from "@/lib/format";
import { PERSONAS, personaImage, type PersonaId } from "@/lib/persona";
import { nameOf, type FeedItem, type Nudge } from "@/lib/social";
import { Badge } from "./Badge";
import { describeClimb, GradeChip } from "./ClimbCards";
import { Hold } from "./Hold";

export function PersonaFace({ id, size }: { id?: string | null; size: number }) {
  if (!id || !(id in PERSONAS)) return null;
  const info = PERSONAS[id as PersonaId];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={personaImage(info.id)} alt={info.name} title={info.name} width={size} height={size} className="flex-none" />
  );
}

/** A chalky clap: tap to cheer, tap again to take it back. */
export function CheerButton({
  count,
  mine,
  names,
  disabled,
  onToggle,
}: {
  count: number;
  mine: boolean;
  names: string[];
  /** Your own items show their cheers but can't be cheered. */
  disabled?: boolean;
  onToggle?: () => void;
}) {
  const [burst, setBurst] = useState(0);
  const label = disabled
    ? `${plural(count, "cheer")}${names.length ? ` from ${names.join(", ")}` : ""}`
    : mine
      ? "Take back your cheer"
      : "Cheer";
  if (disabled && count === 0) return null;
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={disabled ? undefined : mine}
      title={names.length ? names.join(", ") : undefined}
      data-sfx={disabled || mine ? "none" : "cheer"}
      onClick={() => {
        if (disabled) return;
        if (!mine) setBurst((n) => n + 1);
        onToggle?.();
      }}
      className={`relative flex h-11 flex-none items-center gap-1.5 rounded-full px-3 text-sm font-bold ${
        mine ? "bg-sun" : disabled ? "bg-wall" : "bg-wall"
      } ${disabled ? "cursor-default" : ""}`}
    >
      <svg key={burst} width="20" height="20" viewBox="0 0 24 24" aria-hidden className={burst ? "cheer-pop" : undefined}>
        <path
          d="M12 2.5 L13.9 8.2 L19.8 6.2 L16.4 11.2 L21.5 14.5 L15.5 15 L16 21 L12 16.6 L8 21 L8.5 15 L2.5 14.5 L7.6 11.2 L4.2 6.2 L10.1 8.2 Z"
          fill={mine || (disabled && count > 0) ? "#F06C5B" : "none"}
          stroke={mine || (disabled && count > 0) ? "#F06C5B" : "currentColor"}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}

/** One line of the crew feed: a send, a new pin, a persona change or a finished session. */
export function FeedRow({ item, onCheer, cheersReady = true }: { item: FeedItem; onCheer?: () => void; cheersReady?: boolean }) {
  const who = item.isMe ? "You" : nameOf(item.who);
  const d = item.data ?? {};
  let art: React.ReactNode;
  let text: string;
  let sub = dayLabel(item.at).toLowerCase();
  let quote: string | undefined;

  if (item.kind === "send" && item.climb) {
    art = <GradeChip climb={item.climb} size={52} />;
    text = `${who} sent ${item.climb.name || describeClimb(item.climb).split(",")[0].toLowerCase()}`;
    sub = `${item.climb.gym}, ${sub}`;
    quote = item.climb.whatWorked;
  } else if (item.kind === "pin") {
    const def = byId(item.ref ?? "");
    art = def ? <Badge id={def.id} size={52} /> : <Hold kind="pocket" fill="#B79BFF" shade="#A080F5" size={44} />;
    text = `${who} earned ${def ? `"${def.name}"` : "a new pin"}`;
    if (def) sub = `${def.hint}, ${sub}`;
  } else if (item.kind === "persona") {
    const id = String(d.to ?? item.ref?.split("@")[0] ?? "");
    const from = typeof d.from === "string" && d.from in PERSONAS ? PERSONAS[d.from as PersonaId].name : null;
    const to = id in PERSONAS ? PERSONAS[id as PersonaId] : null;
    art = to ? <PersonaFace id={id} size={52} /> : <Hold kind="jug" fill="#FFDD55" shade="#E8BE2A" size={44} />;
    text = to
      ? from
        ? `${who === "You" ? "Your" : `${who}'s`} ${from} evolved into ${to.article} ${to.name}`
        : `${who} ${who === "You" ? "climb" : "climbs"} like ${to.article} ${to.name}`
      : `${who} evolved`;
  } else {
    const sends = Number(d.sends ?? 0);
    const climbs = Number(d.climbs ?? 0);
    art = (
      <span className="flex h-[3.25rem] w-[3.25rem] flex-none items-center justify-center rounded-full bg-mint">
        <span className="display text-sm">{typeof d.top === "number" ? gradeLabel(d.top) : sends}</span>
      </span>
    );
    text = `${who} wrapped a session`;
    sub = `${plural(climbs, "climb")}, ${plural(sends, "send")}${d.gym ? ` at ${String(d.gym)}` : ""}, ${sub}`;
  }

  return (
    <li className="rounded-[1.5rem] bg-white py-2.5 pl-2.5 pr-2.5">
      <div className="flex items-center gap-3">
        <span className="flex w-[3.25rem] flex-none justify-center">{art}</span>
        <span className="min-w-0 flex-1">
          {item.isMe ? (
            <span className="line-clamp-2 text-[0.9375rem] font-bold leading-snug">{text}</span>
          ) : (
            <Link href={`/buddy?u=${item.who.id}`} className="line-clamp-2 text-[0.9375rem] font-bold leading-snug">
              {text}
            </Link>
          )}
          <span className="muted block truncate text-[0.8125rem]">{sub}</span>
        </span>
        {cheersReady && (
          <CheerButton count={item.cheers.count} mine={item.cheers.mine} names={item.cheers.names} disabled={item.isMe} onToggle={onCheer} />
        )}
      </div>
      {quote && <p className="muted ml-[4rem] mt-1 pr-2 text-sm leading-relaxed">&ldquo;{quote}&rdquo;</p>}
      {item.isMe && item.cheers.names.length > 0 && (
        <p className="ml-[4rem] mt-1 pr-2 text-[0.8125rem] font-semibold">Cheered by {item.cheers.names.slice(0, 3).join(", ")}{item.cheers.names.length > 3 ? ` and ${item.cheers.names.length - 3} more` : ""}</p>
      )}
    </li>
  );
}

/** A small banner that drops in from the top when a buddy does something that concerns you. */
export function NudgeToast({ nudge, onClose }: { nudge: Nudge; onClose: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 px-4" role="status">
      <div className="toast-in pointer-events-auto mx-auto flex max-w-md items-center gap-2.5 rounded-full bg-ink py-2 pl-2 pr-2 text-white shadow-[0_10px_30px_rgb(30_27_58/0.3)]">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-white">
          {nudge.persona && nudge.persona in PERSONAS ? (
            <PersonaFace id={nudge.persona} size={40} />
          ) : (
            <Hold kind="jug" fill="#5FDDB0" shade="#3FC998" size={30} />
          )}
        </span>
        <Link href="/buddies" className="min-w-0 flex-1 text-sm font-semibold leading-snug" onClick={onClose}>
          <strong className="font-bold">{nameOf(nudge.who)}</strong> {nudge.text}
        </Link>
        <button type="button" aria-label="Dismiss" className="flex h-11 w-11 flex-none items-center justify-center rounded-full" onClick={onClose} data-sfx="none">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        </button>
      </div>
    </div>
  );
}
