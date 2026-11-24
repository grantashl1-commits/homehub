# Progress

## 24 Nov 2026: events land in the right person's column

- The People view matched an owner only by a family name inside the title, so
  activity-named events ("Athletics @ Hilltop", "🤸 Gymnastics") sat in the
  Family column and each person's column said "Nothing on".
- Each person now has **Also matches** in Parent → Family: comma-separated
  words **or emoji**. The convention the family uses in Google Calendar works
  directly: 👦 and 👧 on a kids' event (both, if both emoji are there), 👨 and 👩
  with a name for a grown-up's event.
- Skin tones and emoji presentation selectors are ignored when comparing, so
  🤸🏼‍♀️ matches a marker of 🤸‍♀️. Names still match as whole words.
- An event that matches nobody stays in the Family column; one that matches two
  people shows in both columns. Covered by 7 unit tests.
- Parent now shows whether an edit has saved, in the sidebar under the tabs:
  "Saving…" then "Saved 10 seconds ago", or "Saved on this screen" when the
  device is not signed in to the family account.
## 24 Nov 2026: the house guide, on the screen

- Guests used to get a QR code to a PDF. The guest screen's house guide is now
  an interactive guide: a rail of sections down the left, one section at a time
  on the right, sized for touching and readable from a step back. Read-aloud on
  every section; the PDF reader stays as the fallback for a property that has no
  guide yet.
- Content is transcribed from the printed 5 Lens Way guide
  (`src/content/guides.ts`): arrival and the lockbox, Wi-Fi & TV, the house,
  where you'll sleep, amenities, finding us, things to know, heating & water,
  sauna & ice bath, the spa pool, the reformer/gym/bikes, house rules,
  emergencies, things to do, places to eat, cafés, places to drink, check-out
  and coming back.
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

## 24 Nov 2026: 5 Lens Way guide in the One Eleven style

- The guest guide now looks and works like the One Eleven digital guidebook
  on carlsonproperties.co.nz: Japandi ivory and charcoal, Fraunces headings,
  Figtree text, a numbered chapter rail with a progress bar, and a "Need help?"
  card with the hosts' number.
- 11 chapters instead of 20 (all the words kept): welcome, arrival & Wi-Fi,
  the house (Living / Bedrooms / Work & play / Garage & outdoors photo
  galleries), how-to guides (Sauna / Ice bath / Spa pool / Heating / Gym &
  bikes), good to know, house rules, Explore Taupō (Adults / Teens / Little
  ones), Dining & drinks (Restaurants / Cafés / Bars), emergency (Call 111),
  check-out and thank you.
- Real house photos from the booking site's media bucket; places reuse One
  Eleven's photos and links. Tap a place for a QR code to open it on a phone.
- Tickable check-out list, swipe or arrow keys to turn the page, read-aloud,
  quick chips for Wi-Fi, lockbox, sauna & spa, check-out.
- Photos are cached for offline, and any that fail fall back to a plain panel.
- Content: `src/content/guides.ts`; screen: `src/components/HouseGuide.tsx`;
  tests: `src/content/guides.test.ts`.

## 24 Nov 2026: home screen tidy-up, and phones

- Hero card: room under "Who's here?", names on a pill so they read on every
  sky, and two clear badges on each face: ✉️ new notes for them, ⭐ PointPals
  jobs still to do.
- The UV and "sleeps till" chips are gone. In their place: Today, then a
  **To do** bullet list (bin night plus calendar tasks: anything titled
  "To do: …", "Task: …" or "☐ …", or an all-day entry on the family or kids'
  calendar), tickable and synced, then **Coming up** for the next few days, so
  the card is full even on a quiet day.
- Jar card: the family jar plus each child's own jar (their PointPals personal
  jar when split jars are on, otherwise their marbles).
- Shopping card: no "Synced with SIGNAL" line; shows more items.
- Fridge notes: "3 notes · 2 new" so it matches the Notes tab (which counts new
  ones), every note on phones, two on the bench, and "View all".
- The + Shopping / + Calendar / + Note buttons are gone; the cards open those pages.
- Phones: one scrolling column, compact header and a full-width nav that fits
  six tabs; safe-area insets for notches; the installed app is no longer
  locked to landscape. Other pages still need their own phone pass.

## 24 Nov 2026: record the dinnertime chat

- **Record our chat** in the reflection header listens the whole way round the
  table (the device's own speech-to-text: Chrome on the Chromebook/wall PC,
  Safari on iPad/iPhone; it keeps listening through pauses until Stop).
