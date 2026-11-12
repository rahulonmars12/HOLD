"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { AngleIcon, holdColorsFor } from "@/components/ClimbForm";
import { CoachCard } from "@/components/Coach";
import { Cta } from "@/components/Cta";
import { CornerHold, Hold } from "@/components/Hold";
import { askCoach, insightsContext } from "@/lib/ai";
import { gradeLabel } from "@/lib/constants";
import { getMeta, setMeta } from "@/lib/db";
import { percent, plural } from "@/lib/format";
import { useData, type Data } from "@/lib/hooks";
import { useCountUp } from "@/lib/useCountUp";
import { Badge } from "@/components/Badge";
import { ACHIEVEMENTS, progressAll } from "@/lib/achievements";
import { PERSONAS, personaImage } from "@/lib/persona";
import { usePersona, usePersonaReveal } from "@/lib/usePersona";
import {
  MIN_SAMPLE,
  biggestGap,
  climbStats,
  failReasons,
  pyramid,
  reading,
  summary,
  tagProfile,
  type Dimension,
  type PyramidRow,
  type Reading,
  type Reasons,
  type TagRow,
  type Window,
} from "@/lib/stats";
import type { Angle, CoachNote, Hold as HoldKind } from "@/lib/types";
import Link from "next/link";

type Range = "30" | "90" | "all";
const RANGES: { id: Range; label: string }[] = [
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "all", label: "All time" },
];
const DAY = 24 * 60 * 60 * 1000;

export default function InsightsPage() {
  const data = useData();
  if (!data) return null;
  if (data.attempts.length === 0) return <Empty />;
  return <InsightsView data={data} />;
}

function Empty() {
  return (
    <main>
      <h1 className="h-page">Insights</h1>
      <div className="card mt-6 px-6 py-7 text-center">
        <div aria-hidden className="relative mx-auto h-40 w-64">
          <Hold kind="volume" fill="#FF9CC2" shade="#F582AD" size={130} rotate={-8} style={{ position: "absolute", left: 10, top: 20 }} />
          <Hold kind="pinch" fill="#5FDDB0" shade="#3FC998" size={84} rotate={18} style={{ position: "absolute", left: 140, top: 0 }} />
          <Hold kind="jug" fill="#FFDD55" shade="#E8BE2A" size={92} style={{ position: "absolute", left: 140, top: 74 }} />
        </div>
        <h2 className="display mt-3 text-[1.375rem] leading-tight">Nothing to show yet</h2>
        <p className="muted mt-2.5 text-[0.9375rem] leading-relaxed">
          Log a couple of sessions and this fills in: your grade pyramid, the holds and angles that hold you back, why
          you fall, and how well you read climbs.
        </p>
        <Cta href="/" bare className="mt-5">
          Start a session
        </Cta>
        <Link href="/settings#demo" className="mt-1 flex min-h-12 items-center justify-center text-[0.9375rem] font-bold underline underline-offset-4">
          Preview with demo data
        </Link>
      </div>
    </main>
  );
}

function SectionTitle({ hold, rotate = 0, children }: { hold: HoldKind; rotate?: number; children: React.ReactNode }) {
  const [fill, shade] = holdColorsFor(hold);
  return (
    <h2 className="h-card flex items-center gap-2.5">
      <Hold kind={hold} fill={fill} shade={shade} size={34} rotate={rotate} />
      {children}
    </h2>
  );
}

