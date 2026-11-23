# Progress

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
