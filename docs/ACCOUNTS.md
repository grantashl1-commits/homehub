# Family accounts

Home Hub has sign-in now. A grown-up signs in, and the family's hub data
(people, notes, habits, reflections, jars, the shopping list on the hub,
settings and the parent PIN) is saved to their **family account** and shared
by every screen and phone signed in to it.

It's built for many families from the start, but today there's one: the
Carlsons. The Carlsons' calendar, Notion and slideshow keep coming from the
Vercel env vars. Every other family pastes their own in the app.

## How it fits together

```
 Screen / phone ──sign in──▶ Home Hub Supabase (wpbvrjogeannuqshghnb)
      │                        households, household_members, invites
      │                        hub_state      ← the family's hub data (JSON), realtime
      │                        household_secrets ← encrypted, server-only
      │
      ├──Bearer token──▶ /api/calendar, /api/notion, /api/slideshow, /api/snap
      │                    works out the family from the token, then reads
      │                    that family's links (or, for the home family, Vercel env)
      │
      ├──own sign-in──▶ SIGNAL (shopping list, meal plan)   the family's own SIGNAL account
      └──own sign-in──▶ PointPals (kids, jobs, jars)        the family's own PointPals account
```

| Piece | Where it lives | Per family? |
|---|---|---|
| Sign-in | Supabase Auth in the hub project (email + password) | Each grown-up has their own login |
| Family membership | `households`, `household_members` (owner or grown-up) | Yes |
| Hub data | `hub_state.data`, one JSON document per family, synced both ways | Yes |
| Calendar links, Notion token, slideshow folder | `household_secrets`, AES-256-GCM with `HUB_SECRETS_KEY`. RLS on with no policies, so no browser can read it | Yes |
| SIGNAL, PointPals | Those apps' own Supabase. Each screen signs in with the family's own account | Yes, already multi-family |
| Google service account (slideshow), Anthropic key (Snap) | Vercel env | Shared by the hub. Snap is home-family only unless `SNAP_FOR_ALL_FAMILIES=true` |
| Voice notes, doodles, slideshow photos added on a screen | IndexedDB on that screen | Not synced yet |

Kids don't have logins. They stay inside the family's hub data like before.
The parent PIN is part of the family's data, so it's the same on every screen.

**Sync rules.** Each screen saves its changes about a second after they
happen, and hears other screens' saves straight away (Supabase realtime), plus
when it wakes up or comes back online. Offline changes stay on the screen and
save when it reconnects. If two screens change things in the same second, the
last save wins. That's fine for a kitchen, but see "Next steps".

**Older screens** that were set up with the shared `HUB_ACCESS_KEY` keep
working, as the home family. Once a screen is signed in it doesn't need the key.

## Part 1: switching the Carlsons over (once)

1. **Make the tables.** In the Supabase dashboard for the hub project
   (`wpbvrjogeannuqshghnb`) open **SQL Editor**, paste all of
   [`supabase/migrations/20261123000000_family_accounts.sql`](../supabase/migrations/20261123000000_family_accounts.sql)
   and run it. (Or, with the Supabase CLI linked: `supabase db push`.) Then
   check **Advisors → Security** shows nothing new.
2. **Auth settings.** Authentication → URL Configuration: set **Site URL**
   to `https://homehub-drab.vercel.app` and add it under **Redirect URLs**
   (plus `http://localhost:5173` for development). Authentication →
   Sign In / Providers → Email: you can turn **Confirm email** off while it's
   just the family, so signing up works without the email step.
3. **Vercel env vars** (Production and Preview):

   | Variable | Value |
   |---|---|
   | `VITE_SUPABASE_URL`, `SUPABASE_URL` | Project Settings → API → Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → publishable key (`sb_publishable_…`) |
   | `SUPABASE_SECRET_KEY` | API Keys → a secret key (`sb_secret_…`). Server only, never `VITE_` |
   | `HUB_SECRETS_KEY` | `openssl rand -hex 32`. Keep it forever: changing it means families re-enter their links |

   Redeploy.
4. **Make the family account.** On the iPad: **New family** → your email and
   a password → family name "The Carlsons" → people → PIN. Everything you set
   up is now saved to the account.
   *Already set up on a screen?* Go to Parent → Connections → Family account →
   "Make one", then **Start** your family there. That screen's data becomes
   the family's.
