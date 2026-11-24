/**
 * /api/google-tasks: the family's Google Tasks (the "Task" option in Google
 * Calendar). Google doesn't put tasks in the calendar's iCal feed, so a grown-up
 * connects their Google account once and the hub keeps a refresh token,
 * encrypted, in that family's household_secrets (GOOGLE_TASKS_REFRESH_TOKEN).
 *
 *   GET                          → { connected, tasks: [{ id, listId, list, title, notes, due, updated, link }] }
 *   GET  ?code=…&state=…          Google's redirect after the grown-up says yes; saves the token
 *   POST { action: "connect" }    → { url } to send the grown-up to Google's consent screen
 *   POST { action: "complete", listId, id } → marks the task done in Google
 *   POST { action: "disconnect" } → forgets the token
 *
 * Needs GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET on Vercel (a Google
 * Cloud "Web application" OAuth client with this file's URL as a redirect URI).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { json } from "./_shared.js";
import { adminDb, encryptSecret, errorResponse, requireFamily } from "./_family.js";

const SCOPE = "https://www.googleapis.com/auth/tasks";
const SECRET = "GOOGLE_TASKS_REFRESH_TOKEN" as const;

function client() {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  return id && secret ? { id, secret } : null;
}

function stateKey(): string {
  return process.env.HUB_SECRETS_KEY || process.env.HUB_ACCESS_KEY || "";
}

/** Signs "householdId.userId.expiry" so the redirect back can only save to the family that asked. */
export function signState(householdId: string, userId: string, now = Date.now()): string {
  const body = `${householdId}.${userId}.${Math.floor(now / 1000) + 900}`;
  const sig = createHmac("sha256", stateKey()).update(body).digest("hex");
  return Buffer.from(`${body}.${sig}`).toString("base64url");
}

