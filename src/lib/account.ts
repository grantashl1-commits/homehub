/**
 * Family accounts, in the hub's own Supabase project.
 *
 * A grown-up signs in (email + password). Their sign-in belongs to a
 * household (one family). The hub's own data (family, notes, habits,
 * reflections, jars, settings…) is saved to that household's `hub_state` row
 * and kept in step across every screen and phone that's signed in to it.
 *
 * Local-first stays: the screen still reads and writes useHub instantly and
 * works offline. This module just copies changes up (debounced) and pulls
 * other screens' changes down (realtime + on wake). Last save wins.
 *
 * Kept on each screen only (never synced): the device settings below, and
 * media blobs (voice notes, doodles, photos) in IndexedDB.
 */
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { create } from "zustand";
import { useHub, type HubState } from "./store";
import type { Settings } from "./types";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const accountsConfigured = !!(URL && KEY);

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!accountsConfigured) throw new Error("Family accounts aren't set up on this deployment yet.");
  client ??= createClient(URL!, KEY!, {
    auth: { storageKey: "homehub-account-auth", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

/* ── What syncs ─────────────────────────────────────────────────────── */

const SYNCED_KEYS = [
  "settings",
  "members",
  "notes",
  "habits",
  "checkins",
  "nights",
  "claims",
  "localChores",
  "marbles",
  "familyJar",
  "localList",
  "listCounts",
  "kidPlans",
  "mealHearts",
  "localDinners",
  "photos",
  "doneTasks",
  "reflections",
] as const satisfies readonly (keyof HubState)[];

/** Settings that belong to one screen, not the family. */
const DEVICE_SETTINGS = [
  "hubKey",
  "guestMode",
  "keepAwake",
  "reducedMotion",
  "sounds",
  "idleHomeMins",
  "screensaverMins",
] as const satisfies readonly (keyof Settings)[];

type Doc = Partial<Pick<HubState, (typeof SYNCED_KEYS)[number]>>;

function snapshot(s: HubState): Doc {
  const doc: Record<string, unknown> = {};
  for (const k of SYNCED_KEYS) doc[k] = s[k];
  const settings: Record<string, unknown> = { ...s.settings };
  for (const k of DEVICE_SETTINGS) delete settings[k];
  doc.settings = settings;
  return doc as Doc;
}

function isEmpty(doc: unknown): boolean {
  return !doc || typeof doc !== "object" || Object.keys(doc).length === 0;
}

/* ── Account state ──────────────────────────────────────────────────── */

export interface HouseholdRef {
  id: string;
  name: string;
  role: "owner" | "adult";
}

export type SyncStatus = "off" | "loading" | "saving" | "saved" | "offline" | "error";

interface AccountState {
  ready: boolean;
  userId?: string;
  email?: string;
  households: HouseholdRef[];
  household?: HouseholdRef;
  sync: SyncStatus;
  syncedAt?: number;
  error?: string;
}

export const useAccount = create<AccountState>(() => ({
  ready: !accountsConfigured,
  households: [],
  sync: "off",
}));

const HOUSEHOLD_PICK = "homehub-household";

function deviceId(): string {
  try {
    let id = localStorage.getItem("homehub-device");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("homehub-device", id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

/** The signed-in access token, for calling the hub's /api functions. */
export async function accessToken(): Promise<string | undefined> {
  if (!accountsConfigured) return undefined;
  const { data } = await sb().auth.getSession();
  return data.session?.access_token;
}

let started = false;
export function startAccount() {
  if (started || !accountsConfigured) return;
  started = true;
  const c = sb();
  void c.auth.getSession().then(async ({ data }) => {
    if (data.session) await onSignedIn(data.session.user.id, data.session.user.email);
    useAccount.setState({ ready: true });
  });
  c.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      stopSync();
      useAccount.setState({ userId: undefined, email: undefined, households: [], household: undefined, sync: "off" });
    } else if (session && session.user.id !== useAccount.getState().userId) {
      // Defer: Supabase warns against awaiting its calls inside this callback.
      window.setTimeout(() => void onSignedIn(session.user.id, session.user.email), 0);
    }
  });
}

async function onSignedIn(userId: string, email?: string) {
  useAccount.setState({ userId, email, error: undefined });
  await loadHouseholds();
}

async function loadHouseholds() {
  const { data, error } = await sb()
    .from("household_members")
    .select("role, households(id, name)")
    .eq("user_id", useAccount.getState().userId!);
  if (error) {
    useAccount.setState({ error: error.message });
    return;
  }
  const households: HouseholdRef[] = (data ?? []).flatMap((r) => {
    const h = r.households as unknown as { id: string; name: string } | null;
    return h ? [{ id: h.id, name: h.name, role: r.role as HouseholdRef["role"] }] : [];
  });
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(HOUSEHOLD_PICK);
  } catch {
    /* private mode */
  }
  const household = households.find((h) => h.id === saved) ?? households[0];
  useAccount.setState({ households, household });
  if (household) await startSync(household);
}

export async function signIn(email: string, password: string) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "That email and password don't match." : error.message);
  await onSignedIn(data.user.id, data.user.email);
}

