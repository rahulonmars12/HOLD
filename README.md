# HOLD!

A bouldering log that records every attempt, not only the sends, and turns
the falls into a picture of what to work on. Optional accounts sync the log
between devices, an AI coach reads your log, and buddies at the same gym can
see each other's sessions and share climbs.

Built as an installable web app (PWA). The log lives on the device in
IndexedDB, so logging works with no signal at the gym. Everything below
"Accounts" is optional: with no keys set, HOLD! runs entirely on the phone.

## What it does

**Session.** Start a session at a gym, add each climb (photo and name,
grade slider, hold colour including your own colours, wall angle, holds,
style), then log attempts with two big buttons: Fell and Sent. After a fall,
one more tap records why you came off. Unsent climbs stay open across
sessions.

**Route reading.** Before the first attempt, guess how many attempts it will
take and write your beta. After the send, say whether the read held up.

**Insights.** Grade pyramid, strengths and weaknesses by angle, hold and
style, why you fall, and how good your reads are, for 30 days, 90 days or
all time.

**Accounts and sync.** Create an account in the app with a username and
password; no email is involved. Every change is saved on the phone first and
synced in the background; the newest edit wins. Signing out clears the phone
but keeps everything in your account.

**AI coach.** On a climb: a short read of your attempts and what to try
next, and you can ask it a question. On Insights: what to practise based on
the last 90 days. When adding a climb: take a photo and HOLD! fills in the
colour, angle, holds and style (and the grade if a tag is readable).

**Buddies.** Everyone who joins HOLD! is automatically buddies with
everyone else. See who is climbing right now, their recent sends with beta,
and when you add a climb, pick one a buddy already logged at that gym to see
how everyone got on with it. Share the link from the Buddies tab to invite
people. Only buddies can see your log; remove someone to hide it from them.

**Climbing personas.** After your first session, HOLD! works out which of 12
animals you climb like (Gecko, Monkey, Gorilla, Spider, Octopus, Mountain Goat,
Cat, Tortoise, Honey Badger, Squirrel, Owl, Koala) from the last 90 days:
wall angles, holds, styles, why you fall, attempts per send, flash rate and
how well you read climbs. You get a main persona, a dash of the runner-up,
three facts from your log and a growth tip. A full-screen reveal plays the
first time and whenever it changes; buddies see each other's personas.
The logic is in `lib/persona.ts`, the art in `public/personas/`.

**Achievements.** 27 collectable pins in six groups (Firsts, Persistence,
Habits, Style, Climbing IQ, Crew), each built from the app's hold shapes on a
bronze, silver, gold or holographic coin. Earning one plays a full-screen
unlock where the pieces fly in and snap together. The pin board lives under
Insights. Rules are in `lib/achievements.ts`, the art in `components/Badge.tsx`.

**Animation lab.** Settings, Demo and animations, Open the animation lab:
play any achievement unlock, persona evolution, the send shower, Insights
motion and every sound, without touching the log.

**Sound and motion.** Small synthesised sounds for every tap (special ones
for falls, sends, reasons, sheets, saving and tabs), haptics on Android, and
light springy animations. Settings has a switch; Reduce Motion turns the
movement off.

**Companion and voice.** Your persona sits on Home, Session and each climb
and reacts to what you do: a line after a fall (it changes with the reason you
pick), a nap while you rest, a cheer on a send. Lines live in `lib/voice.ts`.

**Session recap.** Ending a session opens a wrap-up: numbers count up, your
top send, what was worth remembering, new pins, and a teaser if your persona is
about to evolve. Share makes a picture card on the phone (`lib/share.ts`);
pins and personas can be shared the same way.

**Rest timer.** Starts after each fall (Off, 1, 2 or 3 minutes in Settings),
shown as a ring next to the companion; tap it to skip. Chimes when you're rested.

**Quick logging.** "Quick warm-up" on the session screen logs a flash in two
taps. "Same again" on Add a climb copies the tags of your last climb.

**Called it!** Guess your attempts before the first go; when the send lands
inside your guess you get a stamp and a running "reads called" score.

**Weekly mission.** Picked every Monday from your biggest "Work on" gap: try
three climbs with that angle, hold or style. A ring on Home and Session shows
progress. Logic in `lib/mission.ts`.

**Crew.** The Buddies tab has a feed of sends, new pins, persona changes and
finished sessions, each with a cheer. Tap a buddy for their page: persona, pin
board and top sends. While the app is open a small banner tells you when a buddy
cheers you, sends one of your open projects or starts climbing at your gym.
Needs `supabase/migrations/0005_crew.sql`.

**Dark mode.** Settings, Appearance: Match phone, Light or Dark. Colours are
tokens in `app/globals.css`; anything sitting on a pastel, and the full-screen
celebrations, stay light on purpose (`.on-color`, `.light`).

**Demo crew.** Loading the demo data (signed out) also fills the Buddies tab
with four made-up buddies, a feed, cheers, buddy pages and a banner, from
`lib/demo-crew.ts`. Nothing is sent anywhere.

**First run.** A short onboarding: what HOLD! does, making an account (or
skipping to keep the log on the phone), and the first session.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

The service worker (offline support) only registers in production builds.

## Turn on accounts, sync and buddies (Supabase)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste `supabase/migrations/0001_tickmark.sql`, and
   run it. Then do the same with `supabase/migrations/0002_username_accounts.sql`
   `supabase/migrations/0003_everyone_is_buddies.sql`,
   `supabase/migrations/0004_personas.sql` and
   `supabase/migrations/0005_crew.sql`.
   These create the tables, the access rules (you and your accepted buddies
   only) and the `photos` storage bucket.
3. Open **Authentication → Sign In / Providers → Email**. Keep the Email
   provider on, turn **Confirm email** off, and save. Accounts are a username
   and password; behind the scenes each one gets an address on the reserved
   `.invalid` domain, which never receives mail, so nothing is ever emailed.
4. Open **Project Settings → API Keys** and copy the publishable key
   (`sb_publishable_…`), and the Project URL (under **Data API**, or the
   **Connect** button).
5. In Vercel, open the project → **Settings → Environment Variables** and add:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the publishable key |

6. Redeploy (Deployments → ⋯ → Redeploy). These values are built into the
   app, so they only take effect after a new deploy.
7. In HOLD!, open Settings → Account → **New account**.

**Forgotten passwords.** There is no email reset. Signed in, anyone can change
their password in Settings. If a buddy is locked out, set a new one for them in
the Supabase SQL Editor:

```sql
update auth.users
set encrypted_password = crypt('their-new-password', gen_salt('bf'))
where email = 'their_username@hold.invalid';
```

## Turn on the AI coach (Anthropic)

The AI features need an account (above), so usage is tied to a person.

1. Create an API key at [console.anthropic.com](https://console.anthropic.com)
   and add a little credit.
2. In Vercel, add the environment variable `ANTHROPIC_API_KEY` with the key.
   Optional: `TICKMARK_AI_MODEL` to use a different Claude model
   (default `claude-sonnet-5-5`).
3. Redeploy.

Each climber can make 40 AI requests a day. A request typically costs around
a cent. When you use the coach, a summary of the relevant part of your log
(grades, tags, attempts, notes) is sent to Anthropic; a photo is sent when
you use "Fill in tags from photo". The key stays on the server and is never
sent to the phone.

## Deploy to Vercel

The repository is connected to Vercel, which deploys every push to `main`.
Open the deployed URL on your phone and add it to the home screen.

## Data

Backups (Settings → Back up) are JSON files you can restore on any device.
Existing logs from the Tickmark version carry over automatically.
