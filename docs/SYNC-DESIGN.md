# Home Hub — cross-screen sync design (Phase 5 proposal)

Goal: the iPad, Chromebook, wall screen and phones share one family's data,
while each screen stays instant and works offline.

## Auth — one family login

- One Supabase auth user = the family. Each screen (and Mum/Dad's phones) signs
  in **once** with the same email + password in **Parent → Connections**.
- `hub_households.user_id` holds that `auth.uid()`; every RLS policy is keyed on
  it.
- Trade-off vs the earlier "device pairing" idea: simpler and truly shared, but
  no per-device revocation, and one credential for the whole family. (A
  `hub_household_members` join table can be added later if Mum and Dad want
  separate logins.)

## Tables (Supabase project `wpbvrjogeannuqshghnb`)

Every table carries `household_id`, `updated_at` and `deleted_at`. Soft delete
wins over hard delete, so a screen that was offline can still catch up.

| Table | Holds | Local store slice |
|---|---|---|
| `hub_households` | id, user_id, name, timezone | — |
| `hub_members` | name, role, pal_id, colour, photo path, birthday, pointpals_kid_id, sort_order | `members` |
| `hub_notes` | text/voice/doodle post-its, reactions (jsonb), seen_by (jsonb), done | `notes` |
| `hub_habits` | habits | `habits` |
| `hub_checkins` | habit check-ins | `checkins` |
| `hub_nights` | reflection nights | `nights` |
| `hub_claims` | pending/resolved claims | `claims` |
| `hub_kid_plans` | kid-added + snapped events | `kidPlans` |
| `hub_settings` | one row per household, non-secret settings (jsonb) | `settings` (subset) |
| `hub_photos` *(optional)* | slideshow photos' storage paths | `photos` |

- The store's local ids are already unique, so they become the primary keys and
  cross-row references (`note.from`, `habit.memberId`, `claim.memberId`) keep
  working unchanged.
- **Media** (voice notes, doodles, photos) lives in a private **`hub-media`**
  bucket; the tables store the storage *path*, and the client fetches signed
  URLs (short TTL) to display.
- **Secrets never sync**: `pinHash`, `pinSalt`, `hubKey`, `wifiPassword` stay
  device-local. Everything else in `settings` does sync.
- **PointPals/SIGNAL fallbacks stay local** (`localList`, `localChores`,
  `marbles`, `familyJar`, `mealHearts`, `localDinners`) — they're replaced by the
  live apps when connected.

## RLS

On every `hub_*` table: enable RLS and allow SELECT/INSERT/UPDATE/DELETE only
when the row's `household_id` belongs to the caller:

```sql
(select 1 from hub_households
   where id = <table>.household_id
     and user_id = auth.uid()
     and deleted_at is null)
```

The family login is the only user, so this one predicate is the whole policy.
The publishable key + RLS is sufficient — no service-role key in the browser.

## Local-first sync layer (`src/lib/sync.ts`)

The zustand store stays what the UI reads. A sync layer bridges store ↔ Supabase:

1. **Sign in**: if this screen already has local data and the household is
   empty, offer to **upload what it has** (seed).
2. **Pull**: fetch each `hub_*` table (where `deleted_at is null`) and merge
   into the store — apply a row only if its `updated_at` is newer than the local
   copy (last-write-wins).
3. **Push**: subscribe to the store; on a change to a synced slice, upsert that
   row with `updated_at = now()`. Debounced and batched.
4. **Realtime**: subscribe to `postgres_changes` on each table filtered by
   `household_id`, applying incoming rows with the same LWW rule.
5. **Offline**: an IndexedDB queue holds pushes that fail; flush on reconnect.
6. **Media**: on write, upload the blob to `hub-media` first, then store the
   path in the row, so media and its row land together.

Last-write-wins by `updated_at` means the latest write on any screen simply wins;
there's no conflict UI.

## Migrations & checks

- SQL migrations in `supabase/migrations` (Supabase CLI) — one file per table +
  policies.
- Run the security and performance advisors and fix what they flag.

## Test

Two browser windows on the same deploy, signed into the same family login: add
a note in one, approve a claim in the other, change a profile photo — each should
appear in the other within a few seconds (realtime) and survive a reload (pull).

## Open questions for you

1. **One shared family login** OK, versus per-person logins or per-device
   pairing? (I recommend the shared login for v1.)
2. Should **slideshow photos** sync too (add `hub_photos`), or stay per-screen
   for now?
3. **Profile photos** currently live as data-URLs on each screen — OK to move
   them into `hub-media` and store paths?
