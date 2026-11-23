/**
 * Which family is calling, and that family's private connection values.
 *
 * A screen proves who it is in one of two ways:
 *   1. Signed in to a family account: `Authorization: Bearer <Supabase JWT>`
 *      (plus `x-household-id` when the grown-up belongs to more than one
 *      family). The server checks the token with Supabase and the membership
 *      in household_members.
 *   2. The original shared hub key: `x-hub-key` = HUB_ACCESS_KEY. Kept so
 *      screens set up before accounts keep working. It always means the
 *      "home" family (HUB_HOME_HOUSEHOLD_ID).
 *
 * Connection values (iCal links, Notion token, Drive folder…) come from
 * household_secrets for that family, encrypted with HUB_SECRETS_KEY. The home
 * family also falls back to the Vercel env vars, so the Carlsons' existing
 * setup carries on with nothing to re-enter.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { json, requireHubKey } from "./_shared.js";

/** The connection values a family can set. Everything else is hub-wide. */
export const FAMILY_SECRETS = [
  "FAMILY_ICAL_URL",
  "BOOKINGS_ICAL_URL",
  "KIDS_ICAL_URL",
  "NOTION_TOKEN",
  "NOTION_DS_EXPENSES",
  "NOTION_DS_BILLS",
  "NOTION_DS_LIFE_ADMIN",
  "SLIDESHOW_DRIVE_FOLDER_ID",
] as const;
export type FamilySecret = (typeof FAMILY_SECRETS)[number];

export interface Family {
  householdId: string | null;
  userId: string | null;
  role: "owner" | "adult" | "hub-key";
  /** The family whose values live in Vercel env vars (the Carlsons). */
  isHome: boolean;
  secret: (name: FamilySecret) => Promise<string | undefined>;
}

/* ── Supabase (server) ──────────────────────────────────────────────── */

function secretKey(): string | undefined {
  if (process.env.SUPABASE_SECRET_KEY) return process.env.SUPABASE_SECRET_KEY;
  // The Supabase ↔ Vercel integration can provide SUPABASE_SECRET_KEYS as JSON.
  const raw = process.env.SUPABASE_SECRET_KEYS;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string") return parsed;
    if (Array.isArray(parsed)) return String(parsed[0]);
    if (parsed && typeof parsed === "object") return String(Object.values(parsed)[0]);
  } catch {
    /* a plain string */
  }
  return raw.split(",")[0].trim();
}

let admin: SupabaseClient | null | undefined;
export function adminDb(): SupabaseClient | null {
  if (admin !== undefined) return admin;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = secretKey();
  admin = url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  return admin;
}

/* ── Encryption for household_secrets ───────────────────────────────── */

function cryptoKey(): Buffer {
  const raw = process.env.HUB_SECRETS_KEY;
  if (!raw) throw Object.assign(new Error("HUB_SECRETS_KEY isn't set on the Vercel project yet."), { status: 503 });
  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", cryptoKey(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), ct.toString("base64")].join(".");
}

export function decryptSecret(stored: string): string {
  const [v, iv, tag, ct] = stored.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("Unreadable saved connection");
  const d = createDecipheriv("aes-256-gcm", cryptoKey(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}

/* ── Who is calling ─────────────────────────────────────────────────── */

const HOME = () => process.env.HUB_HOME_HOUSEHOLD_ID || null;

function makeFamily(householdId: string | null, userId: string | null, role: Family["role"]): Family {
  const isHome = role === "hub-key" || (!!householdId && householdId === HOME());
  let loaded: Promise<Map<string, string>> | undefined;
  const load = async () => {
    const db = adminDb();
    const map = new Map<string, string>();
    if (!db || !householdId) return map;
    const { data, error } = await db.from("household_secrets").select("name, value").eq("household_id", householdId);
    if (error) throw Object.assign(new Error(`Couldn't read this family's connections: ${error.message}`), { status: 502 });
    for (const row of data ?? []) {
      try {
        map.set(row.name as string, decryptSecret(row.value as string));
      } catch {
        /* skip a value encrypted under an old key */
      }
    }
    return map;
  };
  return {
    householdId,
    userId,
    role,
    isHome,
    secret: async (name) => {
      loaded ??= load();
      const saved = (await loaded).get(name);
      if (saved) return saved;
      return isHome ? process.env[name] || undefined : undefined;
    },
  };
}

/**
 * Works out the calling family, or returns a ready error response.
 * Use: `const f = await requireFamily(request); if (f instanceof Response) return f;`
 */
export async function requireFamily(request: Request): Promise<Family | Response> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";

  if (!token) {
    const denied = requireHubKey(request);
    if (denied) return denied;
    return makeFamily(HOME(), null, "hub-key");
  }

  const db = adminDb();
  if (!db) return json({ error: "Family accounts aren't set up on the server yet (SUPABASE_URL / SUPABASE_SECRET_KEY)." }, 503);

  const { data: user, error } = await db.auth.getUser(token);
  if (error || !user.user) return json({ error: "Please sign in again." }, 401);

  const { data: rows, error: mErr } = await db
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", user.user.id);
  if (mErr) return json({ error: mErr.message }, 502);
  if (!rows?.length) return json({ error: "This account isn't part of a family yet." }, 403);

  const wanted = request.headers.get("x-household-id");
  const row = wanted ? rows.find((r) => r.household_id === wanted) : rows[0];
  if (!row) return json({ error: "This account isn't part of that family." }, 403);

  return makeFamily(row.household_id as string, user.user.id, row.role as "owner" | "adult");
}

export function errorResponse(e: unknown, fallback = "Request failed"): Response {
  const status = (e as { status?: number }).status ?? 500;
  return json({ error: e instanceof Error ? e.message : fallback }, status);
}
