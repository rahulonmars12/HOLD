"use client";

import { useRef, useState } from "react";
import { ANGLES, HOLDS, HOLD_COLORS, MAX_GRADE, STYLES, gradeLabel, holdHex } from "@/lib/constants";
import { saveCustomColor } from "@/lib/db";
import type { Angle, CustomColor, Hold as HoldKind, HoldColor, Style } from "@/lib/types";
import { Hold } from "./Hold";

/* Grade */

export function GradeSlider({ value, onChange }: { value: number; onChange: (g: number) => void }) {
  const pct = (value / MAX_GRADE) * 100;
  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="One grade easier"
          className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-wall"
          onClick={() => onChange(Math.max(0, value - 1))}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
            <path d="M4 10h12" />
          </svg>
        </button>
        <output htmlFor="grade" aria-live="polite" className="display text-[4rem] leading-none">
          {gradeLabel(value)}
        </output>
        <button
          type="button"
          aria-label="One grade harder"
          className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-wall"
          onClick={() => onChange(Math.min(MAX_GRADE, value + 1))}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
            <path d="M4 10h12M10 4v12" />
          </svg>
        </button>
      </div>
      <div className="mt-5 px-1">
        <input
          id="grade"
          type="range"
          className="grade-range"
          min={0}
          max={MAX_GRADE}
          step={1}
          value={value}
          aria-label="Grade"
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ background: `linear-gradient(90deg, var(--color-ink) ${pct}%, var(--color-wall) ${pct}%)` }}
        />
        <div aria-hidden className="muted mt-2.5 flex justify-between text-xs font-bold">
          {[0, 2, 4, 6, 8, 10, 12, 14].map((g) => (
            <span key={g}>{gradeLabel(g)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Colour */

export function ColorPicker({
  value,
  onChange,
  custom,
}: {
  value: HoldColor | null;
  onChange: (c: HoldColor) => void;
  custom: CustomColor[];
}) {
  const picker = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ hex: `#${string}`; label: string } | null>(null);

  const swatch = (hex: string, label: string, id: HoldColor, star = false) => {
    const on = value?.toLowerCase() === id.toLowerCase();
    return (
      <button
        key={id}
        type="button"
        aria-label={star ? `${label}, your colour` : label}
        aria-pressed={on}
        onClick={() => onChange(id)}
        className="relative flex h-[2.875rem] w-[2.875rem] items-center justify-center rounded-full"
        style={{
          background: hex,
          boxShadow: on ? "0 0 0 3px var(--color-card), 0 0 0 6px var(--color-ink)" : hex.toLowerCase() === "#ffffff" ? "inset 0 0 0 2px #C9D1E8" : undefined,
        }}
      >
        {on && (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden stroke={id === "black" ? "#FFFFFF" : "#1E1B3A"}>
            <path d="M4 9l3.5 3.5L14 5" />
          </svg>
        )}
        {star && (
          <span aria-hidden className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="#1E1B3A" className="text-[#1E1B3A]">
              <path d="M5 0.5l1.3 2.9 3.2 0.3-2.4 2.1 0.7 3.1L5 7.3 2.2 8.9l0.7-3.1L0.5 3.7l3.2-0.3z" />
            </svg>
          </span>
        )}
      </button>
    );
  };

  return (
    <div>
      <div role="group" aria-label="Hold colour" className="flex flex-wrap gap-2.5">
        {HOLD_COLORS.map((c) => swatch(c.hex, c.label, c.id))}
        {custom.map((c) => swatch(c.hex, c.label, c.hex, true))}
        <button
          type="button"
          aria-label="Add your own colour"
          className="flex h-[2.875rem] w-[2.875rem] items-center justify-center rounded-full bg-white shadow-[inset_0_0_0_2px_#8C8AA6]"
          onClick={() => picker.current?.click()}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
            <path d="M9 3v12M3 9h12" />
          </svg>
        </button>
        <input
          ref={picker}
          type="color"
          aria-label="Pick a hold colour"
          className="sr-only"
          defaultValue="#3CC6D0"
          onChange={(e) => setDraft({ hex: e.target.value as `#${string}`, label: draft?.label ?? "" })}
        />
      </div>
      {draft ? (
        <div className="mt-3 flex items-center gap-2.5 rounded-[1.375rem] bg-wall p-2 pl-2.5">
          <span aria-hidden className="h-9 w-9 flex-none rounded-full" style={{ background: draft.hex }} />
          <label htmlFor="color-name" className="sr-only">
            Colour name
          </label>
          <input
            id="color-name"
            className="field field-white min-h-11 flex-1 py-2"
            placeholder="Name it, e.g. Teal"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
          <button
            type="button"
            className="btn btn-ink min-h-11 px-4"
            onClick={async () => {
              await saveCustomColor({ hex: draft.hex, label: draft.label.trim() || "Custom" });
              onChange(draft.hex);
              setDraft(null);
            }}
          >
            Add
          </button>
        </div>
      ) : (
        <p className="muted mt-2.5 pl-1 text-[0.8125rem]">
          Gym uses a colour that isn&apos;t here? Tap + to pick it. It stays in your list, marked with a star.
        </p>
      )}
    </div>
  );
}

/* Wall angle */

const ANGLE_ICONS: Record<Angle, { fill: string; line: string; hold: [number, number] }> = {
  slab: { fill: "M17 28 L8 4 L3 4 L3 28 Z", line: "M17 28 L8 4", hold: [22, 22] },
  vertical: { fill: "M12 28 L12 4 L3 4 L3 28 Z", line: "M12 28 L12 4", hold: [18, 16] },
  overhang: { fill: "M7 28 L17 4 L3 4 L3 28 Z", line: "M7 28 L17 4", hold: [20, 16] },
  steep: { fill: "M4 28 L26 6 L3 6 L3 28 Z", line: "M4 28 L26 6", hold: [20, 18] },
  roof: { fill: "M5 28 V8 H30 V3 H3 V28 Z", line: "M5 28 V8 H30", hold: [18, 12] },
};

export function AngleIcon({ angle, on = false, size = 36 }: { angle: Angle; on?: boolean; size?: number }) {
  const a = ANGLE_ICONS[angle];
  const ink = on ? "#FFFFFF" : "var(--color-ink)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={a.fill} fill={on ? "#46426E" : "var(--color-line)"} />
      <path d={a.line} stroke={ink} strokeWidth="2.6" />
      <path d="M2 28 H30" stroke={ink} strokeWidth="2.6" />
      <circle cx={a.hold[0]} cy={a.hold[1]} r="2.5" fill={on ? "#FFDD55" : "var(--color-ink)"} />
    </svg>
  );
}

export function AnglePicker({ value, onChange }: { value: Angle | null; onChange: (a: Angle) => void }) {
  return (
    <div role="group" aria-label="Wall angle" className="grid grid-cols-5 gap-1.5">
      {ANGLES.map((a) => {
        const on = value === a.id;
        return (
          <button
            key={a.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(a.id)}
            className={`flex h-[5.75rem] flex-col items-center justify-center gap-1.5 rounded-[1.375rem] text-xs font-bold ${
              on ? "bg-ink text-white" : "bg-wall"
            }`}
          >
            <AngleIcon angle={a.id} on={on} />
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

/* Holds and styles, with an info card for each */

const HOLD_SHADES: Record<HoldKind, [string, string]> = {
  crimp: ["#7EB3FF", "#5E9EF5"],
  sloper: ["#FFA45C", "#F58F40"],
  pinch: ["#5FDDB0", "#3FC998"],
  pocket: ["#B79BFF", "#A080F5"],
  jug: ["#FFDD55", "#C9A21E"],
  volume: ["#FF9CC2", "#F582AD"],
};

export const holdColorsFor = (h: HoldKind) => HOLD_SHADES[h];

export function StyleIcon({ style, on = false }: { style: Style; on?: boolean }) {
  const c = "#1E1B3A";
  const paths: Record<Style, React.ReactNode> = {
    dynamic: (
      <>
        <path d="M4 19 Q8 3 19 8" strokeDasharray="3 3" />
        <path d="M15 5l4 3-4 3" />
        <circle cx="4" cy="19" r="2" fill={c} />
      </>
    ),
    coordination: (
      <>
        <circle cx="5" cy="18" r="2.5" />
        <circle cx="19" cy="6" r="2.5" />
        <path d="M7 16 C10 9 14 15 17 8" />
        <path d="M5 11v-3M19 13v3" />
      </>
    ),
    compression: <path d="M2 12h7M6 8l4 4-4 4M22 12h-7M18 8l-4 4 4 4" />,
    power: <path d="M13.5 2L5 14h6l-1.5 8L19 10h-6z" fill={c} stroke="none" />,
    tension: (
      <>
        <path d="M3 4v16" />
        <circle cx="7" cy="7" r="2" fill={c} />
        <circle cx="7" cy="18" r="2" fill={c} />
        <path d="M9 8 C16 9 18 15 9 17" />
        <path d="M14 4l-2 2M18 8l-2 1" />
      </>
    ),
    balance: (
      <>
        <path d="M12 6v14M7 20h10M3 9h18" />
        <path d="M5 9l-2 5h4zM19 9l-2 5h4z" />
        <circle cx="12" cy="4" r="1.5" fill={c} />
      </>
    ),
    hooks: (
      <>
        <path d="M8 3v10a5 5 0 0 0 10 0v-1" />
        <path d="M15 15l3-3 3 3" />
      </>
    ),
    mantle: (
      <>
        <path d="M2 14h13v8" />
        <path d="M9 11V3M6 6l3-3 3 3" />
        <path d="M5 14v-2h8v2" />
      </>
    ),
  };
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 items-center justify-center rounded-full text-[#1E1B3A]"
      style={{ background: on && style === "power" ? "#FFDD55" : "#FFFFFF" }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {paths[style]}
      </svg>
    </span>
  );
}

function InfoTiles<T extends string>({
  label,
  items,
  value,
  onChange,
  icon,
}: {
  label: string;
  items: { id: T; tile: string; title: string; desc: string; tip: string }[];
  value: T[];
  onChange: (next: T[]) => void;
  icon: (id: T, on: boolean) => React.ReactNode;
}) {
  const [info, setInfo] = useState<T | null>(null);
  const open = items.find((i) => i.id === info);
  return (
    <div>
      <div role="group" aria-label={label} className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const on = value.includes(item.id);
          return (
            <div key={item.id} className="relative">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? value.filter((v) => v !== item.id) : [...value, item.id])}
                className={`flex h-24 w-full flex-col items-center justify-center gap-2 rounded-[1.375rem] px-1.5 text-sm font-bold ${
                  on ? "bg-ink text-white" : "bg-wall"
                }`}
              >
                {icon(item.id, on)}
                {item.tile}
              </button>
              <button
                type="button"
                aria-label={`About ${item.title.toLowerCase()}`}
                aria-expanded={info === item.id}
                onClick={() => setInfo(info === item.id ? null : item.id)}
                className="absolute right-1 top-1 flex h-[1.875rem] w-[1.875rem] items-center justify-center rounded-full"
              >
                <span
                  aria-hidden
                  className={`flex h-5 w-5 items-center justify-center rounded-full font-serif text-[0.8125rem] font-bold italic ${
                    on ? "bg-ink-2 text-white" : "bg-white"
                  }`}
                >
                  i
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {open && (
        <div aria-live="polite" className="relative mt-2.5 rounded-[1.375rem] bg-wall py-3.5 pl-4 pr-12">
          <p className="font-bold">{open.title}</p>
          <p className="mt-1.5 text-sm leading-relaxed">{open.desc}</p>
          <p className="muted mt-2 text-sm leading-relaxed">
            <strong className="text-ink">Tip:</strong> {open.tip}
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={() => setInfo(null)}
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export function HoldPicker({ value, onChange }: { value: HoldKind[]; onChange: (h: HoldKind[]) => void }) {
  return (
    <InfoTiles
      label="Holds"
      items={HOLDS.map((h) => ({ id: h.id, tile: h.label, title: h.label, desc: h.desc, tip: h.tip }))}
      value={value}
      onChange={onChange}
      icon={(id) => <Hold kind={id} fill={HOLD_SHADES[id][0]} shade={HOLD_SHADES[id][1]} size={44} />}
    />
  );
}

export function StylePicker({ value, onChange }: { value: Style[]; onChange: (s: Style[]) => void }) {
  return (
    <InfoTiles
      label="Style"
      items={STYLES.map((s) => ({ id: s.id, tile: s.short, title: s.label, desc: s.desc, tip: s.tip }))}
      value={value}
      onChange={onChange}
      icon={(id, on) => <StyleIcon style={id} on={on} />}
    />
  );
}

export const colorSwatch = (c: HoldColor) => holdHex(c);
