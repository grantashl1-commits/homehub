# Progress

## 24 Nov 2026: jobs fit on bigger screens

- With a real PointPals load (14 jobs) the kid's page squashed every row into
  the available height, which clipped the "I did it!" buttons and spilled card
  titles — worst on a laptop or the wall monitor at 100%.
- The grid now fills as many columns as fit (10–12.5rem) and its rows keep
  their height, scrolling behind a soft fade when there are more jobs than fit.
  Over nine jobs the cards go compact (icon, name and button all smaller) so a
  normal load fits without scrolling.
- Checked at 1896×914, 1366×768 and 1180×820 with 14 jobs: picture, name and
  button visible on every card.
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

## 24 Nov 2026: recipe import reads sites that block servers

- Some recipe sites (e.g. vegansociety.org.nz) refuse requests from cloud
  servers, so the import said "That site wouldn't let us read the page".
  It now falls back to reading the page through Jina Reader, the same
  fallback SIGNAL's own importer uses, and DeepSeek picks out the recipe and
  its main photo from that text.

## 24 Nov 2026: your own habits, phone Me and Reflect, calendar details

- Habits: each person can have up to 4 habits at once. "+ Add" opens a sheet
  with "Make your own" (name, picture, how often: every day, school days, or
  1 to 6 times a week) plus the kids', family and SIGNAL libraries. Cards show
  this week's ticks and a Tick button; the detail has streaks, a four-week tick
  chart, this month, and Edit / Stop (stopped habits keep their history).
  Desktop: people rail | cards | detail. Phone: people strip, cards that open
  in place. School-days habits show "Rest day" at the weekend.
- Dinnertime reflection asks about each habit in turn ("Habit 2 of 3"),
  skips habits resting today, and lays out as a scrolling page on phones
  (the intro overlapped the header before).
- Me on phones: profile row on top, then jobs two-up, then the three buttons.
- Calendar add: "Something else" with your own name and picture; any date;
  a set start and end time; a place and notes. Grown-ups get "Add to Google
  Calendar" at the end, which opens Google with the time, place and notes
  filled in. The hub keeps showing the event until Google's feed has it.
  This is one-way: the hub reads Google via the private iCal link (read-only).
  True two-way sync needs Google sign-in with calendar access (not built).
- Snap a notice: separate "Take a photo" and "Choose from photos" buttons
  (the camera-only input hid the photo library on Android). Snap reads with
  Claude vision (ANTHROPIC_API_KEY); DeepSeek's API can't read images.

## 24 Nov 2026: Habit Adventure game for the kids

The printable habit worksheet as a game, from each kid's Me page
("Habit Adventure", /me/:id/adventure). Read-aloud all the way through.
1. Which ones sound fun? 13 picture cards, tap a face (yes, maybe, not yet).
2. Habit games: colour the rainbow (tap a crayon, tap to fill), join the dots
   1–10 to find a reward star, the toothbrush maze (arrows, swipe or keys,
   new maze each time), and "when do we do it?" (no wrong answers).
3. Pick a habit (the loved ones first), when you'll do it, then press and
   hold the hand to make a high-five promise. That adds the habit, so it
   comes up at dinnertime reflection and on the habits page.

## 24 Nov 2026: habit tracker on Me pages, AI habit pictures, PointPals sync

- Me pages show "My habits this week": each habit with Monday to Sunday ticks
  (from dinnertime reflection or the habits page), x/goal for the week, and a
  gold "🏆 Goal!" card once the weekly goal is met. No habit yet: a link to
  Habit Adventure (kids) or the habits page.
- Make your own habit → "✨ Make a picture" draws an icon with PointPals' own
  generator (its `generate-icon` edge function: Gemini, PointPals house style,
  white knocked out). The icon also lands in the PointPals icon library.
  PointPals allows 10 a month per household.
- PointPals sync: every active habit of a PointPals-linked person becomes a
  positive skill assigned to that child (same name reused), from any screen or
  device that's signed in to PointPals. Edits rename/re-picture the skill.
  A "Yes!" at dinnertime, or a tick with the parent PIN in, awards 1 marble
  in PointPals, once per habit per day.

## 24 Nov 2026: slideshow videos play on desktop