- On the summary, **Save our reflection** sends the transcript to DeepSeek
  (`/api/reflect-summary`, `DEEPSEEK_API_KEY`), which writes a short family
  summary and a few lines for each person. If DeepSeek isn't set up, the
  transcript is still saved.
- Each person's lines appear under **My reflections** on their profile, with
  read-aloud. Saved reflections sync with the family account.

## 24 Nov 2026: recipes: search everything, import from a link, straight onto the list

- The dinner picker searched only dinners that had a photo, so breakfast
  and baking recipes (every pancake recipe) and 136 photo-less recipes never
  showed. It now searches all 1,039 SIGNAL recipes plus the family's own
  SIGNAL "My recipes", by name then ingredients, with filters (All, Dinners,
  Breakfast, Snacks & baking, Our recipes).
- **Import from a link** (in the picker): `/api/recipe-import` reads the page
  (its schema.org recipe data when it has it, using SIGNAL's own reader copied
  to `api/_recipe-schema.ts`), and DeepSeek writes it up SIGNAL-style with the
  amounts in each method step. Check it, keep the website's photo or upload
  your own (shrunk to a 1000px JPEG on the recipe), and save to SIGNAL's
  My recipes (`user_recipes`, under SIGNAL's RLS). It's then picked for that day.
- Choosing a dinner puts its ingredients on the shopping list (SIGNAL when
  connected), labelled with the recipe, skipping anything already there;
  delete what's already in the cupboard. Note: SIGNAL's own list screen also
  works out meal-plan ingredients itself, so a library recipe can show twice
  there. The family's own recipes don't.

## 24 Nov 2026: PointPals people, jobs and jars

- Hub people are linked to PointPals by name automatically (Mum, Dad, Leo,
  Ruby), saved on the member so it syncs; Parent → Family can still change it.
  Before, anyone not linked by hand saw the hub's sample jobs and marbles.
- Jobs come from PointPals and only the ones assigned to that person.
- Grown-ups PointPals counts as earners get their jobs, points and jar too.
- Jars show each person's own PointPals jar (e.g. 6/50) when they have one.
- Points both ways: awards made in PointPals show on the hub within a second
  (realtime); with the parent area unlocked, tapping a job says "Give +N" and
  awards it in PointPals straight away; kids' "I did it!" still waits in
  Approvals and is awarded the PointPals way when approved.
- The Notes tab badge now counts notes on the fridge, the same as the home card.

## 24 Nov 2026: habits, Notion to-dos, slideshow button, parent tidy-up

- Habits: SIGNAL's habit library (62 habits with SIGNAL's illustrations) plus
  the kids' and family picture habits, with search; progress shows tick
  today, current and best streak, this month, this week's ticks and a
  4-week tick chart.
- Home To do now also lists Notion Life Admin tasks that are overdue, due
  today or undated (every open task, no "Show on hub" needed); ticking one
  marks it Done in Notion.
- A slideshow button on the home card starts the photo slideshow; it still
  starts by itself after the idle time, and a tap goes back home.
- Guest screen: the Check-out / Sauna, spa & heating / The house / Things to
  do tiles open those chapters of the house guide; the guide QR comes from the
  guide. Settings no longer has the guide link and the four text boxes; the
  Wi-Fi password is hidden; the local jar settings hide when PointPals is
  connected. Family: the PointPals link is offered for grown-ups too.

## 24 Nov 2026: phone layouts for every page

Mobile patterns from Ionic / Framework7 (the most-starred PWA UI kits):
toolbar-sized page titles, controls on their own row, list and card layouts
instead of squeezed columns, swipe-and-snap columns, and a floating action
button in the corner above the tab bar. Phone-only (max-md); the bench and
wall layouts are unchanged.

- Phone base text drops to 13px root (body ≈19px, 3.4rem targets still 44px).
- Top bar: the family name has room; the small "Home Hub" line hides.
- Me: 2×2 cards with smaller faces; the jar sits beside the title.
- Meals: full-width tonight card, then the week as a two-column list.
- Calendar: controls wrap under the title (Snap becomes an icon), te reo day
  names hide in the day strip, and the people columns swipe one per screen.
- Notes: two columns, readable note text, a compact "+ Note" button above
  the nav, and the filter row scrolls sideways.
- List: the page scrolls instead of an inner box; names no longer truncate.
- Checked at iPhone 13 size: no page scrolls sideways.
