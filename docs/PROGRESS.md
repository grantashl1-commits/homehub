# Progress

## 24 Nov 2026: v1 "glow-up"

Built the whole app in one pass:

- Home: te reo greeting, weather + UV/raincoat tips, "sleeps till" countdowns,
  bin night, who's here, today's events, tonight's dinner, family jar,
  shopping list, fridge notes, quick add.
- Me: each child's zone with PointPals jobs ("I did it!" → parent approval),
  marbles, habit, add to list / calendar / note.
- Fridge notes: text, voice and finger-doodle post-its, reactions, read aloud.
- Dinnertime reflection: round-the-table habit check-in with voice notes,
  family streak and 2-week habit review.
- Habits, shopping list (SIGNAL), meals (SIGNAL recipes with photos),
  calendar (Google iCal, people columns, NZ terms/holidays, kids' picture
  flow, Snap a notice), parent area (approvals, family, Notion money and
  to-dos, photos, connections, settings), guest mode, screensaver, night clock.

Verified at 1180×820 (iPad), 1366×768 (Chromebook) and 1920×1080 (wall).

## 24 Nov 2026: profile photos

- Anyone can use their own photo instead of a character: tap the camera on
  their picture in setup or Parent → Family. The photo shows everywhere
  their character did (home, Me, calendar, reflection, celebrations).
- Photos are cropped square and shrunk to about 8KB, stored on the screen
  with the rest of the family settings. Picking a character switches back.

## Phase 2 — SIGNAL/PointPals connector reconciliation (in progress)

- Audited the hub connectors against SIGNAL and PointPals `origin/main`:
  week-key format (`YYYY-Www`), `itemKey` algorithm and meal-plan shape all
  already match. PointPals `pointpalsAward` split math and RLS (a parent can
  award via the publishable key) also match.
- Fixed `signalAddItem` to shape manual items exactly as SIGNAL's "add item"
  does: ported SIGNAL's `parseIngredient`/`toNZName`/`categoriseItem`/`parseQty`
  into `src/lib/signal-parity.ts`, so `name`/`totalQty`/`unit`/`category`/
  `searchTerm` (and therefore the shared `itemKey`) line up. Round-trip tests
  need live SIGNAL/PointPals logins (pending Phase 1 connection).
- Added `npm run sync:recipes` (`scripts/sync-recipes.mjs`): esbuild-bundles
  SIGNAL's `recipe-library.ts` + `category-illustrations.ts` and rebuilds
  `public/data/signal-recipes.json`, filling images via SIGNAL's
  `getRecipeIllustration`. Re-running it restored images to 137 recipes that
  shipped with `image: null`.
- SIGNAL favourites now sync into the meal swap sheet: `fetchFavourites`/
  `signalToggleFavourite` read and write `user_saved_recipes` (`"favourite:"`-
  prefixed `recipe_id`), and the swap sheet sorts favourited meals first with a
  heart to toggle. (User recipes `user_recipes` still to surface.)
- Known gap: the hub's list reads only SIGNAL's `custom_items`; SIGNAL's
  meal-plan-derived ingredients aren't persisted, so they don't appear on the
  hub yet.

## Phase 3 — SIGNAL habits (in progress)

- Added `npm run sync:habits` (`scripts/sync-habits.mjs`): esbuild-bundles
  SIGNAL's `habit-library.ts` + `habit-art.ts` and rebuilds
  `public/data/signal-habits.json` (77 habits with illustration paths).
- Mum's habits now sync to SIGNAL both ways: `signalSetHabitDone` writes
  `habit_completions` (local date, upsert on conflict) and
  `fetchHabitCompletions` reads today's ticks. When SIGNAL is linked, the
  habit picker shows SIGNAL's library to the first parent member, a "Yes!" at
  dinnertime reflection records the completion, and a tick made in the SIGNAL
  app shows as done on the hub (reflection header + habit week strip).
- Known simplification: Mum is identified as the first parent member; kids/Dad
  presets still to be expanded from SIGNAL's library (a curation task).

## Snap a notice: switched to DeepSeek

- `/api/snap` now calls DeepSeek's vision model (`deepseek-flash`) instead of
  Anthropic. Env var is `DEEPSEEK_API_KEY` (optional `DEEPSEEK_MODEL`, default
  `deepseek-flash`).
