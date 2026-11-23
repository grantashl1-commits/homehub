# Home Hub — brief

## What it is

A fridge-style family touchscreen for our kitchen. It's built on my laptop, deployed to Vercel, and shown full-screen on a wall-mounted touch monitor, driven by a small PC that runs the browser in kiosk mode. The laptop is where it's built, not what runs it.

## Planned hardware

- **Display:** 24" 10-point touch monitor (Philips 242B9T — splash and dust resistant) on a VESA wall bracket.
- **Driver:** fanless Intel N150 mini PC running Windows 11 Pro (e.g. MINIX Z150-0dB). Google Chrome runs full-screen in kiosk mode (`--kiosk <hub URL>`), launched automatically at sign-in under a local kiosk user that signs in automatically.
- **Screen sizes:** design for 1920×1080 landscape first and check portrait. Must also work on my laptop's touchscreen for testing.

## Who uses it

- **Kids (two young children):**
  - icon-first, with big tap targets (minimum 64px)
  - bright, and works for children who can't read yet
  - their PointPals companion characters are their avatars; tapping their character "logs them in", with no passwords
- **Parents (me and my husband):** a parent PIN unlocks approvals, meal-plan changes, household admin and settings. We also want the shopping list on our phones.
- **Guests:** our family home is let to Airbnb guests when we travel. While they're there, the screen runs in guest mode.

## Modules

1. **Today screen (home)**
   - clock, date, and weather for Taupō
   - today's family calendar and tonight's dinner from the meal plan
   - kids' points at a glance and the shopping-list count
   - photo/video slideshow when idle
2. **Kids' zone.** A child taps their character, then can:
   - see their chores and points
   - tap "I did it!", which creates a *pending* points claim
   - add to the shopping list, using picture tiles for common items plus simple typing
   - add to the calendar with a fun what/when picker built from icons; these events land in a dedicated Kids calendar
3. **PointPals**
   - balances, pending claims, rewards
   - approve or reject claims, which needs the parent PIN
   - PointPals is live at pointpals.co.nz with its own repo and Supabase. It needs a new hub API (see Architecture).
4. **Meal plan and shopping list (SIGNAL)**
   - this week's meal plan, drawn from SIGNAL's recipe database
   - changing the plan needs the parent PIN
   - an "add ingredients to list" button
   - the shopping list is shared and collaborative, Google Keep style: realtime updates, tick-off, categories, and anyone in the family can add from their phone
   - the list data lives in SIGNAL (signal.mindcast.co.nz, own repo and Supabase). SIGNAL needs new endpoints and a household-shared list.
5. **Calendar**
   - **Family calendar:** matt.ash.carlson@gmail.com (school events, family holidays).
   - **Airbnb bookings and cleaning calendar:** lives on grantashl1@gmail.com. Show check-ins and cleans in their own colour.
   - **Kids calendar (new):** created under the family account. Kid-added events go here.
6. **Household admin (Notion)**
   - expenses, purchases and life admin, kept in a Notion workspace (still to be built)
   - the hub reads and writes it through the Notion API, and my AI agents edit it via Notion MCP
   - the hub offers quick-add for a purchase or expense, upcoming bills, and to-dos
   - the whole module sits behind the parent PIN
7. **Slideshow**
   - family photos and videos shown when idle
   - years of kids' videos live in Canva. Export them as MP4 (manually or via the Canva Connect API) into the slideshow source.
   - **Source:** a Google Drive folder "Home Hub Slideshow" on matt.ash.carlson@gmail.com.
   - **Don't use Google Photos albums.** Since 31 March 2025 the Google Photos Library API only lets apps read albums and media the app created itself.
8. **Guest mode**
   - shows our digital guidebook (URL to be provided)
   - turned on with the parent PIN, and optionally switched on automatically during bookings for our home on the bookings calendar
   - in guest mode, no family data is shown or fetched, the slideshow is off, and exiting needs the parent PIN
   - enforced **server-side**: a device flagged as in guest mode gets 403 from every family endpoint. Hiding things in the UI isn't enough.

## Architecture

- **Frontend:** Vite + React + TypeScript + Tailwind + shadcn/ui, built as a PWA on Vercel. Routes:
  - `/kiosk` — the wall screen
  - `/kids` — the kids' zone
  - `/parent` — parent screens behind the PIN
  - `/list` — phone-friendly shopping list
  - `/guest` — guest mode
- **Hub backend:** its own small Supabase project for hub state: devices, PIN hash, guest-mode flag, mapping from kid profile to PointPals child, slideshow index, settings. Edge functions proxy every third-party call, so no secret ever reaches the browser.
- **Google:** use a Google Cloud **service account**.
  - Share the family calendar, the Kids calendar (edit access), the Airbnb calendar (read-only) and the slideshow Drive folder with the service account's email.
  - Store its key as a Supabase secret.
  - This avoids OAuth tokens expiring on a kiosk. If OAuth is used instead, the consent screen must be set to "In production": apps left in "Testing" get refresh tokens that expire after 7 days.
- **PointPals hub API** (add to the PointPals repo as Supabase edge functions):
  - GET children, balances and chores
  - POST a chore claim
  - POST approve or reject a claim
  - GET rewards
  - Auth: a long random per-household hub API key, stored as a secret on both sides. Approvals are only accepted after the hub backend has verified the parent PIN.
- **SIGNAL hub API** (add to the SIGNAL repo):
  - GET the week's meal plan, PUT a meal plan (parent only)
  - search recipes
  - shopping-list CRUD on a household-shared list, using Supabase Realtime
  - "add recipe ingredients to list"
  - household membership, so family phones and the kiosk all see the same list
- **Notion:** an internal integration token with access to the household workspace only.
- **Weather:** Open-Meteo (free, no API key) for Taupō.
- **Device security:**
  - The kiosk pairs once, using a code entered on the parent screen, and gets a long-lived, revocable device token.
  - The parent PIN is 4–6 digits, hashed, rate-limited, and relocks automatically after 2 minutes idle.
- **Offline:** cache the last-loaded data so the screen still shows something if the Wi-Fi drops.

## Build order

1. Shell: kiosk layout, today screen (clock, weather, read-only calendar), device pairing, parent PIN.
2. Shopping list: SIGNAL API, realtime, `/list` phone view.
3. PointPals kids' zone and approvals.
4. Meal plan.
5. Kids adding to the calendar.
6. Slideshow.
7. Guest mode.
8. Notion household admin.
9. Kiosk PC setup guide: Chrome kiosk, auto-start on boot, screen sleeping overnight.

## Design

- Warm, calm and family-friendly. Readable from 2 metres, with large type.
- Night dimming from about 9pm to 6am.
- The kids' zone uses the PointPals characters and typography (Zain / Nunito Sans).
