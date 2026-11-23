# Progress

## 24 Nov 2026: a way back out of guest mode

- Guest mode's only exit was an invisible 6 rem button in the top-left corner
  that needed a 1.6-second hold. Nothing on the screen said so, so an owner who
  turned it on had no visible way back.
- There's now a discreet **Owners** chip in the bottom-right that asks for the
  parent PIN. The long-press still works for anyone who knows it.
- With no PIN set, the chip leaves guest mode directly: there is nothing to
  prove, and an owner must never be locked out of their own screen.
## 24 Nov 2026: backup and restore

- **Parent → Settings → Backup**: "Save a backup" downloads one JSON file with
  the family, profile photos, notes, habits, check-ins, claims, reflections,
  shopping list, kid plans and settings — plus the voice notes, doodles and
  slideshow photos that live in IndexedDB.
- "Restore from a file" puts all of it back, so a screen can move to a new web
  address (`localhost` → the Vercel URL) or a new device while everything still
  lives in the browser. The hub key is deliberately left out of the file and
  the screen's own key is kept; guest mode is never restored.
- Media over 8 MB each (a long slideshow video) is skipped and counted in the
  toast so the file stays a sensible size.
- Verified end to end in a browser: export, wipe, restore — family, the note's
  voice blob, and the photo all came back, and the screen's own hub key was
  kept.

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

## 24 Nov 2026: family accounts

- Sign in on the welcome screen (or **New family**), or from Parent →
  Connections on a screen that's already set up. The family's hub data saves
  to the hub's Supabase project and syncs live between screens and phones.
- Invite codes so a second grown-up can join the family.
- Built for many families: every `/api` function works out the family from
  the sign-in and reads that family's own calendar links, Notion token and
  slideshow folder, saved encrypted from Parent → Connections. The Carlsons
  (`HUB_HOME_HOUSEHOLD_ID`) keep using the Vercel env vars.
- Notion: paste a token and the hub finds the Expenses / Bills / Life Admin
  databases by name.
- Database: `supabase/migrations/20261123000000_family_accounts.sql`, not
  applied yet. Steps and the new-family checklist are in
  [ACCOUNTS.md](ACCOUNTS.md).

## 24 Nov 2026: no more blank screens after an update

- Screens pick up a new version by themselves (and check hourly), instead
  of running old code until someone force-refreshes. That's why the badge fix
  and the Parent area didn't show up after the last deploy: an old copy tried
  to load a Parent file that no longer existed, and the page went blank.
- If a screen still can't load, it reloads once on its own, then shows
  "Home Hub has updated" or a kind error with Reload / Go home, never a blank page.
- Family sync remembers changes made just before a reload and saves them first.
- Guest mode: tap the House guidebook card to read the guide (PDF or web page)
  full screen, with "Open in a new tab" if the site won't show inside the hub.
