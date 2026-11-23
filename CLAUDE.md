# Home Hub

A fridge-style family touchscreen PWA for our kitchen. The full brief lives in [`docs/BRIEF.md`](docs/BRIEF.md).

## For agents

1. **Read `docs/BRIEF.md` before doing anything.** It is the source of truth.
2. Follow the **build order** in that brief. Do not skip ahead or start a later module first.
3. Do not build features that the current step does not call for.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4 + shadcn/ui (`components.json`, neutral base colour)
- React Router (`react-router-dom`)
- `vite-plugin-pwa` — built as a PWA, deployed to Vercel

## Commands

- `npm run dev` — dev server
- `npm run build` — type-check (`tsc -b`) and production build
- `npm run preview` — preview the production build
- `npx shadcn@latest add <component>` — add a shadcn/ui component

## Supabase

- Project ref: `wpbvrjogeannuqshghnb` (`https://wpbvrjogeannuqshghnb.supabase.co`).
- Use the **new** publishable/secret keys, not the legacy `anon`/`service_role` keys (retiring early 2027).
  - Client (Vite): `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`).
  - Backend (Supabase Edge Functions): `sb_secret_...` key, read from `SUPABASE_SECRET_KEYS` (JSON keyed by name) — never exposed to the browser.
- The secret key bypasses RLS and is server-only. Keys never go in source; use env vars.

## Conventions

- `@/` maps to `src/`.
- Routes: `/kiosk`, `/kids`, `/parent`, `/list`, `/guest`.
- **Never commit `.env` files or secrets.** Secrets belong in Supabase (edge functions proxy every third-party call), never in the client bundle.
- The dev `<nav>` in `src/components/Layout.tsx` is temporary; the kiosk UI should not show it.

## Design notes (from the brief)

- Warm, calm and family-friendly. Readable from 2 metres, large type, min 64px tap targets.
- Night dimming from about 9pm to 6am.
- Kids' zone uses PointPals characters and typography (Zain / Nunito Sans). Fonts should be self-hosted (the kiosk works offline).
- Proper PWA icons (192×192 and 512×512 PNG) are still needed for installability; `public/icon.svg` is a placeholder.
