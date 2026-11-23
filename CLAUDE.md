# Home Hub

A New Zealand family kitchen screen (PWA): jobs and jars, fridge notes,
dinnertime reflection, meals, shopping list, calendar with NZ school terms,
and a parent area. Runs on an iPad or Chromebook on the bench now, a 24"
wall screen later.

Read these first:
- [`docs/BRIEF.md`](docs/BRIEF.md): what it's for (original brief).
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): how it's built and where data lives.
- [`docs/SETUP.md`](docs/SETUP.md): env vars and connecting SIGNAL, PointPals, Google, Notion.
- [`docs/ACCOUNTS.md`](docs/ACCOUNTS.md): family sign-in, sync, and how another family connects their data.
- [`docs/PROGRESS.md`](docs/PROGRESS.md): what's done. Update it after each piece of work.

## Stack

- Vite + React 19 + TypeScript, Tailwind CSS v4, shadcn-style components in `src/components/ui.tsx`
- `motion` (motion/react) for animation, `zustand` for state, `idb-keyval` for media blobs
- React Router; `vite-plugin-pwa`; Vercel functions in `/api` (Web `Request → Response` handlers)

## Commands

- `npm run dev`: dev server (also serves `/api/*` from `.env.local`)
- `npm run build`: type-check (`tsc -b`) and production build

## Conventions

- `@/` maps to `src/`. Sizes are in `rem`; the root font scales with the
  screen, so 1.5rem body text is about 24px on the iPad.
- Kid-facing: picture first, big targets (88px+), read-aloud, kind tone.
- Zustand selectors must return stable values: use `useShallow` for
  filtered arrays and module-level empty constants instead of `[]`.
- Never commit `.env*` files or secrets. Server secrets live in Vercel env
  vars; `/api` functions check `HUB_ACCESS_KEY`.
- PointPals and SIGNAL are live apps: the hub reads and writes their data
  through their own Supabase RLS. Don't change their schemas from here.

- Family-specific server values go through `family.secret()` from
  `requireFamily()` in `api/_family.ts`, never straight from `process.env`.

## Supabase (hub project: family accounts and sync)

- Project ref: `wpbvrjogeannuqshghnb`. Use the new publishable/secret keys
  (`VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEYS`), never legacy keys.