- The screensaver showed a black screen for a Drive video: /api/slideshow-media
  sent the whole file in one reply, with no byte ranges. Browsers need ranges
  for video (Safari won't play without them; Chrome needs them to reach an MP4
  index at the end), and Vercel caps a function reply at 4.5MB. It now passes
  Range through to Drive in 4MB chunks and replies 206 with Content-Range.
- Links are signed fresh on every list (6 hours), so a cached list never hands
  out expired ones.
- Videos play to the end before the next slide (loop when it's the only one);
  photos stay 9 s. A file the screen can't play (e.g. an iPhone .mov in
  Chrome) is skipped and named in a small note instead of a black screen.

## 24 Nov 2026: 11" tablet layout, habit visuals on the habits page

- On an 11" Lenovo Chromebook tablet in Chrome (about 1280×620), the Me page's
  habits card squeezed "My jobs today" to its title and pushed the buttons
  under the nav. Habit tiles now sit in one row (auto-fit), the jobs card keeps
  room for a row of jobs, and that column scrolls on short screens.
- The habits page cards use the same Monday–Sunday dots with day letters, and
  turn gold with "🏆 Goal!" when the week's goal is met.
- The add-habit library tabs start with "Not here? Write your own", which
  leads to the name, emoji and ✨ Make a picture.

## 24 Nov 2026: Me page tidy, add habits from the Me page

- Removed the Add to list / Add event / Write a note / Habit Adventure buttons
  from Me pages (the bottom nav covers list, calendar and notes), and the
  Habit Adventure game itself (the family has finished with it).
- "My habits this week" has "+ Add habit", opening the same sheet as the
  habits page. It now opens on Make your own for everyone: name, how often,
  emoji or ✨ Make a picture (PointPals' generator), and the habit syncs to
  PointPals as that child's skill.

## 24 Nov 2026: 0-point chores and new PointPals chores

- PointPals chores set to 0 points (PointPals calls them habits: logged as
  done, no marble) now show as done on the hub. Before, the hub only counted
  awards above 0, so they never ticked off.
- Kids tapping "I did it!" on a 0-point chore get the celebration and it's
  logged in PointPals straight away; no approval, since there's no marble.
  0-point cards don't show "+0".
- New and changed PointPals chores arrive live (realtime on the chores table).
- Unassigned PointPals chores (which PointPals gives to every kid) now show for
  the children too, except adult-tagged ones. Chores assigned to someone still
  only show for them.

## 25 Nov 2026: jobs back to assigned-only, notes on Me, give a marble, home fit

- Jobs: back to only the chores PointPals assigns to each person (the ⭐ on the
  home faces is jobs still to do; showing every unassigned chore gave the kids
  35 each). Job cards no longer use layout animation (cheaper with many jobs).
- Me pages: a "new notes" card in the profile column (notes to them or to
  everyone). "Got it ✓" or "Read all" marks them read, which clears the ✉️ on
  their face on the home screen. The profile column scrolls on short screens.
- Dinnertime reflection: after the habits, "Give a marble to anyone today?":
  tap a person, pick or say why, and a 👍 marble (PointPals' "thumbs up.png")
  goes in their PointPals jar (hub marbles if they aren't in PointPals). The
  summary lists the marbles given. Stages scroll when taller than the screen.
- Home: personal jars are a compact row (four fit at 1280×620 and 1900×900),
  smaller family jar, notes have room for their tilt (2 lines each), more
  space between faces so badges don't sit on the next face, and an empty
  shopping list says "All stocked up".
- Speed: List, Meals, Calendar, Notes and Reflection load in the background
  after the home screen (main bundle 516KB → 423KB).

## 25 Nov 2026: badges beside faces, list regulars, calendar people, shared voice notes

- Home: the ✉️ and ⭐ badges sit beside each face instead of on the photo.
- Shopping list: no emoji on items, headings or the home card. The preset
  "Tap to add" pictures are gone; "Most often added" shows the family's own
  regulars (anything put on the list by hand at least twice, most first),
  counted in `listCounts` and synced with the family.
- Calendar people: an emoji only matches someone when it stands alone, so
  👩‍🦳👨‍🦳 Grandma + Grandad no longer lands on Mum and Dad (stays Family).
  A girl/boy/child emoji no child has claimed goes to all the children.
- Voice notes, doodles and photos are copied to the family's private storage
  (bucket `hub-media`, migration 20261125000000_family_media.sql), so a note
  recorded on the tablet plays on the desktop. Each screen shares its older
  recordings once when signed in. Needs the migration run on the hub project.
