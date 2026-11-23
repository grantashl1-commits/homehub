/**
 * Shared helpers for the hub's Vercel functions. Files starting with "_" are
 * not deployed as routes.
 */
import { createHash, timingSafeEqual } from "node:crypto";

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Family data: never cache on a shared CDN.
      "cache-control": "private, no-store",
      ...headers,
    },
  });
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/**
 * Every hub function needs the device's access key (HUB_ACCESS_KEY). Returns
 * a ready error response, or null when the key is right.
 */
export function requireHubKey(request: Request): Response | null {
  const expected = process.env.HUB_ACCESS_KEY;
  if (!expected) return json({ error: "HUB_ACCESS_KEY isn't set on the Vercel project yet." }, 503);
  const got = request.headers.get("x-hub-key") ?? "";
  if (!got || !timingSafeEqual(digest(got), digest(expected))) {
    return json({ error: "That hub access key isn't right." }, 401);
  }
  return null;
}

/** Today's date in New Zealand as YYYY-MM-DD (the server runs in UTC). */
export function nzToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(new Date());
}

export function addDaysToKey(key: string, days: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
