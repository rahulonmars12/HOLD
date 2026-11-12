"use client";

import { useCallback, useEffect, useState } from "react";
import { ProfileForm, SignIn, useProfile } from "@/components/Account";
import { GradeChip, describeClimb } from "@/components/ClimbCards";
import { CornerHold, Hold } from "@/components/Hold";
import { dayLabel, duration } from "@/lib/format";
import { useNow } from "@/lib/hooks";
import {
  acceptBuddy,
  climbingNow,
  listBuddies,
  nameOf,
  recentSends,
  removeBuddy,
  requestBuddy,
  type BuddyLink,
  type BuddySend,
  type LiveSession,
} from "@/lib/social";
import { cloudEnabled } from "@/lib/supabase";

export default function BuddiesPage() {
  const { auth, profile, reload } = useProfile();

  return (
    <main>
      <CornerHold kind="pocket" fill="#B79BFF" shade="#A080F5" rotate={-16} size={220} right={-70} top={-74} />
      <h1 className="h-page relative">Buddies</h1>
      <p className="muted relative mt-2 max-w-[16rem] text-[0.9375rem]">
        See who&apos;s climbing, what they sent, and their beta on climbs you share.
      </p>

      {auth === undefined || (auth && profile === undefined) ? null : !auth ? (
        <section className="card mt-6">
          <h2 className="h-card mb-3">Sign in to climb with buddies</h2>
          <SignIn
            intro={
              cloudEnabled
                ? "Your log syncs to your account, and buddies you add can see your sessions and sends. Nobody else can."
                : undefined
            }
          />
        </section>
      ) : !profile?.username ? (
        <section className="card mt-6">
          <h2 className="h-card mb-1">Pick a username</h2>
          <p className="muted mb-4 text-sm">So your buddies can find you.</p>
          <ProfileForm profile={profile ?? null} onSaved={reload} />
        </section>
      ) : (
        <Feed username={profile.username} />
      )}
    </main>
  );
}

function Feed({ username }: { username: string }) {
  const now = useNow();
  const [links, setLinks] = useState<BuddyLink[]>([]);
  const [live, setLive] = useState<LiveSession[]>([]);
  const [sends, setSends] = useState<BuddySend[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState("");
  const [addMsg, setAddMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [l, n, s] = await Promise.all([listBuddies(), climbingNow(), recentSends()]);
      setLinks(l);
      setLive(n);
      setSends(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load buddies.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  const accepted = links.filter((l) => l.status === "accepted");
  const incoming = links.filter((l) => l.status === "pending" && l.incoming);
  const outgoing = links.filter((l) => l.status === "pending" && !l.incoming);

  return (
    <>
      {error && (
        <p role="alert" className="mt-5 rounded-[1.25rem] bg-white px-4 py-3 text-sm font-semibold text-danger">
          {error} {typeof navigator !== "undefined" && !navigator.onLine && "Buddies need a connection."}
        </p>
      )}

      {incoming.length > 0 && (
        <section className="mt-6">
          <h2 className="h-card">Requests</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {incoming.map((l) => (
              <li key={l.other.id} className="flex items-center gap-3 rounded-[1.5rem] bg-white py-3 pl-5 pr-3">
                <span className="min-w-0 flex-1 font-bold">{nameOf(l.other)}</span>
                <button
                  type="button"
                  className="btn btn-ink min-h-11 px-4"
                  onClick={async () => {
                    await acceptBuddy(l.other.id);
                    void load();
                  }}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="btn btn-quiet min-h-11 px-3"
                  onClick={async () => {
                    await removeBuddy(l.other.id);
                    void load();
                  }}
                >
                  Decline
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-mint-deep" />
          <h2 className="h-card">Climbing now</h2>
        </div>
        {live.length === 0 ? (
          <p className="muted mt-2 text-[0.9375rem]">{loaded ? "Nobody's on the wall right now." : "Checking…"}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {live.map((l) => (
              <li key={l.session.id} className="flex items-center gap-3.5 rounded-[1.5rem] bg-white py-3 pl-3 pr-5">
                <Hold kind="jug" fill="#5FDDB0" shade="#3FC998" size={44} rotate={-8} />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{nameOf(l.who)}</span>
                  <span className="muted block truncate text-sm">
                    {l.session.gym}, {duration(now - l.session.startedAt)} in
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-7">
        <h2 className="h-card">Recent sends</h2>
        {sends.length === 0 ? (
          <p className="muted mt-2 text-[0.9375rem]">
            {accepted.length === 0
              ? "Add a buddy to see their sends here."
              : loaded
                ? "No sends from your buddies in the last three weeks."
                : "Checking…"}
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {sends.map((s) => (
              <li key={s.who.id + s.climb.id} className="rounded-[1.5rem] bg-white py-2.5 pl-2.5 pr-4">
                <div className="flex items-center gap-3.5">
                  <GradeChip climb={s.climb} size={52} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-bold">
                      {nameOf(s.who)} sent {s.climb.name || describeClimb(s.climb).split(",")[0].toLowerCase()}
                    </span>
                    <span className="muted block truncate text-[0.8125rem]">
                      {s.climb.gym}, {dayLabel(s.climb.sentAt ?? s.climb.createdAt).toLowerCase()}
                    </span>
                  </span>
                </div>
                {s.climb.whatWorked && (
                  <p className="muted ml-[4.125rem] mt-1 text-sm leading-relaxed">&ldquo;{s.climb.whatWorked}&rdquo;</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-7">
        <h2 className="h-card">Add a buddy</h2>
        <p className="muted mt-1 text-sm">
          Ask for their username. Yours is <strong className="text-ink">@{username}</strong>.
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setAddMsg(null);
            try {
              await requestBuddy(adding);
              setAddMsg({ ok: true, text: `Request sent to @${adding.replace(/^@/, "")}.` });
              setAdding("");
              void load();
            } catch (err) {
              setAddMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't send the request." });
            }
          }}
        >
          <label htmlFor="buddy" className="sr-only">
            Buddy&apos;s username
          </label>
          <input
            id="buddy"
            className="field min-w-0 flex-1"
            placeholder="@username"
            autoCapitalize="none"
            autoCorrect="off"
            value={adding}
            onChange={(e) => setAdding(e.target.value.toLowerCase())}
          />
          <button type="submit" className="btn btn-ink min-h-[3.25rem]" disabled={adding.replace(/^@/, "").length < 3}>
            Add
          </button>
        </form>
        {addMsg && (
          <p role="status" className={`mt-2.5 text-sm font-semibold ${addMsg.ok ? "" : "text-danger"}`}>
            {addMsg.text}
          </p>
        )}
      </section>

      {(accepted.length > 0 || outgoing.length > 0) && (
        <section className="mt-7">
          <h2 className="h-card">Your buddies</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {[...accepted, ...outgoing].map((l) => (
              <li key={l.other.id} className="flex items-center gap-3 rounded-[1.5rem] bg-white py-3 pl-5 pr-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold">{nameOf(l.other)}</span>
                  {l.other.username && <span className="muted block text-sm">@{l.other.username}</span>}
                </span>
                {l.status === "pending" && <span className="muted text-sm font-semibold">Request sent</span>}
                <button
                  type="button"
                  className="btn btn-quiet min-h-11 px-3 text-sm text-danger"
                  onClick={async () => {
                    await removeBuddy(l.other.id);
                    void load();
                  }}
                >
                  {l.status === "pending" ? "Cancel" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
