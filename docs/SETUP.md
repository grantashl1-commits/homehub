# Setting up Home Hub

Everything works straight away with sample data on this screen. Each
connection below turns a part of it live. All secrets live in Vercel
environment variables, never in the code.

## 1. Vercel environment variables

Project → Settings → Environment Variables (Production and Preview). From VS
Code with the Vercel CLI linked you can also run `vercel env add NAME`.

| Variable | What it is | Where to find it |
|---|---|---|
| `HUB_ACCESS_KEY` | A long random password the screens use to call the hub's own functions | Run `openssl rand -hex 24`. Enter the same value on each screen in **Parent → Connections** |
| `FAMILY_ICAL_URL` | The family Google Calendar, read-only | Google Calendar → ⚙ → the family calendar → *Integrate calendar* → **Secret address in iCal format** |
| `BOOKINGS_ICAL_URL` (optional) | Airbnb bookings and cleans | Same, on the bookings calendar (grantashl1@gmail.com) |
| `KIDS_ICAL_URL` (optional) | A kids' calendar | Same |
| `NOTION_TOKEN` | Money and To-dos from the Notion "Home Hub" page | notion.so/profile/integrations → New internal integration "Home Hub" → copy the secret. Then on the Home Hub page: ••• → Connections → add Home Hub |
| `ANTHROPIC_API_KEY` | "Snap a notice": reads school newsletters into events | console.anthropic.com → API keys |
| `VITE_SIGNAL_SUPABASE_URL`, `VITE_SIGNAL_SUPABASE_KEY` | SIGNAL shopping list and meal plan | `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the signalnz project |
| `VITE_SIGNAL_SITE_URL` | Where SIGNAL's recipe photos live | `https://signal.mindcast.co.nz` |
| `VITE_POINTPALS_SUPABASE_URL`, `VITE_POINTPALS_SUPABASE_KEY` | PointPals jobs, marbles and jars | `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the point-pals-app project |

Redeploy after adding `VITE_*` variables (they're baked into the build).

> The private iCal link lets anyone who has it read the calendar. It only
> ever lives in Vercel; the hub's `/api/calendar` function reads it and
> checks `HUB_ACCESS_KEY` before answering. If the link has been shared
> anywhere else, reset it in Google Calendar ("Reset") and update Vercel.

## 2. On each screen (once)

1. Open the site, follow the welcome steps (family, characters, parent PIN).
2. **Parent → Connections**: paste the hub access key.
3. **SIGNAL**: sign in with your SIGNAL email and password. (If you signed up
   to SIGNAL with Google, set a password with "forgot password" first.)
4. **PointPals**: sign in as a parent, then **Family → Use PointPals kids** to
   link each child to their PointPals jar.
5. **Settings**: bin day, te reo, NZ school dates, night hours, Wi-Fi and
   guidebook for guest mode.

## 3. Local development

```bash
cp .env.example .env.local   # fill in what you have
npm install
npm run dev                  # the /api functions also run under Vite
```