export function readState(state: string, now = Date.now()): { householdId: string; userId: string } | null {
  const raw = Buffer.from(state, "base64url").toString("utf8");
  const parts = raw.split(".");
  if (parts.length !== 4 || !stateKey()) return null;
  const [householdId, userId, exp, sig] = parts;
  if (Number(exp) < Math.floor(now / 1000)) return null;
  const want = createHmac("sha256", stateKey()).update(`${householdId}.${userId}.${exp}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b) ? { householdId, userId } : null;
}

const redirectUri = (request: Request) => `${new URL(request.url).origin}/api/google-tasks`;

const tokens = new Map<string, { token: string; exp: number }>();

async function accessToken(refresh: string): Promise<string> {
  const hit = tokens.get(refresh);
  if (hit && hit.exp > Date.now() + 60_000) return hit.token;
  const c = client();
  if (!c) throw Object.assign(new Error("Google Tasks isn't set up on the server yet (GOOGLE_OAUTH_CLIENT_ID / SECRET)."), { status: 503 });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.id, client_secret: c.secret, refresh_token: refresh, grant_type: "refresh_token" }),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) {
    throw Object.assign(new Error(data.error === "invalid_grant" ? "Google Tasks needs connecting again in Parent → Connections." : "Google wouldn't give a Tasks token."), { status: 502 });
  }
  tokens.set(refresh, { token: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 });
  return data.access_token;
}

async function google<T>(token: string, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/${path}`, {
    method: init.method ?? "GET",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw Object.assign(new Error(data.error?.message ?? `Google Tasks said ${res.status}`), { status: 502 });
  return data;
}

interface GTask {
  id: string;
  title?: string;
  notes?: string;
  due?: string;
  status?: string;
  updated?: string;
  webViewLink?: string;
  deleted?: boolean;
  hidden?: boolean;
}

export interface HubTask {
  id: string;
  listId: string;
  list: string;
  title: string;
  notes: string | null;
  /** YYYY-MM-DD (Google keeps tasks' dates as whole days). */
  due: string | null;
  updated: string | null;
  link: string | null;
}

export function toHubTask(t: GTask, list: { id: string; title?: string }): HubTask | null {
  if (t.deleted || t.hidden || t.status === "completed" || !t.title?.trim()) return null;
  return {
    id: t.id,
    listId: list.id,
    list: list.title ?? "Tasks",
    title: t.title.trim(),
    notes: t.notes?.trim() || null,
    due: t.due ? t.due.slice(0, 10) : null,
    updated: t.updated ?? null,
    link: t.webViewLink ?? null,
  };
}

async function saveToken(householdId: string, userId: string | null, value: string | null) {
  const db = adminDb();
  if (!db) throw Object.assign(new Error("Family accounts aren't set up on the server yet."), { status: 503 });
  const q = value
    ? db.from("household_secrets").upsert({ household_id: householdId, name: SECRET, value: encryptSecret(value), updated_by: userId, updated_at: new Date().toISOString() })
    : db.from("household_secrets").delete().eq("household_id", householdId).eq("name", SECRET);
  const { error } = await q;
  if (error) throw Object.assign(new Error(error.message), { status: 502 });
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Google sending the grown-up back after they said yes (or no).
  if (url.searchParams.has("state")) {
    const back = (msg: string) => Response.redirect(`${url.origin}/parent?google=${encodeURIComponent(msg)}`, 302);
    const who = readState(url.searchParams.get("state") ?? "");
    const code = url.searchParams.get("code");
    const c = client();
    if (!who || !code || !c) return back(url.searchParams.get("error") ?? "failed");
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: c.id, client_secret: c.secret, redirect_uri: redirectUri(request), grant_type: "authorization_code" }),
      });
      const data = (await res.json().catch(() => ({}))) as { refresh_token?: string };
      if (!res.ok || !data.refresh_token) return back("no-token");
      await saveToken(who.householdId, who.userId, data.refresh_token);
      return back("connected");
    } catch {
      return back("failed");
    }
  }

  const family = await requireFamily(request);
  if (family instanceof Response) return family;
  try {
    const refresh = await family.secret(SECRET);
    if (!refresh) return json({ connected: false, configured: !!client(), tasks: [] });
    const token = await accessToken(refresh);
    const lists = await google<{ items?: { id: string; title?: string }[] }>(token, "users/@me/lists?maxResults=100");
    const all = await Promise.all(
      (lists.items ?? []).map(async (l) => {
        const r = await google<{ items?: GTask[] }>(token, `lists/${encodeURIComponent(l.id)}/tasks?showCompleted=false&showHidden=false&maxResults=100`);
        return (r.items ?? []).map((t) => toHubTask(t, l)).filter((t): t is HubTask => !!t);
      }),
    );
    const tasks = all.flat().sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || (b.updated ?? "").localeCompare(a.updated ?? ""));
    return json({ connected: true, configured: true, tasks });
  } catch (e) {
    return errorResponse(e, "Couldn't read Google Tasks");
  }
}

export async function POST(request: Request): Promise<Response> {
  const family = await requireFamily(request);
  if (family instanceof Response) return family;
  let body: { action?: string; listId?: string; id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Expected JSON" }, 400);
  }
  try {
    if (body.action === "connect" || body.action === "disconnect") {
      if (family.role === "hub-key" || !family.householdId || !family.userId) {
        return json({ error: "Sign in to your family account (Parent → Family account) to connect Google Tasks." }, 403);
      }
      if (body.action === "disconnect") {
        await saveToken(family.householdId, family.userId, null);
        return json({ ok: true });
      }
      const c = client();
      if (!c) return json({ error: "Google Tasks isn't set up on the server yet: add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in Vercel." }, 503);
      if (!stateKey()) return json({ error: "HUB_SECRETS_KEY isn't set on the server." }, 503);
      const q = new URLSearchParams({
        client_id: c.id,
        redirect_uri: redirectUri(request),
        response_type: "code",
        scope: SCOPE,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
        state: signState(family.householdId, family.userId),
      });
      return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${q}` });
    }
    if (body.action === "complete") {
      const listId = String(body.listId ?? "");
      const id = String(body.id ?? "");
      if (!/^[\w-]{4,200}$/.test(listId) || !/^[\w-]{4,200}$/.test(id)) return json({ error: "Bad task" }, 400);
      const refresh = await family.secret(SECRET);
      if (!refresh) return json({ error: "Google Tasks isn't connected." }, 503);
      const token = await accessToken(refresh);
      await google(token, `lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(id)}`, { method: "PATCH", body: { status: "completed" } });
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return errorResponse(e, "Google Tasks request failed");
  }
}
