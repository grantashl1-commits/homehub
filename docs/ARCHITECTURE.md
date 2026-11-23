# Home Hub architecture

## Shape

- **Vite + React 19 + TypeScript + Tailwind v4 + shadcn-style components**,
  `motion` for animation, `zustand` for state, PWA via `vite-plugin-pwa`.
- **Local-first.** The hub's own data (family, notes, habits, reflections,
  claims, kid-added plans, photos, settings) lives on the device:
  `localStorage` for state and IndexedDB for voice notes, doodles and photos.
  The screen works instantly and offline.
- **Family accounts.** Grown-ups sign in to the hub's own Supabase project
  (`wpbvrjogeannuqshghnb`). The local state is copied to the family's
  `hub_state` row and kept in step across screens (realtime, last save wins).
  Each family's private connection values are encrypted in
  `household_secrets`, which only the `/api` functions can read. See
  [ACCOUNTS.md](ACCOUNTS.md).
- **Connected apps stay the source of truth for their own data.** The hub
  talks to them directly, with no changes needed to the live apps:

| Data | Source | How |
|---|---|---|
| Shopping list, meal plan, recipes | SIGNAL | Signs into SIGNAL's Supabase (publishable key + Mum's login). Reads/writes `shopping_lists.custom_items` and `checked_items` for the ISO week, and `user_plans` (`plan_data.kind = signal_custom_picks_v1`). Recipe library exported to `public/data/signal-recipes.json`. |
| Kids, chores, marbles, jars | PointPals | Signs into PointPals' Supabase as a parent. Reads `households`, `kids`, `chores`, today's `point_events`; listens to realtime changes. Approving a claim awards points exactly like PointPals' `awardPoints` (point_events row + kid totals + family jar, respecting split jars). |
| Family calendar | Google | `/api/calendar` (Vercel function) reads the family's private iCal links (saved in the app, or Vercel env vars for the home family), expands recurring events with `ical.js`, and returns JSON. |
| Money, life admin | Notion "Home Hub" page | `/api/notion` reads Expenses / Bills / Life Admin (Notion API 2025-09-03 data sources) and writes quick-add expenses, paid bills and done tasks. |
| Snap a notice | Claude | `/api/snap` sends a photo to the Anthropic Messages API and gets back dated events. |
| Weather + UV | Open-Meteo | Direct from the browser, no key. |
| NZ terms & holidays | Built in | `src/lib/nz.ts` (Ministry of Education + Employment NZ dates, 2026–27). |

## Security

- Every `/api/*` function calls `requireFamily()` (`api/_family.ts`): a
  Supabase access token checked with the server and the
  `household_members` table, or, for older screens, the `x-hub-key` header
  matching `HUB_ACCESS_KEY` (constant-time compare, home family only). Responses
  are `Cache-Control: private, no-store`.
- Family connection values are AES-256-GCM encrypted with `HUB_SECRETS_KEY`.
  RLS is on with no policies, and they're never returned to a browser.
- The private calendar link, Notion token and Anthropic key never reach the browser.
- SIGNAL and PointPals sessions are normal Supabase logins under those apps' RLS.
- Parent PIN: PBKDF2 (120k iterations) hash on the device, 2-minute unlock,
  5-minute lockout after 5 wrong tries.
- Guest mode doesn't start the SIGNAL/PointPals connectors or show family
  data; leaving needs the PIN (hold the top-left corner).

## Next steps

- Sync media (voice notes, doodles, photos) through Supabase Storage, and
  merge changes item by item instead of last-save-wins.
- Keep each family's SIGNAL and PointPals sign-ins with the family account.
- Write kid-added and snapped events straight into a Google "Kids" calendar
  (needs OAuth or a service account; today a parent sends them with one tap).
- SIGNAL household habits, so family habits sync back into SIGNAL.
