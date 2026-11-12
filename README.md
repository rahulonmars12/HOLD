# HOLD! (formerly Tickmark)

A bouldering log that records every attempt, not only the sends, and turns
the falls into a picture of what to work on.

Built as an installable web app (PWA). All data stays on the device in
IndexedDB, so it needs no account and no backend, and it keeps working with
no signal at the gym.

## What it does

**Session.** Start a session at a gym, add each climb you get on (grade, hold
colour, wall angle, holds, style), then log attempts with two big buttons:
Fell and Sent. After a fall, one more tap records why you came off: wrong
beta, couldn't hold it, didn't commit, foot slipped, missed the hold, or too
tired. Unsent climbs stay as open projects across sessions.

**Route reading.** Before the first attempt you can guess how many attempts a
climb will take and write down your beta. After the send, you say whether the
read held up and what actually worked.

**Insights.** For the last 30 days, 90 days or all time:

- Grade pyramid: flashes, sends after falls, and unsent climbs per grade.
- Strengths and weaknesses: best send and share sent for each wall angle,
  hold type and style, with the weakest one called out.
- Why you fall: share of falls by reason, compared with the period before,
  with a practice pointer for the most common one.
- Route reading: how often your read held up and whether your attempt
  guesses run optimistic or pessimistic.

**Log.** Every session with its climbs and tallies, and every climb by status
(open, sent, retired).

**Settings.** Save and restore a JSON backup, load demo data to preview
Insights, delete everything.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

The service worker (offline support) only registers in production builds.

## Deploy to Vercel

1. Create an empty repository on GitHub and push this folder to it:

   ```bash
   git remote add origin https://github.com/<you>/tickmark.git
   git push -u origin main
   ```

2. In Vercel, choose Add New, then Project, and import the repository.
   Vercel detects Next.js; no settings or environment variables are needed.
3. Open the deployed URL on your phone and add it to the home screen.

Data is stored per browser and per domain. If you later move to a custom
domain, save a backup first and restore it on the new address.

## How it is put together

```
app/
  page.tsx            Session: start screen and the live session
  new/page.tsx        Add a climb, with the pre-attempt read
  climb/page.tsx      One climb: tally, Fell and Sent, attempt history
  log/page.tsx        Sessions and climbs
  insights/page.tsx   Charts and callouts
  settings/page.tsx   Backup, demo data, reset
  manifest.ts         Web app manifest
components/           Tally marks, climb rows, chips, bottom sheet, nav
lib/
  types.ts            Session, Climb, Attempt
  constants.ts        Grades, tags, fall reasons and their practice pointers
  db.ts               IndexedDB (Dexie) reads and writes, backup and restore
  stats.ts            Pure functions behind every number in Insights
  demo.ts             Deterministic demo data
public/sw.js          Service worker: caches every screen for offline use
```

Three tables: `sessions`, `climbs`, `attempts`. An attempt belongs to one
climb and one session. A climb's status (`project`, `sent`, `retired`) is
kept in step with its attempts in `lib/db.ts`.

`lib/stats.ts` has no dependency on React or the database, so the numbers can
be tested or reused on a server later.

## Next steps

Planned but not built yet:

- Deliberate practice: a technique curriculum with drills, and one focus per
  session chosen from the weakness profile.
- Sync across devices with accounts (for example Supabase), keeping the
  local database as the offline copy.
- Video clips attached to attempts, with fail and send side by side.
- A written session summary and next-session suggestion from an LLM.
