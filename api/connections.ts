/**
 * /api/connections: a family's own private connection values.
 *   GET    → which values are set (names and where they come from, never the values)
 *   PUT    { name, value } → save one (encrypted into household_secrets)
 *   DELETE { name }        → remove one
 * Needs a signed-in grown-up (Bearer token). Saving a Notion token also looks
 * up the family's Expenses / Bills / Life Admin databases by name.
 */
import { json } from "./_shared.js";
import { FAMILY_SECRETS, adminDb, encryptSecret, errorResponse, requireFamily, type Family, type FamilySecret } from "./_family.js";
import { discoverNotionSources } from "./notion.js";

const isName = (n: unknown): n is FamilySecret => typeof n === "string" && (FAMILY_SECRETS as readonly string[]).includes(n);

function check(name: FamilySecret, value: string): string | null {
  if (!value || value.length > 4000) return "That doesn't look right.";
  if (name.endsWith("_ICAL_URL") && !/^(https|webcal):\/\/\S+$/i.test(value)) return "Paste the calendar's secret address in iCal format (it starts with https://).";
  if (name === "NOTION_TOKEN" && !/^(ntn_|secret_)\S{20,}$/.test(value)) return "A Notion internal integration secret starts with ntn_.";
  if (name.startsWith("NOTION_DS_") && !/^[0-9a-f-]{32,36}$/i.test(value)) return "That isn't a Notion data source id.";
  if (name === "SLIDESHOW_DRIVE_FOLDER_ID" && !/^[\w-]{10,100}$/.test(value)) return "Copy the id from the folder's link (after /folders/).";
  return null;
}

async function save(f: Family, name: FamilySecret, value: string) {
  const db = adminDb()!;
  const { error } = await db.from("household_secrets").upsert({
    household_id: f.householdId,
    name,
    value: encryptSecret(value),
    updated_by: f.userId,
    updated_at: new Date().toISOString(),
  });
  if (error) throw Object.assign(new Error(error.message), { status: 502 });
}

async function writable(request: Request): Promise<Family | Response> {
  const f = await requireFamily(request);
  if (f instanceof Response) return f;
  if (f.role === "hub-key" || !f.householdId) return json({ error: "Sign in to your family account to change connections." }, 403);
  if (!adminDb()) return json({ error: "Family accounts aren't set up on the server yet." }, 503);
  return f;
}

export async function GET(request: Request): Promise<Response> {
  const f = await requireFamily(request);
  if (f instanceof Response) return f;
  try {
    const db = adminDb();
    const saved = new Set<string>();
    if (db && f.householdId) {
      const { data } = await db.from("household_secrets").select("name").eq("household_id", f.householdId);
      for (const r of data ?? []) saved.add(r.name as string);
    }
    const items = FAMILY_SECRETS.map((name) => ({
      name,
      source: saved.has(name) ? "family" : f.isHome && process.env[name] ? "vercel" : null,
    }));
    return json({
      householdId: f.householdId,
      isHome: f.isHome,
      items,
      // What the hub itself provides for every family.
      hub: {
        slideshowServiceAccount: serviceAccountEmail(),
        snap: !!process.env.ANTHROPIC_API_KEY && (f.isHome || process.env.SNAP_FOR_ALL_FAMILIES === "true"),
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(request: Request): Promise<Response> {
  const f = await writable(request);
  if (f instanceof Response) return f;
  let body: { name?: unknown; value?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Expected JSON" }, 400);
  }
  if (!isName(body.name)) return json({ error: "Unknown connection" }, 400);
  const value = String(body.value ?? "").trim();
  const problem = check(body.name, value);
  if (problem) return json({ error: problem }, 400);
  try {
    await save(f, body.name, value);
    let found: Record<string, string> | undefined;
    if (body.name === "NOTION_TOKEN") {
      found = await discoverNotionSources(value).catch(() => undefined);
      for (const [k, v] of Object.entries(found ?? {})) await save(f, k as FamilySecret, v);
    }
    return json({ ok: true, notionFound: found ? Object.keys(found) : undefined });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const f = await writable(request);
  if (f instanceof Response) return f;
  let body: { name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Expected JSON" }, 400);
  }
  if (!isName(body.name)) return json({ error: "Unknown connection" }, 400);
  const { error } = await adminDb()!.from("household_secrets").delete().eq("household_id", f.householdId!).eq("name", body.name);
  if (error) return json({ error: error.message }, 502);
  return json({ ok: true });
}

function serviceAccountEmail(): string | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return (JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as { client_email?: string }).client_email ?? null;
  } catch {
    return null;
  }
}