/** Returns false when Supabase wants the email confirmed first. */
export async function signUp(email: string, password: string): Promise<boolean> {
  const { data, error } = await sb().auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
  if (error) throw new Error(error.message);
  if (!data.session) return false;
  await onSignedIn(data.session.user.id, data.session.user.email);
  return true;
}

export async function resetPassword(email: string) {
  const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw new Error(error.message);
}

export async function signOut({ clearScreen = false } = {}) {
  stopSync();
  await sb().auth.signOut();
  if (clearScreen) {
    // A cleared screen must never upload its empty state over the family's.
    markDirty(null);
    useHub.getState().resetAll();
  }
}

export async function createFamily(name: string) {
  const { error } = await sb().rpc("create_household", { family_name: name.trim() || "Our Family" });
  if (error) throw new Error(error.message);
  await loadHouseholds();
}

export async function joinFamily(code: string) {
  const { error } = await sb().rpc("join_household", { invite_code: code.trim() });
  if (error) throw new Error(error.message);
  await loadHouseholds();
}

export async function createInvite(): Promise<string> {
  const h = useAccount.getState().household;
  if (!h) throw new Error("No family yet");
  const { data, error } = await sb().rpc("create_household_invite", { hid: h.id });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function switchFamily(id: string) {
  const h = useAccount.getState().households.find((x) => x.id === id);
  if (!h) return;
  try {
    localStorage.setItem(HOUSEHOLD_PICK, id);
  } catch {
    /* private mode */
  }
  useAccount.setState({ household: h });
  await startSync(h);
}

/* ── Sync ───────────────────────────────────────────────────────────── */

let channel: RealtimeChannel | null = null;
let unsubStore: (() => void) | null = null;
let saveTimer: number | undefined;
let revision = 0;
let applying = false;
let syncingId: string | undefined;

/** Survives a reload: this screen has changes the family copy hasn't got yet. */
const DIRTY = "homehub-sync-dirty";
function markDirty(id: string | null) {
  try {
    if (id) localStorage.setItem(DIRTY, id);
    else localStorage.removeItem(DIRTY);
  } catch {
    /* private mode */
  }
}
function dirtyFor(id: string): boolean {
  try {
    return localStorage.getItem(DIRTY) === id;
  } catch {
    return false;
  }
}

function apply(doc: Doc) {
  applying = true;
  try {
    useHub.setState((s) => {
      const device: Partial<Settings> = {};
      for (const k of DEVICE_SETTINGS) (device as Record<string, unknown>)[k] = s.settings[k];
      return {
        ...doc,
        settings: { ...s.settings, ...(doc.settings ?? {}), ...device },
      } as Partial<HubState>;
    });
  } finally {
    applying = false;
  }
}

async function pull(force = false) {
  const id = syncingId;
  if (!id) return;
  const { data, error } = await sb().from("hub_state").select("data, revision, updated_by_device").eq("household_id", id).maybeSingle();
  if (id !== syncingId) return;
  if (error) {
    useAccount.setState({ sync: navigator.onLine ? "error" : "offline", error: error.message });
    return;
  }
  if (!data) return;
  const remoteRev = Number(data.revision);
  if (isEmpty(data.data)) {
    // A brand-new family account: this screen's data becomes the family's.
    await save();
    return;
  }
  if (force || remoteRev > revision) {
    revision = remoteRev;
    if (force || data.updated_by_device !== deviceId()) apply(data.data as Doc);
  }
  useAccount.setState({ sync: "saved", syncedAt: Date.now(), error: undefined });
}

async function save() {
  const id = syncingId;
  if (!id) return;
  window.clearTimeout(saveTimer);
  saveTimer = undefined;
  useAccount.setState({ sync: "saving" });
  const { data, error } = await sb()
    .from("hub_state")
    .update({ data: snapshot(useHub.getState()), updated_by_device: deviceId() })
    .eq("household_id", id)
    .select("revision")
    .maybeSingle();
  if (id !== syncingId) return;
  if (error) {
    useAccount.setState({ sync: navigator.onLine ? "error" : "offline", error: error.message });
    // Try again soon; the change is safe on this screen meanwhile.
    saveTimer = window.setTimeout(() => void save(), 30_000);
    return;
  }
  if (data) revision = Number(data.revision);
  if (saveTimer === undefined) markDirty(null);
  useAccount.setState({ sync: "saved", syncedAt: Date.now(), error: undefined });
}

function onWake() {
  if (document.visibilityState === "visible") {
    if (saveTimer !== undefined) void save();
    else void pull();
  }
}

async function startSync(h: HouseholdRef) {
  stopSync();
  syncingId = h.id;
  revision = 0;
  useAccount.setState({ sync: "loading" });
  // Changes from just before a reload or going offline go up first, rather
  // than being replaced by the family copy.
  if (dirtyFor(h.id)) await save();
  else await pull(true);

  unsubStore = useHub.subscribe((state, prev) => {
    if (applying || !syncingId) return;
    if (SYNCED_KEYS.every((k) => state[k] === prev[k])) return;
    markDirty(syncingId);
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => void save(), 1200);
  });

  channel = sb()
    .channel(`hub_state:${h.id}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "hub_state", filter: `household_id=eq.${h.id}` }, (p) => {
      const row = p.new as { revision?: number; updated_by_device?: string };
      if (row.updated_by_device === deviceId()) return;
      if (Number(row.revision ?? 0) > revision) void pull();
    })
    .subscribe();

  document.addEventListener("visibilitychange", onWake);
  window.addEventListener("online", onWake);
}

function stopSync() {
  if (saveTimer !== undefined && syncingId) void save();
  window.clearTimeout(saveTimer);
  saveTimer = undefined;
  syncingId = undefined;
  unsubStore?.();
  unsubStore = null;
  if (channel) void sb().removeChannel(channel);
  channel = null;
  document.removeEventListener("visibilitychange", onWake);
  window.removeEventListener("online", onWake);
}

/**
 * Something that identifies who this screen talks to the hub's /api as:
 * the family's id when signed in, "key" with only the old shared hub key,
 * or null when neither. Use it in cache keys so families never share data.
 */
export function useHubAccess(): string | null {
  const household = useAccount((s) => s.household?.id);
  const hubKey = useHub((s) => s.settings.hubKey);
  return household ?? (hubKey ? "key" : null);
}

/* ── Shared media (voice notes, doodles, photos) ───────────────────── */

const MEDIA_BUCKET = "hub-media";

/** Copies a blob made on this screen to the family's storage, so other screens can play it. */
export async function uploadFamilyMedia(id: string, blob: Blob): Promise<void> {
  const h = useAccount.getState().household;
  if (!h || !accountsConfigured) return;
  const { error } = await sb().storage.from(MEDIA_BUCKET).upload(`${h.id}/${id}`, blob, { contentType: blob.type || undefined, upsert: true });
  if (error) throw error;
}

/** Fetches a blob another screen in the family made. Undefined if it isn't there. */
export async function downloadFamilyMedia(id: string): Promise<Blob | undefined> {
  const h = useAccount.getState().household;
  if (!h || !accountsConfigured) return undefined;
  const { data, error } = await sb().storage.from(MEDIA_BUCKET).download(`${h.id}/${id}`);
  if (error) {
    // Usually: the screen that made it hasn't shared it yet. Say so in the console rather than fail silently.
    console.warn(`Family media ${id} isn't in storage yet`, error.message);
    return undefined;
  }
  return data ?? undefined;
}

export async function removeFamilyMedia(id: string): Promise<void> {
  const h = useAccount.getState().household;
  if (!h || !accountsConfigured) return;
  await sb().storage.from(MEDIA_BUCKET).remove([`${h.id}/${id}`]);
}

