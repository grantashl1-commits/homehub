/**
 * POST /api/calendar-events  { title, date, start?, end?, allDay?, location? }
 * Writes an event into the family Google Calendar using a service account, so
 * approving a kid's event lands it straight in Google. Needs
 * GOOGLE_SERVICE_ACCOUNT_JSON (base64 of the service-account key) and
 * FAMILY_CALENDAR_ID on the Vercel project, plus the x-hub-key header.
 *
 * No heavy SDK: signs a JWT with node:crypto, swaps it for an OAuth token at
 * Google, then calls the Calendar API with fetch.
 */
import { createSign } from "node:crypto";
import { json, requireHubKey } from "./_shared.js";

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

function b64url(s: string): string {
  return Buffer.from(s).toString("base64url");
}

/** RS256 JWT for Google's service-account flow. */
function signJwt(privateKey: string, claims: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(claims));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${body}`);
  return `${header}.${body}.${signer.sign(privateKey, "base64url")}`;
}

async function accessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(sa.private_key, {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  if (!res.ok || !data.access_token) throw new Error(data.error_description ?? `Token request failed (${res.status})`);
  return data.access_token;
}

/** The Pacific/Auckland UTC offset ("+13:00" or "+12:00") for a local date. */
function nzOffset(date: string): string {
  const probe = new Date(`${date}T12:00:00+12:00`);
  const name =
    new Intl.DateTimeFormat("en-US", { timeZone: "Pacific/Auckland", timeZoneName: "longOffset" })
      .formatToParts(probe)
      .find((p) => p.type === "timeZoneName")?.value ?? "GMT+12:00";
  return name.replace("GMT", "");
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface Body {
  title?: string;
  date?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
  location?: string;
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireHubKey(request);
  if (denied) return denied;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return json({ error: "GOOGLE_SERVICE_ACCOUNT_JSON isn't set on the Vercel project yet." }, 503);
  const calendarId = process.env.FAMILY_CALENDAR_ID;
  if (!calendarId) return json({ error: "FAMILY_CALENDAR_ID isn't set on the Vercel project yet." }, 503);

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: "Expected JSON" }, 400);
  }
  const title = String(body.title ?? "").trim().slice(0, 200);
  const date = body.date ?? "";
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: "Need a title and a date" }, 400);
  const allDay = !!body.allDay || (!body.start && !body.end);
  const startTime = /^\d{1,2}:\d{2}$/.test(body.start ?? "") ? body.start!.padStart(5, "0") : null;
  const endTime = /^\d{1,2}:\d{2}$/.test(body.end ?? "") ? body.end!.padStart(5, "0") : null;
  const location = String(body.location ?? "").trim().slice(0, 200) || undefined;

  let start: Record<string, string>;
  let end: Record<string, string>;
  if (allDay) {
    start = { date };
    end = { date: addDays(date, 1) };
  } else {
    const st = startTime ?? "18:00";
    const en = endTime ?? "19:00";
    const off = nzOffset(date);
    start = { dateTime: `${date}T${st}:00${off}`, timeZone: "Pacific/Auckland" };
    end = { dateTime: `${date}T${en}:00${off}`, timeZone: "Pacific/Auckland" };
  }

  try {
    const sa: ServiceAccount = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (!sa.client_email || !sa.private_key) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key.");
    const token = await accessToken(sa);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          summary: title,
          ...(location ? { location } : {}),
          start,
          end,
        }),
      },
    );
    const data = (await res.json().catch(() => ({}))) as { id?: string; htmlLink?: string; error?: { message?: string } };
    if (!res.ok) return json({ error: data.error?.message ?? `Calendar said ${res.status}` }, 502);
    return json({ ok: true, id: data.id, htmlLink: data.htmlLink });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Couldn't write the event" }, 502);
  }
}
