/**
 * Shared helpers for the hub's Vercel functions. Files starting with "_" are
 * not deployed as routes.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

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
  if (!expected) return json({ error: "Please sign in to your family account." }, 401);
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

/**
 * Sign a media URL so <img>/<video> tags can load it without the x-hub-key
 * header. The signature is an HMAC of `id.exp` under HUB_ACCESS_KEY (or
 * HUB_SECRETS_KEY when the shared key isn't used), good for
 * an hour; /api/slideshow-media verifies it.
 */
function signingKey(): string {
  return process.env.HUB_ACCESS_KEY || process.env.HUB_SECRETS_KEY || "";
}

export function signMediaUrl(id: string, ttlSeconds = 3600): string {
  const key = signingKey();
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = createHmac("sha256", key).update(`${id}.${exp}`).digest("hex");
  return `/api/slideshow-media?id=${encodeURIComponent(id)}&exp=${exp}&sig=${sig}`;
}

export function verifyMediaUrl(id: string, exp: number, sig: string): boolean {
  const key = signingKey();
  if (!key || !exp || !sig || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac("sha256", key).update(`${id}.${exp}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
