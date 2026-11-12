"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { GradeChip, describeClimb } from "@/components/ClimbCards";
import { AnglePicker, ColorPicker, GradeSlider, HoldPicker, StylePicker } from "@/components/ClimbForm";
import { Cta } from "@/components/Cta";
import { CornerHold, Hold } from "@/components/Hold";
import { GUESSES } from "@/lib/constants";
import { shrinkPhoto, tagsFromPhoto } from "@/lib/ai";
import { addClimb, newId, savePhoto, updateClimb } from "@/lib/db";
import { useCustomColors, useData } from "@/lib/hooks";
import { createProblem, gymProblems, type Problem } from "@/lib/social";
import { useAuth } from "@/lib/supabase";
import type { Angle, AttemptGuess, Hold as HoldKind, HoldColor, Style } from "@/lib/types";

const blank = {
  grade: 4,
  color: null as HoldColor | null,
  angle: null as Angle | null,
  holds: [] as HoldKind[],
  styles: [] as Style[],
  name: "",
  guess: null as AttemptGuess | null,
  plan: "",
  problemId: null as string | null,
};

export default function NewClimbPage() {
  const data = useData();
  const auth = useAuth();
  const router = useRouter();
  const custom = useCustomColors();
  const [form, setForm] = useState(blank);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [reading, setReading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const set = <K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const gym = data?.active?.gym;

  // Problems already logged at this gym by you or your buddies.
  useEffect(() => {
    if (!auth || !gym) return;
    let alive = true;
    gymProblems(gym)
      .then((p) => {
        if (!alive || !data) return;
        // Hide problems this climber already has an open climb for.
        const mine = new Set(data.climbs.map((c) => c.problemId).filter(Boolean));
        setProblems(p.filter((x) => !mine.has(x.id)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, gym]);

  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
  }, [photoUrl]);

  if (!data) return null;

  if (!data.active) {
    return (
      <main className="pb-10">
        <h1 className="h-page">Start a session first</h1>
        <p className="muted mt-3">Climbs are added during a session so every attempt has a date and a gym.</p>
        <Cta href="/" className="mt-5">
          Go to Session
        </Cta>
      </main>
    );
  }

  const missing = [form.color === null && "a hold colour", form.angle === null && "a wall angle"].filter(
    Boolean,
  ) as string[];

  const pickPhoto = async (file: File) => {
    setAiNote(null);
    try {
      setPhoto(await shrinkPhoto(file));
    } catch {
      setAiNote("Couldn't open that photo.");
    }
  };

  const fillFromPhoto = async () => {
    if (!photo) return;
    setReading(true);
    setAiNote(null);
    try {
      const t = await tagsFromPhoto(photo);
      setForm((f) => ({
        ...f,
        color: t.color ?? f.color,
        angle: t.angle,
        holds: t.holds.length ? t.holds : f.holds,
        styles: t.styles.length ? t.styles : f.styles,
        grade: t.grade ?? f.grade,
      }));
      setAiNote(t.beta ? `Filled in from your photo. ${t.beta}` : "Filled in from your photo. Check the tags.");
    } catch (e) {
      setAiNote(e instanceof Error ? e.message : "Couldn't read the photo.");
    } finally {
      setReading(false);
    }
  };

  const pickProblem = (p: Problem) => {
    setForm((f) => ({
      ...f,
      grade: p.grade,
      color: p.color,
      angle: p.angle,
      holds: p.holds,
      styles: p.styles,
      name: p.name ?? "",
      problemId: f.problemId === p.id ? null : p.id,
    }));
  };

  const save = async () => {
    if (missing.length || saving) return;
    setSaving(true);
    const climb = await addClimb({
      gym: data.active!.gym,
      grade: form.grade,
      color: form.color!,
      angle: form.angle!,
      holds: form.holds,
      styles: form.styles,
      name: form.name,
      guess: form.guess ?? undefined,
      plan: form.plan,
      problemId: form.problemId ?? undefined,
    });
    if (photo) await savePhoto(climb.id, photo);
    if (auth && !form.problemId) {
      // Share it as a gym problem so buddies can log the same climb. Needs signal; skipped offline.
      const problemId = newId();
      createProblem(climb, problemId)
        .then(() => updateClimb(climb.id, { problemId }))
        .catch(() => {});
    }
    setForm(blank);
    setPhoto(null);
    setSaving(false);
    router.replace(`/climb?id=${climb.id}`);
  };

  return (
    <main className="pb-36">
      <CornerHold kind="sloper" fill="#FFA45C" shade="#F58F40" rotate={-14} size={220} right={-60} top={-58} />
      <Link href="/" aria-label="Back to session" className="relative flex h-[2.875rem] w-[2.875rem] items-center justify-center rounded-full bg-white">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1E1B3A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 4l-6 6 6 6" />
        </svg>
      </Link>
      <h1 className="display relative mt-4 text-[1.875rem] leading-tight">Add a climb</h1>

      <section className="card relative mt-5 flex gap-3.5">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="relative flex h-[6.5rem] w-[6.5rem] flex-none flex-col items-center justify-center gap-1.5 overflow-hidden rounded-[1.5rem] bg-wall text-[0.8125rem] font-bold shadow-[inset_0_0_0_2px_#C9D1E8]"
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Climb photo" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E1B3A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              Add photo
            </>
          )}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label="Climb photo"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void pickPhoto(file);
            e.target.value = "";
          }}
        />
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <label htmlFor="name" className="label">
            Name
          </label>
          <input
            id="name"
            className="field mt-2 min-h-[3.125rem]"
            placeholder="Corner arete by the cave"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <p className="muted mt-1.5 pl-1 text-[0.8125rem]">Both optional.</p>
        </div>
      </section>

      {photo && auth && (
        <button
          type="button"
          className="btn btn-ink mt-2.5 w-full"
          disabled={reading}
          onClick={fillFromPhoto}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFDD55" aria-hidden>
            <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" />
          </svg>
          {reading ? "Reading the photo…" : "Fill in tags from photo"}
        </button>
      )}
      {aiNote && (
        <p role="status" className="mt-2.5 rounded-[1.25rem] bg-white px-4 py-3 text-sm leading-relaxed">
          {aiNote}
        </p>
      )}

      {problems.length > 0 && (
        <section className="mt-3 rounded-[1.75rem] bg-white py-4">
          <h2 className="px-5 text-[0.9375rem] font-bold">Already on the wall</h2>
          <p className="muted px-5 text-sm">Logged here by you or your buddies. Pick one to compare results.</p>
          <ul className="mt-3 flex gap-2.5 overflow-x-auto px-5 pb-1">
            {problems.map((p) => {
              const on = form.problemId === p.id;
              return (
                <li key={p.id} className="flex-none">
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => pickProblem(p)}
                    className={`flex w-32 flex-col items-start gap-2 rounded-[1.375rem] p-2.5 text-left ${
                      on ? "bg-ink text-white" : "bg-wall"
                    }`}
                  >
                    <GradeChip climb={p} size={44} />
                    <span className="line-clamp-2 text-[0.8125rem] font-semibold leading-tight">
                      {p.name || describeClimb(p)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card mt-3">
        <h2 className="label">Grade</h2>
        <div className="mt-1.5">
          <GradeSlider value={form.grade} onChange={(g) => set("grade", g)} />
        </div>
      </section>

      <section className="card mt-3">
        <h2 className="label mb-3">Hold colour</h2>
        <ColorPicker value={form.color} onChange={(c) => set("color", c)} custom={custom} />
        <h2 className="label mb-3 mt-6">Wall angle</h2>
        <AnglePicker value={form.angle} onChange={(a) => set("angle", a)} />
      </section>

      <section className="card mt-3">
        <h2 className="label">Holds</h2>
        <p className="muted mb-3 pl-1 text-sm">Pick the ones that define it. Tap i to learn one.</p>
        <HoldPicker value={form.holds} onChange={(h) => set("holds", h)} />
        <h2 className="label mt-6">Style</h2>
        <p className="muted mb-3 pl-1 text-sm">How the climb moves.</p>
        <StylePicker value={form.styles} onChange={(s) => set("styles", s)} />
      </section>

      <section className="tile relative mt-3 bg-sun p-4 pt-5">
        <Hold
          kind="jug"
          fill="#F5C92E"
          shade="#C9A21E"
          size={120}
          rotate={18}
          style={{ position: "absolute", right: -26, top: -30 }}
        />
        <h2 className="display relative pl-1 text-[1.1875rem] leading-tight">
          Read it before
          <br />
          you pull on
        </h2>
        <p className="relative mr-16 mt-1.5 pl-1 text-sm font-medium">
          Guess now, check after the send. Insights tracks how often your read is right.
        </p>
        <p className="relative mb-2.5 mt-4 pl-1 text-[0.9375rem] font-bold">How many attempts will it take?</p>
        <div role="group" aria-label="Attempt guess" className="relative grid grid-cols-4 gap-1.5">
          {GUESSES.map((g) => (
            <button
              key={g.id}
              type="button"
              className="chip chip-white px-2"
              aria-pressed={form.guess === g.id}
              onClick={() => set("guess", form.guess === g.id ? null : g.id)}
            >
              {g.label}
            </button>
          ))}
        </div>
        <label htmlFor="plan" className="relative mb-2.5 mt-4 block pl-1 text-[0.9375rem] font-bold">
          Your beta
        </label>
        <textarea
          id="plan"
          className="field field-white relative"
          rows={3}
          placeholder="Left heel on the start jug, cross to the pinch, crux is the last move"
          value={form.plan}
          onChange={(e) => set("plan", e.target.value)}
        />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 bg-gradient-to-b from-wall/0 via-wall to-wall">
        <div className="mx-auto max-w-md px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-5">
          {missing.length > 0 && (
            <p className="muted mb-2 text-center text-sm font-semibold">Still needs {missing.join(" and ")}.</p>
          )}
          <Cta onClick={save} disabled={missing.length > 0 || saving}>
            Save and start climbing
          </Cta>
        </div>
      </div>
    </main>
  );
}