function InsightsView({ data }: { data: Data }) {
  const [range, setRange] = useState<Range>("90");
  const [now] = useState(() => Date.now());
  const coach = useLiveQuery(() => getMeta<CoachNote>("insightsCoach"), []);

  const view = useMemo(() => {
    const days = range === "all" ? null : Number(range);
    const w: Window = { since: days ? now - days * DAY : 0, until: Infinity };
    const previous: Window | null = days ? { since: now - 2 * days * DAY, until: now - days * DAY } : null;
    const stats = climbStats(data.climbs, data.attempts);
    const sum = summary(stats, data.sessions, w);
    const profiles = (["holds", "angle", "styles"] as Dimension[]).map((d) => ({ dimension: d, rows: tagProfile(stats, d, w) }));
    return {
      sum,
      pyramid: pyramid(stats, w),
      profiles,
      gap: biggestGap(profiles.flatMap((p) => p.rows), sum.topGrade),
      reasons: failReasons(data.attempts, w),
      previousReasons: previous ? failReasons(data.attempts, previous) : null,
      reading: reading(stats, w),
    };
  }, [data, range, now]);

  const { sum, gap } = view;

  return (
    <main>
      <CornerHold kind="volume" fill="#FF9CC2" shade="#F582AD" rotate={8} size={230} right={-76} top={-80} />
      <h1 className="h-page relative">Insights</h1>
      <div role="group" aria-label="Time range" className="segmented relative mt-4">
        {RANGES.map((r) => (
          <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
            {r.label}
          </button>
        ))}
      </div>

      <PersonaCard data={data} />
      <AchievementsCard data={data} />

      {sum.attempts === 0 ? (
        <p className="muted mt-6">No attempts in this time range. Try a longer one.</p>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2.5">
            <Tile label="Sessions" value={String(sum.sessions)} />
            <Tile label={`Sends, of ${plural(sum.climbs, "climb")}`} value={String(sum.sends)} />
            <Tile label="Flash rate" value={sum.flashRate === null ? "n/a" : percent(sum.flashRate)} />
            <Tile label="Top send" value={sum.topGrade === null ? "None" : gradeLabel(sum.topGrade)} accent />
          </dl>

          {gap && (
            <section className="tile relative mt-3 bg-ink py-5 pl-5 pr-28 text-white">
              <span aria-hidden className="absolute -bottom-5 -right-6">
                {gap.row.dimension === "holds" ? (
                  <Hold
                    kind={gap.row.id as HoldKind}
                    fill={holdColorsFor(gap.row.id as HoldKind)[0]}
                    shade={holdColorsFor(gap.row.id as HoldKind)[1]}
                    size={130}
                    rotate={-8}
                  />
                ) : gap.row.dimension === "angle" ? (
                  <span className="flex h-28 w-28 items-center justify-center rounded-full bg-white">
                    <AngleIcon angle={gap.row.id as Angle} size={72} />
                  </span>
                ) : (
                  <Hold kind="sloper" fill="#FFA45C" shade="#F58F40" size={130} rotate={-8} />
                )}
              </span>
              <h2 className="display relative text-[1.375rem] leading-tight">Work on {gap.row.label.toLowerCase()}</h2>
              <p className="relative mt-2 text-[0.9375rem] leading-relaxed">
                {gap.row.topSent === null
                  ? `None of the ${gap.row.tried} you tried are sent yet.`
                  : `Your best send here is ${gradeLabel(gap.row.topSent)}, ${plural(gap.grades, "grade")} under your ${gradeLabel(gap.overallTop)}.`}{" "}
                {gap.row.sent} of {gap.row.tried} sent.
              </p>
            </section>
          )}

          <div className="mt-3">
            <CoachCard
              note={coach}
              cta="Get a coaching summary"
              intro="A read on the biggest pattern in your climbing, and what to focus on this week."
              request={async (question) => {
                const note = await askCoach("insights", insightsContext(data.climbs, data.attempts, data.sessions), question);
                await setMeta("insightsCoach", note);
              }}
            />
          </div>

          <Pyramid rows={view.pyramid} />

          <section className="card mt-3 pb-5">
            <SectionTitle hold="pinch" rotate={24}>
              Strong and weak
            </SectionTitle>
            <p className="muted mt-1.5 text-sm leading-snug">Best send, and how many you sent of those you tried.</p>
            <StrongWeak profiles={view.profiles} weakest={gap?.row} />
          </section>

          <WhyYouFall reasons={view.reasons} previous={view.previousReasons} />
          <RouteReading reading={view.reading} />
        </>
      )}
    </main>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-[1.625rem] px-[1.125rem] pb-4 pt-3.5 ${accent ? "bg-sun" : "bg-white"}`}>
      <dt className={`text-sm font-semibold ${accent ? "" : "muted"}`}>{label}</dt>
      <dd className="display mt-0.5 text-[2.125rem] leading-tight">
        <CountText value={value} />
      </dd>
    </div>
  );
}

/** Numbers like "12" or "22%" count up when shown; anything else appears as is. */
function CountText({ value }: { value: string }) {
  const match = /^(\d+)(%?)$/.exec(value);
  const shown = useCountUp(match ? Number(match[1]) : 0);
  return <>{match ? `${shown}${match[2]}` : value}</>;
}

function Pyramid({ rows }: { rows: PyramidRow[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  if (rows.length === 0) return null;
  const detail = rows.find((r) => r.grade === selected) ?? rows.reduce((a, b) => (b.flashes + b.sends + b.open > a.flashes + a.sends + a.open ? b : a));

  return (
    <section className="card mt-3">
      <SectionTitle hold="jug" rotate={-8}>
        Grade pyramid
      </SectionTitle>
      <p className="muted mt-1.5 text-sm leading-snug">
        A wide base under your top grade means the top is solid. Tap a row for the numbers.
      </p>
      <ul className="muted mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5 text-sm font-medium">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="mk mk-jug mk-flash" />
          Flashed
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="mk mk-jug mk-sent" />
          Sent after falls
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="mk mk-jug mk-open" />
          Not sent yet
        </li>
        <li>Each hold is one climb.</li>
      </ul>
      <ul className="mt-3.5 flex flex-col gap-1">
        {rows.map((r) => {
          const sent = r.flashes + r.sends;
          const on = r.grade === detail.grade;
          return (
            <li key={r.grade}>
              <button
                type="button"
                aria-pressed={on}
                aria-label={`${gradeLabel(r.grade)}: ${r.flashes} flashed, ${r.sends} sent after falls, ${r.open} not sent yet`}
                onClick={() => setSelected(r.grade)}
                className={`-mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-2 rounded-[0.875rem] px-1.5 py-1 text-left ${on ? "bg-wall" : ""}`}
              >
                <span className="display w-8 flex-none text-sm font-bold">{gradeLabel(r.grade)}</span>
                <span aria-hidden className="flex flex-1 flex-wrap gap-0.5">
                  {[...Array(r.flashes)].map((_, i) => (
                    <span key={`f${i}`} className="mk mk-jug mk-flash" />
                  ))}
                  {[...Array(r.sends)].map((_, i) => (
                    <span key={`s${i}`} className="mk mk-jug mk-sent" />
                  ))}
                  {[...Array(r.open)].map((_, i) => (
                    <span key={`o${i}`} className="mk mk-jug mk-open" />
                  ))}
                </span>
                <span className="muted w-14 flex-none text-right text-sm font-semibold">{sent} sent</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 rounded-2xl bg-wall px-3.5 py-2.5 text-sm" aria-live="polite">
        {gradeLabel(detail.grade)}: {detail.flashes} flashed, {detail.sends} sent after falls, {detail.open} not sent yet.
      </p>
    </section>
  );
}

const DIM_TITLES: Record<Dimension, string> = { holds: "Holds", angle: "Wall angle", styles: "Style" };

function StrongWeak({ profiles, weakest }: { profiles: { dimension: Dimension; rows: TagRow[] }[]; weakest?: TagRow }) {
  const [showStyles, setShowStyles] = useState(false);
  const shown = profiles.filter((p) => p.rows.length > 0 && (p.dimension !== "styles" || showStyles));
  return (
    <>
      {shown.map((p) => (
        <table key={p.dimension} className="mt-4 w-full border-collapse text-[0.9375rem]">
          <caption className="mb-1 text-left text-sm font-bold">{DIM_TITLES[p.dimension]}</caption>
          <thead className="sr-only">
            <tr>
              <th>Kind</th>
              <th>Best send</th>
              <th>Sent of tried</th>
            </tr>
          </thead>
          <tbody>
            {p.rows.map((r) => {
              const flagged = weakest?.dimension === r.dimension && weakest.id === r.id;
              return (
                <tr key={r.id} className={`border-t-[1.5px] border-wall ${r.tried < MIN_SAMPLE ? "opacity-55" : ""}`}>
                  <th scope="row" className="py-2 pr-2 text-left font-semibold">
                    <span className="flex items-center gap-2.5">
                      {p.dimension === "holds" ? (
                        <Hold kind={r.id as HoldKind} fill={holdColorsFor(r.id as HoldKind)[0]} shade={holdColorsFor(r.id as HoldKind)[1]} size={28} bolt={false} />
                      ) : p.dimension === "angle" ? (
                        <AngleIcon angle={r.id as Angle} size={28} />
                      ) : null}
                      {r.label}
                      {flagged && <span className="rounded-full bg-ink px-2 py-0.5 text-[0.6875rem] font-bold text-white">weakest</span>}
                    </span>
                  </th>
                  <td className="display w-10 text-[0.9375rem]">{r.topSent === null ? <span className="muted font-sans text-sm font-normal">none</span> : gradeLabel(r.topSent)}</td>
                  <td className="w-[8.5rem]">
                    <span className="flex items-center gap-3.5">
                      <span className="h-2 flex-1 rounded bg-[#DFF6EE]" role="img" aria-label={`${r.sent} of ${r.tried} sent`}>
                        <span className="bar-cap cap-pinch grow-x block h-2 rounded bg-mint-deep" style={{ width: `${r.sendRate * 100}%` }} />
                      </span>
                      <span className="w-10 text-right text-[0.8125rem] font-bold">
                        {r.sent}
                        <span className="muted">/{r.tried}</span>
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ))}
      {profiles.some((p) => p.dimension === "styles" && p.rows.length > 0) && (
        <button type="button" className="btn btn-soft mt-4 min-h-11 w-full text-[0.9375rem]" onClick={() => setShowStyles(!showStyles)}>
          {showStyles ? "Hide styles" : "Show styles"}
        </button>
      )}
    </>
  );
}

function WhyYouFall({ reasons, previous }: { reasons: Reasons; previous: Reasons | null }) {
  if (reasons.labelled + reasons.unlabelled === 0) return null;
  const top = reasons.rows[0];
  const maxShare = Math.max(top?.share ?? 0, 0.01);
  const before = previous && previous.labelled >= 8 ? new Map(previous.rows.map((r) => [r.id, r.share])) : null;
  const colors: Record<string, string> = { strength: "#FFA45C", beta: "#B6C0FF", foot: "#5FDDB0", fatigue: "#C9D1E8", commit: "#FF9CC2", precision: "#FFDD55" };

  return (
    <section className="card mt-3 pb-5">
      <SectionTitle hold="sloper">Why you fall</SectionTitle>
      {reasons.labelled === 0 ? (
        <p className="muted mt-2 text-[0.9375rem]">
          {plural(reasons.unlabelled, "fall")} logged, none with a reason. Tap a reason after each fall and the pattern
          shows up here.
        </p>
      ) : (
        <>
          <p className="muted mt-1.5 text-sm">
            Share of {plural(reasons.labelled, "fall")} with a reason{before ? ", and the change from the period before" : ""}.
          </p>
          <ul className="mt-3.5 flex flex-col gap-3">
            {reasons.rows.map((r) => {
              const was = before?.get(r.id);
              const change = was === undefined ? null : Math.round((r.share - was) * 100);
              return (
                <li key={r.id}>
                  <span className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                    <span aria-hidden className="h-3.5 w-3.5 rounded-full" style={{ background: colors[r.id] }} />
                    <span className="flex-1">{r.label}</span>
                    <span className="tabular-nums">
                      {percent(r.share)}
                      {change !== null && change !== 0 && (
                        <span className="muted text-[0.8125rem] font-medium">
                          {" "}
                          {change > 0 ? "up" : "down"} {Math.abs(change)}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="mr-2.5 mt-1.5 block h-2.5 rounded-full bg-wall">
                    {r.count > 0 && (
                      <span
                        className="bar-cap cap-sloper grow-x block h-2.5 rounded-full bg-ink"
                        style={{ width: `${Math.max((r.share / maxShare) * 100, 3)}%` }}
                      />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          {top && top.count > 0 && (
            <div className="mt-4 rounded-[1.375rem] bg-coral px-4 pb-4 pt-3.5">
              <p className="font-bold">Most common: {top.label.toLowerCase()}</p>
              <p className="mt-1.5 text-sm leading-relaxed">{top.pointer}</p>
            </div>
          )}
          {reasons.unlabelled > 0 && (
            <p className="muted mt-3 text-sm">{plural(reasons.unlabelled, "more fall")} had no reason given.</p>
          )}
        </>
      )}
    </section>
  );
}

function Segments({ parts }: { parts: { value: number; color: string }[] }) {
  const shown = parts.filter((p) => p.value > 0);
  return (
    <span className="bar-cap cap-pocket mr-3 flex h-3 gap-[3px]">
      {shown.map((p, i) => (
        <span key={i} className="rounded-full" style={{ flex: p.value, background: p.color }} />
      ))}
    </span>
  );
}

function RouteReading({ reading: r }: { reading: Reading }) {
  const verdict = () => {
    if (r.guessed < 5) return null;
    if (r.harder > r.easier * 1.5 && r.harder / r.guessed >= 0.3)
      return "You tend to underestimate climbs. Before guessing, find the crux and ask what you'd do if your first idea fails.";
    if (r.easier > r.harder * 1.5 && r.easier / r.guessed >= 0.3)
      return "You tend to overestimate climbs. You can afford to try harder ones.";
    return "Your guesses miss in both directions about equally.";
  };
  const v = verdict();

  return (
    <section className="card mt-3 pb-5">
      <SectionTitle hold="pocket" rotate={-12}>
        Route reading
      </SectionTitle>
      {r.reviewed === 0 && r.guessed === 0 ? (
        <p className="muted mt-2 text-[0.9375rem] leading-relaxed">
          Guess the number of attempts when you add a climb, then say whether your beta held up after the send. Your
          accuracy shows up here.
        </p>
      ) : (
        <>
          {r.reviewed > 0 && (
            <>
              <div className="mt-3.5 flex items-center gap-3.5">
                <span className="relative flex h-[5.25rem] w-[5.25rem] flex-none items-center justify-center">
                  <svg aria-hidden width="84" height="84" viewBox="0 0 40 40" className="absolute inset-0">
                    <path d="M4 20 C4 10 12 4 21 4 C31 4 37 11 36 21 C35 31 28 36 20 36 C11 36 4 30 4 20 Z" fill="#B79BFF" />
                    <ellipse cx="14" cy="11.5" rx="5" ry="3" fill="#1E1B3A" />
                  </svg>
                  <span className="display relative mt-2.5 text-xl">{percent(r.score ?? 0)}</span>
                </span>
                <p className="text-[0.9375rem] leading-snug">
                  Your beta held up fully or partly on{" "}
                  <strong>
                    {r.counts.yes + r.counts.partly} of {r.reviewed}
                  </strong>{" "}
                  reviewed sends.
                </p>
              </div>
              <div role="img" aria-label={`Beta held: yes ${r.counts.yes}, partly ${r.counts.partly}, no ${r.counts.no}`} className="mt-4">
                <Segments
                  parts={[
                    { value: r.counts.yes, color: "#1E1B3A" },
                    { value: r.counts.partly, color: "#6E7CF0" },
                    { value: r.counts.no, color: "#D9DEEE" },
                  ]}
                />
              </div>
              <ul className="muted mt-2 flex gap-3.5 text-[0.8125rem]">
                <li><span aria-hidden className="mk mk-pocket" style={{ background: "#1E1B3A" }} />Held {r.counts.yes}</li>
                <li><span aria-hidden className="mk mk-pocket" style={{ background: "#6E7CF0" }} />Partly {r.counts.partly}</li>
                <li><span aria-hidden className="mk mk-pocket" style={{ background: "#D9DEEE" }} />Didn&apos;t {r.counts.no}</li>
              </ul>
            </>
          )}
          {r.guessed > 0 && (
            <>
              <h3 className="mb-2 mt-5 text-sm font-bold">
                Attempt guesses: {r.right} of {r.guessed} right
              </h3>
              <div role="img" aria-label={`Took fewer than guessed ${r.easier}, as guessed ${r.right}, took more ${r.harder}`}>
                <Segments
                  parts={[
                    { value: r.easier, color: "#5FDDB0" },
                    { value: r.right, color: "#1E1B3A" },
                    { value: r.harder, color: "#FFA45C" },
                  ]}
                />
              </div>
              <ul className="muted mt-2 flex gap-3.5 text-[0.8125rem]">
                <li><span aria-hidden className="mk mk-pocket" style={{ background: "#5FDDB0" }} />Fewer {r.easier}</li>
                <li><span aria-hidden className="mk mk-pocket" style={{ background: "#1E1B3A" }} />As guessed {r.right}</li>
                <li><span aria-hidden className="mk mk-pocket" style={{ background: "#FFA45C" }} />More {r.harder}</li>
              </ul>
              {v && <p className="mt-3.5 rounded-[1.125rem] bg-wall px-3.5 py-3 text-sm leading-relaxed">{v}</p>}
            </>
          )}
        </>
      )}
    </section>
  );
}

function PersonaCard({ data }: { data: Data }) {
  const result = usePersona(data);
  usePersonaReveal(result);
  if (!result) return null;
  if (!result.ready) {
    return (
      <Link href="/persona" className="relative mt-4 flex items-center gap-3 rounded-[1.75rem] bg-white py-3 pl-3 pr-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={personaImage("gecko")} alt="" width={64} height={64} className="flex-none opacity-40 grayscale" />
        <span className="min-w-0 flex-1">
          <span className="block text-[0.9375rem] font-bold">Your climbing persona</span>
          <span className="muted block text-sm">
            Unlocks after your first session
          </span>
        </span>
      </Link>
    );
  }
  const info = PERSONAS[result.persona.id];
  const dash = PERSONAS[result.persona.dash];
  return (
    <Link href="/persona" className="relative mt-4 block overflow-hidden rounded-[1.875rem] px-4 pb-4 pt-3" style={{ background: info.tint }}>
      <span
        aria-hidden
        className="rays pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full"
        style={{ background: "repeating-conic-gradient(rgb(255 255 255 / 0.5) 0deg 9deg, transparent 9deg 20deg)" }}
      />
      <span className="relative flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={personaImage(info.id)} alt="" width={104} height={104} className="bob -ml-1 flex-none" />
        <span className="min-w-0">
          <span className="block text-[0.8125rem] font-bold">You climb like {info.article}</span>
          <span className="display block text-[1.625rem] leading-tight">{info.name}</span>
          <span className="mt-1.5 inline-flex h-8 items-center gap-1 rounded-full bg-white/85 pl-0.5 pr-3 text-[0.8125rem] font-bold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={personaImage(dash.id)} alt="" width={28} height={28} />
            dash of {dash.name}
          </span>
        </span>
      </span>
      <span className="relative mt-2 block text-[0.9375rem] font-medium leading-relaxed">{info.line}</span>
    </Link>
  );
}

function AchievementsCard({ data }: { data: Data }) {
  const crew = useLiveQuery(async () => (await getMeta<string[]>("crewAch")) ?? [], []);
  const progress = useMemo(() => progressAll(data.sessions, data.climbs, data.attempts, crew ?? []), [data, crew]);
  const earned = ACHIEVEMENTS.filter((a) => progress[a.id]?.earned);
  const next = ACHIEVEMENTS.filter((a) => !progress[a.id]?.earned && progress[a.id]?.need)
    .sort((a, b) => (progress[b.id].have ?? 0) / progress[b.id].need! - (progress[a.id].have ?? 0) / progress[a.id].need!)[0];
  return (
    <Link href="/achievements" className="card relative mt-3 block">
      <span className="flex items-baseline justify-between">
        <span className="h-card">Achievements</span>
        <span className="muted text-sm font-bold">
          {earned.length} of {ACHIEVEMENTS.length}
        </span>
      </span>
      <span className="mt-3 flex items-center gap-1">
        {earned.length === 0 ? (
          <span className="flex gap-1 opacity-70">
            {["first-climb", "first-send", "first-flash"].map((id) => (
              <Badge key={id} id={id} size={58} locked />
            ))}
          </span>
        ) : (
          earned.slice(-5).reverse().map((a) => <Badge key={a.id} id={a.id} size={58} />)
        )}
      </span>
      {next && (
        <span className="muted mt-2 block text-sm">
          Next up: <strong className="text-ink">{next.name}</strong>, {progress[next.id].have} of {progress[next.id].need!.toLocaleString()}
        </span>
      )}
    </Link>
  );
}
