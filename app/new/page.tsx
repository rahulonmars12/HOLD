"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Chips } from "@/components/Chips";
import {
  ANGLES,
  GRADES,
  GUESSES,
  HOLDS,
  HOLD_COLORS,
  STYLES,
  gradeLabel,
} from "@/lib/constants";
import { addClimb } from "@/lib/db";
import { useData } from "@/lib/hooks";
import type { Angle, AttemptGuess, Hold, HoldColor, Style } from "@/lib/types";

const blank = {
  grade: null as number | null,
  color: null as HoldColor | null,
  angle: [] as Angle[],
  holds: [] as Hold[],
  styles: [] as Style[],
  name: "",
  guess: [] as AttemptGuess[],
  plan: "",
};

export default function NewClimbPage() {
  const data = useData();
  const router = useRouter();
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  if (!data) return null;

  if (!data.active) {
    return (
      <main className="pb-10">
        <h1 className="h-page">Start a session first</h1>
        <p className="muted mt-3">
          Climbs are added during a session so every attempt has a date and a
          gym.
        </p>
        <Link href="/" className="btn btn-tape mt-5">
          Go to Session
        </Link>
      </main>
    );
  }

  const gym = data.active.gym;
  const missing = [
    form.grade === null && "a grade",
    form.color === null && "a hold colour",
    form.angle.length === 0 && "a wall angle",
  ].filter(Boolean) as string[];

  const save = async () => {
    if (missing.length || saving) return;
    setSaving(true);
    const climb = await addClimb({
      gym,
      grade: form.grade!,
      color: form.color!,
      angle: form.angle[0],
      holds: form.holds,
      styles: form.styles,
      name: form.name,
      guess: form.guess[0],
      plan: form.plan,
    });
    // This screen stays mounted after navigation, so clear it for next time.
    setForm(blank);
    setSaving(false);
    router.replace(`/climb?id=${climb.id}`);
  };

  return (
    <main className="pb-36">
      <Link href="/" className="muted inline-flex min-h-11 items-center text-sm">
        Back to session
      </Link>
      <h1 className="h-page mt-1">Add a climb</h1>

      <Section title="Grade">
        <div role="group" aria-label="Grade" className="grid grid-cols-5 gap-2">
          {GRADES.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={form.grade === g}
              onClick={() => set("grade", g)}
              className={`grade flex min-h-14 items-center justify-center rounded-xl text-2xl ${
                form.grade === g
                  ? "bg-chalk text-mat"
                  : "bg-mat-2 text-chalk shadow-[inset_0_0_0_1.5px_var(--color-mat-3)]"
              }`}
            >
              {gradeLabel(g)}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Hold colour">
        <div role="group" aria-label="Hold colour" className="flex flex-wrap gap-2.5">
          {HOLD_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={c.label}
              aria-pressed={form.color === c.id}
              onClick={() => set("color", c.id)}
              className="size-11 rounded-full"
              style={{
                background: c.hex,
                boxShadow:
                  form.color === c.id
                    ? "0 0 0 3px var(--color-mat), 0 0 0 6px var(--color-chalk)"
                    : "inset 0 0 0 1.5px var(--color-mat-4)",
              }}
            />
          ))}
        </div>
      </Section>

      <Section title="Wall angle">
        <Chips
          label="Wall angle"
          options={ANGLES}
          value={form.angle}
          onChange={(v) => set("angle", v)}
        />
      </Section>

      <Section title="Holds" hint="Pick the ones that define it.">
        <Chips
          label="Holds"
          options={HOLDS}
          value={form.holds}
          onChange={(v) => set("holds", v)}
          multi
        />
      </Section>

      <Section title="Style">
        <Chips
          label="Style"
          options={STYLES}
          value={form.styles}
          onChange={(v) => set("styles", v)}
          multi
        />
      </Section>

      <Section title="Name" hint="Optional. Helps you find it again.">
        <input
          className="field"
          aria-label="Name"
          placeholder="Corner arete by the cave"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </Section>

      <div className="mt-10 rounded-2xl border border-dashed border-mat-4 p-4">
        <h2 className="h-section">Read it before you pull on</h2>
        <p className="muted mt-1 text-sm">
          Guess now, check later. Insights tracks how often your read is right.
        </p>
        <p className="mt-4 mb-2 font-medium">How many attempts will it take?</p>
        <Chips
          label="Attempt guess"
          options={GUESSES}
          value={form.guess}
          onChange={(v) => set("guess", v)}
        />
        <label htmlFor="plan" className="mt-4 mb-2 block font-medium">
          Your beta
        </label>
        <textarea
          id="plan"
          className="field"
          rows={3}
          placeholder="Left heel on the start jug, cross to the sloper, crux is the last move"
          value={form.plan}
          onChange={(e) => set("plan", e.target.value)}
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-mat-3 bg-mat/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {missing.length > 0 && (
            <p className="muted mb-2 text-center text-sm">
              Still needs {missing.join(", ")}.
            </p>
          )}
          <button
            type="button"
            className="btn btn-tape min-h-14 w-full text-lg"
            disabled={missing.length > 0 || saving}
            onClick={save}
          >
            Save and start climbing
          </button>
        </div>
      </div>
    </main>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-7">
      <h2 className="font-medium">{title}</h2>
      {hint && <p className="muted text-sm">{hint}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}
