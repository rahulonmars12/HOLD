"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Chips } from "@/components/Chips";
import { gradeLabel } from "@/lib/constants";
import { percent, plural } from "@/lib/format";
import { useData, type Data } from "@/lib/hooks";
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

type Range = "30" | "90" | "all";
const RANGES: { id: Range; label: string }[] = [
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "all", label: "All time" },
];
const DAY = 24 * 60 * 60 * 1000;

const DIMENSION_TITLES: Record<Dimension, string> = {
  angle: "Wall angle",
  holds: "Holds",
  styles: "Style",
};

export default function InsightsPage() {
  const data = useData();
  // Rendered only once the log has loaded, which also keeps the clock read
  // inside InsightsView out of the static shell.
  if (!data) return null;
  return <InsightsView data={data} />;
}

function InsightsView({ data }: { data: Data }) {
  const [range, setRange] = useState<Range>("90");
  // Fixed when the screen opens so the charts do not shift while reading.
  const [now] = useState(() => Date.now());

  const view = useMemo(() => {
    const days = range === "all" ? null : Number(range);
    const w: Window = {
      since: days ? now - days * DAY : 0,
      until: Infinity,
    };
    const previous: Window | null = days
      ? { since: now - 2 * days * DAY, until: now - days * DAY }
      : null;
    const stats = climbStats(data.climbs, data.attempts);
    const sum = summary(stats, data.sessions, w);
    const profiles = (["angle", "holds", "styles"] as Dimension[]).map((d) => ({
      dimension: d,
      rows: tagProfile(stats, d, w),
    }));
    return {
      sum,
      pyramid: pyramid(stats, w),
      profiles,
      gap: biggestGap(
        profiles.flatMap((p) => p.rows),
        sum.topGrade,
      ),
      reasons: failReasons(data.attempts, w),
      previousReasons: previous ? failReasons(data.attempts, previous) : null,
      reading: reading(stats, w),
    };
  }, [data, range, now]);

  const { sum } = view;

  return (
    <main>
      <h1 className="h-page">Insights</h1>
      <div className="mt-4">
        <Chips
          label="Time range"
          options={RANGES}
          value={[range]}
          onChange={(v) => v[0] && setRange(v[0])}
        />
      </div>

      {sum.attempts === 0 ? (
        <div className="mt-6">
          <p className="muted">
            {data.attempts.length === 0
              ? "Nothing to show yet. Log a session and your grade pyramid, weak styles and fall reasons appear here."
              : "No attempts in this time range. Try a longer one."}
          </p>
          {data.attempts.length === 0 && (
            <Link href="/settings" className="btn mt-4">
              Preview with demo data
            </Link>
          )}
        </div>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-2 gap-2">
            <Tile label="Sessions" value={String(sum.sessions)} />
            <Tile
              label="Sends"
              value={String(sum.sends)}
              note={`from ${plural(sum.climbs, "climb")}`}
            />
            <Tile
              label="Flash rate"
              value={sum.flashRate === null ? "n/a" : percent(sum.flashRate)}
              note={`${plural(sum.flashes, "flash", "flashes")}`}
            />
            <Tile
              label="Top send"
              value={sum.topGrade === null ? "None yet" : gradeLabel(sum.topGrade)}
            />
          </dl>

          {view.gap && (
            <section className="mt-6 rounded-2xl bg-tape p-4 text-tape-ink">
              <h2 className="h-section">
                Work on {view.gap.row.label.toLowerCase()}
              </h2>
              <p className="mt-1.5">
                {view.gap.row.topSent === null
                  ? `You have not sent any of the ${view.gap.row.tried} you tried.`
                  : `Your best send here is ${gradeLabel(view.gap.row.topSent)}, ${plural(view.gap.grades, "grade")} below your ${gradeLabel(view.gap.overallTop)}.`}{" "}
                {view.gap.row.sent} of {view.gap.row.tried} sent
                {view.gap.row.attemptsPerSend !== null &&
                  `, ${view.gap.row.attemptsPerSend.toFixed(1)} attempts per send`}
                . Picking these on purpose is the quickest way to raise your
                floor.
              </p>
            </section>
          )}

          <Pyramid rows={view.pyramid} />

          <section className="mt-9">
            <h2 className="h-section">Where you are strong and weak</h2>
            <p className="muted mt-1 text-sm">
              Best send and share of climbs sent, for each kind of climb you
              tagged.
            </p>
            {view.profiles.map(
              (p) =>
                p.rows.length > 0 && (
                  <Profile
                    key={p.dimension}
                    title={DIMENSION_TITLES[p.dimension]}
                    rows={p.rows}
                    weakest={view.gap?.row}
                  />
                ),
            )}
          </section>

          <WhyYouFall reasons={view.reasons} previous={view.previousReasons} />
          <RouteReading reading={view.reading} />
        </>
      )}
    </main>
  );
}

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="panel">
      <dt className="muted text-sm">{label}</dt>
      <dd className="mt-0.5 text-3xl font-semibold">{value}</dd>
      {note && <dd className="muted text-sm">{note}</dd>}
    </div>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-sm"
            style={{ background: i.color }}
          />
          <span className="muted">{i.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Stacked horizontal segments with a 2px surface gap between them. */
function Segments({
  parts,
  scale,
  height,
}: {
  parts: { value: number; color: string }[];
  /** The value that fills the full width. */
  scale: number;
  height: number;
}) {
  const shown = parts.filter((p) => p.value > 0);
  return (
    <span className="flex gap-0.5" style={{ height }}>
      {shown.map((p, i) => (
        <span
          key={i}
          style={{
            width: `${(p.value / scale) * 100}%`,
            minWidth: 4,
            background: p.color,
            borderRadius:
              i === shown.length - 1 ? "0 4px 4px 0" : undefined,
          }}
        />
      ))}
    </span>
  );
}

function Pyramid({ rows }: { rows: PyramidRow[] }) {
  const [selected, setSelected] = useState<number | null>(null);
  if (rows.length === 0) return null;
  const scale = Math.max(...rows.map((r) => r.flashes + r.sends + r.open), 1);
  const detail = rows.find((r) => r.grade === selected);

  return (
    <section className="mt-9">
      <h2 className="h-section">Grade pyramid</h2>
      <p className="muted mt-1 text-sm">
        Climbs at each grade. A wide base under your top grade means the top is
        solid. Tap a row for the numbers.
      </p>
      <Legend
        items={[
          { color: "var(--color-viz-amber)", label: "Flashed" },
          { color: "var(--color-viz-blue)", label: "Sent after falls" },
          { color: "var(--color-viz-neutral)", label: "Not sent yet" },
        ]}
      />
      <ul className="mt-3">
        {rows.map((r) => {
          const sent = r.flashes + r.sends;
          const isSelected = r.grade === selected;
          return (
            <li key={r.grade}>
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={`${gradeLabel(r.grade)}: ${r.flashes} flashed, ${r.sends} sent after falls, ${r.open} not sent yet`}
                onClick={() => setSelected(isSelected ? null : r.grade)}
                className={`flex min-h-9 w-full items-center gap-3 rounded-lg px-1 ${
                  isSelected ? "bg-mat-2" : ""
                }`}
              >
                <span className="grade w-9 text-left text-2xl">
                  {gradeLabel(r.grade)}
                </span>
                <span className="flex flex-1 items-center gap-2">
                  <span className="block flex-1">
                    <Segments
                      height={18}
                      scale={scale * 1.18}
                      parts={[
                        { value: r.flashes, color: "var(--color-viz-amber)" },
                        { value: r.sends, color: "var(--color-viz-blue)" },
                        { value: r.open, color: "var(--color-viz-neutral)" },
                      ]}
                    />
                  </span>
                </span>
                <span className="w-16 text-right text-sm tabular-nums">
                  {sent} <span className="muted">sent</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="muted mt-2 min-h-6 text-sm" aria-live="polite">
        {detail &&
          `${gradeLabel(detail.grade)}: ${detail.flashes} flashed, ${detail.sends} sent after falls, ${detail.open} not sent yet.`}
      </p>
    </section>
  );
}

function Profile({
  title,
  rows,
  weakest,
}: {
  title: string;
  rows: TagRow[];
  weakest?: TagRow;
}) {
  return (
    <table className="mt-5 w-full border-collapse text-left">
      <caption className="mb-1 text-left font-medium">{title}</caption>
      <thead className="sr-only">
        <tr>
          <th>Kind</th>
          <th>Best send</th>
          <th>Share sent</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const thin = r.tried < MIN_SAMPLE;
          const flagged =
            weakest?.dimension === r.dimension && weakest.id === r.id;
          return (
            <tr
              key={r.id}
              className={`border-t border-mat-3 ${thin ? "opacity-55" : ""}`}
            >
              <th scope="row" className="py-2.5 pr-2 font-normal">
                {r.label}
                {flagged && (
                  <span className="ml-2 rounded bg-tape px-1.5 py-0.5 text-xs font-semibold text-tape-ink">
                    weakest
                  </span>
                )}
              </th>
              <td className="grade w-12 py-2.5 text-2xl">
                {r.topSent === null ? (
                  <span className="muted font-sans text-sm font-normal">none</span>
                ) : (
                  gradeLabel(r.topSent)
                )}
              </td>
              <td className="w-[42%] py-2.5 pl-2">
                <span className="flex items-center gap-2">
                  <span
                    className="block h-2 flex-1 overflow-hidden rounded-full bg-mat-3"
                    role="img"
                    aria-label={`${percent(r.sendRate)} sent`}
                  >
                    <span
                      className="block h-full rounded-full bg-viz-blue"
                      style={{ width: `${r.sendRate * 100}%` }}
                    />
                  </span>
                  <span className="w-12 text-right text-sm tabular-nums">
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
  );
}

function WhyYouFall({
  reasons,
  previous,
}: {
  reasons: Reasons;
  previous: Reasons | null;
}) {
  if (reasons.labelled + reasons.unlabelled === 0) return null;
  const top = reasons.rows[0];
  const maxShare = Math.max(top?.share ?? 0, 0.01);
  // Only compare against the previous period when it has enough falls to mean something.
  const before =
    previous && previous.labelled >= 8
      ? new Map(previous.rows.map((r) => [r.id, r.share]))
      : null;

  return (
    <section className="mt-9">
      <h2 className="h-section">Why you fall</h2>
      {reasons.labelled === 0 ? (
        <p className="muted mt-1">
          {plural(reasons.unlabelled, "fall")} logged, none with a reason. Tap a
          reason after each fall and the pattern shows up here.
        </p>
      ) : (
        <>
          <p className="muted mt-1 text-sm">
            Share of {plural(reasons.labelled, "fall")} with a reason
            {before ? ", and the change from the period before" : ""}.
          </p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {reasons.rows.map((r) => {
              const was = before?.get(r.id);
              const change =
                was === undefined ? null : Math.round((r.share - was) * 100);
              return (
                <li key={r.id}>
                  <span className="flex items-baseline justify-between gap-3">
                    <span>{r.label}</span>
                    <span className="text-sm tabular-nums">
                      {percent(r.share)}
                      <span className="muted">
                        {" "}
                        ({r.count})
                        {change !== null && change !== 0 &&
                          `, ${change > 0 ? "up" : "down"} ${Math.abs(change)} pts`}
                      </span>
                    </span>
                  </span>
                  <span className="mt-1 block h-3">
                    <span
                      className="block h-full bg-viz-blue"
                      style={{
                        width: `${Math.max((r.share / maxShare) * 100, r.count ? 1.5 : 0)}%`,
                        borderRadius: "0 4px 4px 0",
                      }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
          {top && top.count > 0 && (
            <div className="panel mt-4">
              <p className="font-medium">Most common: {top.label.toLowerCase()}</p>
              <p className="muted mt-1">{top.pointer}</p>
            </div>
          )}
          {reasons.unlabelled > 0 && (
            <p className="muted mt-3 text-sm">
              {plural(reasons.unlabelled, "more fall")} had no reason given.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function RouteReading({ reading: r }: { reading: Reading }) {
  const guessVerdict = () => {
    if (r.guessed < 5) return null;
    if (r.harder > r.easier * 1.5 && r.harder / r.guessed >= 0.3)
      return "You tend to underestimate climbs. Before guessing, find the crux and ask what happens if your first idea for it fails.";
    if (r.easier > r.harder * 1.5 && r.easier / r.guessed >= 0.3)
      return "You tend to overestimate climbs. You can afford to try harder ones.";
    return "Your guesses miss in both directions about equally.";
  };
  const verdict = guessVerdict();

  return (
    <section className="mt-9">
      <h2 className="h-section">Route reading</h2>
      {r.reviewed === 0 && r.guessed === 0 ? (
        <p className="muted mt-1">
          Guess the number of attempts when you add a climb, then say whether
          your read held up after the send. Your accuracy is tracked here.
        </p>
      ) : (
        <>
          {r.reviewed > 0 && (
            <div className="mt-3">
              <p>
                <span className="text-3xl font-semibold">
                  {percent(r.score ?? 0)}
                </span>{" "}
                <span className="muted">
                  read score across {plural(r.reviewed, "reviewed send")}
                </span>
              </p>
              <div
                className="mt-2"
                role="img"
                aria-label={`Read held up: yes ${r.counts.yes}, partly ${r.counts.partly}, no ${r.counts.no}`}
              >
                <Segments
                  height={10}
                  scale={r.reviewed}
                  parts={[
                    { value: r.counts.yes, color: "var(--color-viz-blue-light)" },
                    { value: r.counts.partly, color: "var(--color-viz-blue-deep)" },
                    { value: r.counts.no, color: "var(--color-viz-neutral)" },
                  ]}
                />
              </div>
              <Legend
                items={[
                  { color: "var(--color-viz-blue-light)", label: `Held up, ${r.counts.yes}` },
                  { color: "var(--color-viz-blue-deep)", label: `Partly, ${r.counts.partly}` },
                  { color: "var(--color-viz-neutral)", label: `Did not, ${r.counts.no}` },
                ]}
              />
            </div>
          )}
          {r.guessed > 0 && (
            <div className="mt-6">
              <p>
                <span className="text-3xl font-semibold">
                  {r.right} of {r.guessed}
                </span>{" "}
                <span className="muted">attempt guesses were right</span>
              </p>
              <div
                className="mt-2"
                role="img"
                aria-label={`Attempt guesses: ${r.easier} took fewer, ${r.right} as guessed, ${r.harder} took more`}
              >
                <Segments
                  height={10}
                  scale={r.guessed}
                  parts={[
                    { value: r.easier, color: "var(--color-viz-blue)" },
                    { value: r.right, color: "var(--color-viz-neutral)" },
                    { value: r.harder, color: "var(--color-viz-orange)" },
                  ]}
                />
              </div>
              <Legend
                items={[
                  { color: "var(--color-viz-blue)", label: `Took fewer, ${r.easier}` },
                  { color: "var(--color-viz-neutral)", label: `As guessed, ${r.right}` },
                  { color: "var(--color-viz-orange)", label: `Took more, ${r.harder}` },
                ]}
              />
              {verdict && <p className="muted mt-3">{verdict}</p>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
