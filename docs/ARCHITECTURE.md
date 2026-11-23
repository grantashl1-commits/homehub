# Home Hub architecture

## Shape

- **Vite + React 19 + TypeScript + Tailwind v4 + shadcn-style components**,
  `motion` for animation, `zustand` for state, PWA via `vite-plugin-pwa`.
- **Local-first.** The hub's own data (family, notes, habits, reflections,
  claims, kid-added plans, photos, settings) lives on the device:
  `localStorage` for state and IndexedDB for voice notes, doodles and photos.
  The screen works instantly and offline.
- **Connected apps stay the source of truth for their own data.** The hub
  talks to them directly, with no changes needed to the live apps:

| Data | Source | How |
|---|---|---|
| Shopping list, meal plan, recipes | SIGNAL | Signs into SIGNAL's Supabase (publishable key + Mum's login). Reads/writes `shopping_lists.custom_items` and `checked_items` for the ISO week, and `user_plans` (`plan_data.kind = signal_custom_picks_v1`). Recipe library exported to `public/data/signal-recipes.json`. |
| Kids, chores, marbles, jars | PointPals | Signs into PointPals' Supabase as a parent. Reads `households`, `kids`, `chores`, today's `point_events`; listens to realtime changes. Approving a claim awards points exactly like PointPals' `awardPoints` (point_events row + kid totals + family jar, respecting split jars). |
| Family calendar | Google | `/api/calendar` (Vercel function) reads the private iCal links from env vars, expands recurring events with `ical.js`, and returns JSON. |
| Money, life admin | Notion "Home Hub" page | `/api/notion` reads Expenses / Bills / Life Admin (Notion API 2025-09-03 data sources) and writes quick-add expenses, paid bills and done tasks. |
| Snap a notice | Claude | `/api/snap` sends a photo to the Anthropic Messages API and gets back dated events. |
| Weather + UV | Open-Meteo | Direct from the browser, no key. |
| NZ terms & holidays | Built in | `src/lib/nz.ts` (Ministry of Education + Employment NZ dates, 2026–27). |

## Security

- Every `/api/*` function requires the `x-hub-key` header to match
  `HUB_ACCESS_KEY` (constant-time compare) and answers `Cache-Control: private, no-store`.
- The private calendar link, Notion token and Anthropic key never reach the browser.
- SIGNAL and PointPals sessions are normal Supabase logins under those apps' RLS.
- Parent PIN: PBKDF2 (120k iterations) hash on the device, 2-minute unlock,
  5-minute lockout after 5 wrong tries.
- Guest mode doesn't start the SIGNAL/PointPals connectors or show family
  data; leaving needs the PIN (hold the top-left corner).

## Next steps

- Sync hub data between screens and phones through the hub's own Supabase
  project (`wpbvrjogeannuqshghnb`): notes, habits, reflections, claims.
- Write kid-added and snapped events straight into a Google "Kids" calendar
  (needs OAuth or a service account; today a parent sends them with one tap).
- SIGNAL household habits, so family habits sync back into SIGNAL.
