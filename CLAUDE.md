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