5. **Mark it as the home family.** In the SQL editor run
   `select id, name from households;`, copy the Carlsons' id into the Vercel
   env var `HUB_HOME_HOUSEHOLD_ID`, and redeploy. From now on your calendar,
   Notion and slideshow come from the Vercel values you already have.
6. **Other screens and phones:** open the site → **Sign in**. Your family loads.
7. **Your partner:** Parent → Connections → **Invite a grown-up** shows a
   6-letter code. They tap **New family**, make their own login, then enter the
   code under **Join**.
8. **SIGNAL and PointPals:** on each screen, Parent → Connections → sign in,
   like before. (Those logins stay on each screen and aren't stored in the
   account; see "Next steps".)
9. **Until other families are invited**, you can switch off Authentication →
   Sign In / Providers → **Allow new users to sign up** after your partner has
   joined. Turn it back on when you're ready.

## Part 2: connecting another family

Send them the site link and this checklist. Each step is done by them, in
the app. Nothing needs changing in code or Vercel.

1. **Make the account.** Open the site → **New family** → email and password
   → family name → add everyone (characters or photos) → parent PIN.
2. **Google Calendar.** On a computer: Google Calendar → ⚙ Settings → pick
   the family calendar → *Integrate calendar* → copy **Secret address in iCal
   format**. In the hub: Parent → Connections → **Family calendar** → paste →
   Save. Do the same for a kids' or bookings calendar if they have one.
   (The address lets anyone read the calendar, so only paste it into the hub.
   If it leaks, press *Reset* in Google and paste the new one.)
3. **SIGNAL** (shopping list and meal plan). Parent → Connections → SIGNAL →
   sign in with *their* SIGNAL account. If they signed up to SIGNAL with
   Google, they set a password first with "forgot password" in SIGNAL.
4. **PointPals** (kids, jobs and jars). Parent → Connections → PointPals →
   sign in as a parent, then Parent → Family → **Use PointPals kids** to link
   each child.
5. **Notion** (money and to-dos, optional).
   1. Duplicate the Home Hub Notion template into their workspace. It needs
      databases titled exactly **Expenses**, **Bills** and **Life Admin** with
      the same properties as ours.
   2. notion.so/profile/integrations → **New integration** → internal, named
      "Home Hub" → copy the secret (`ntn_…`).
   3. On their Home Hub page: ••• → **Connections** → add Home Hub.
   4. In the hub: Parent → Connections → Notion → paste → Save. The hub finds
      the three databases by name and says how many it found.
6. **Slideshow** (optional). Make a Google Drive folder, share it as
   **Viewer** with the email shown in Parent → Connections → Slideshow folder
   (the hub's service account), then paste the folder id from its link
   (`drive/folders/<id>`).
7. **Each extra screen:** open the site → Sign in. Then sign in to SIGNAL and
   PointPals on that screen.

To prepare for this, publish the Carlsons' Home Hub Notion page as a
template with the example rows removed, and put its link in step 5.

## For developers

- Client: [`src/lib/account.ts`](../src/lib/account.ts) handles sign-in,
  families, invites and the sync engine. `SYNCED_KEYS` lists what syncs and
  `DEVICE_SETTINGS` lists the settings that stay per screen.
  [`src/components/FamilyAccount.tsx`](../src/components/FamilyAccount.tsx)
  has the Parent → Connections panels.
- Server: [`api/_family.ts`](../api/_family.ts) has `requireFamily(request)`
  → `{ householdId, isHome, secret(name) }`. Every `/api` function uses it,
  and `secret()` reads `household_secrets` first, then (home family only)
  `process.env`. [`api/connections.ts`](../api/connections.ts) saves and
  removes a family's values.
- **To add a new kind of family connection:** add its name to
  `FAMILY_SECRETS` in `api/_family.ts`, add a check in `api/connections.ts`,
  add a row to `FIELDS` in `FamilyAccount.tsx`, and read it with
  `family.secret("NAME")` in the function.
- Don't read `process.env` for anything family-specific in a new function.
  Always go through `family.secret()`, otherwise every family would see the
  Carlsons' data.

## Next steps

- Keep SIGNAL and PointPals sign-ins with the family (encrypted, like the
  other connections) so a new screen only needs the one hub sign-in.
- Sync voice notes, doodles and photos through Supabase Storage.
- Merge changes item by item instead of last-save-wins on the whole document.
- Write events into Google Calendar with Google sign-in (OAuth) per family,
  replacing the iCal links.
- A "family settings" page for owners: rename, remove a grown-up, cancel invites.
