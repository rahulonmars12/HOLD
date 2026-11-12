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
   and `supabase/migrations/0003_everyone_is_buddies.sql`.
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
