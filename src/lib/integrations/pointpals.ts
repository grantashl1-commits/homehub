/**
 * PointPals connector. A parent signs into PointPals' Supabase once per
 * device; the hub then reads the household's kids, chores and jars under
 * PointPals' own RLS, listens for live jar changes, and — only after a parent
 * approves a claim with the PIN — awards points exactly the way the PointPals
 * app does (point_events row + kid totals + family jar).
 */
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import { create } from "zustand";
import type { Chore } from "../types";
import { useHub } from "../store";

const URL = import.meta.env.VITE_POINTPALS_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_POINTPALS_SUPABASE_KEY as string | undefined;
export const pointpalsConfigured = !!(URL && KEY);

let client: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!pointpalsConfigured) throw new Error("PointPals isn't configured on this deployment.");
  client ??= createClient(URL!, KEY!, {
    auth: {
      storageKey: "homehub-pointpals-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}

export interface PPKid {
  id: string;
  name: string;
  color: string;
  avatarKey: string | null;
  currentPoints: number;
  allTimePoints: number;
  personalPool: number;
  personalTarget: number;
  personalReward: string | null;
}

export interface PPHousehold {
  id: string;
  name: string;
  sharedPool: number;
  rewardTarget: number;
  activeRewardName: string | null;
  activeRewardTarget: number | null;
  splitJarsEnabled: boolean;
  sharedJarEnabled: boolean;
  splitMode: "match" | "percentage";
  splitRatio: number;
}

interface PPState {
  ready: boolean;
  userId?: string;
  email?: string;
  household?: PPHousehold;
  kids: PPKid[];
  chores: Chore[];
  /** "kidId|choreName" for everything awarded today. */
  doneToday: Set<string>;
  error?: string;
}

export const usePointPals = create<PPState>(() => ({
  ready: !pointpalsConfigured,
  kids: [],
  chores: [],
  doneToday: new Set(),
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function mapKid(r: Row): PPKid {
  return {
    id: r.id,
    name: r.name,
    color: r.color ?? "sky",
    avatarKey: r.avatar_key ?? null,
    currentPoints: r.current_points ?? r.points ?? 0,
    allTimePoints: r.all_time_points ?? r.points ?? 0,
    personalPool: r.personal_pool ?? 0,
    personalTarget: r.personal_target ?? 0,
    personalReward: r.personal_reward ?? null,
  };
}

function mapHousehold(r: Row): PPHousehold {
  return {
    id: r.id,
    name: r.name,
    sharedPool: r.shared_pool ?? 0,
    rewardTarget: r.reward_target ?? 100,
    activeRewardName: r.active_reward_name ?? null,
    activeRewardTarget: r.active_reward_target ?? null,
    splitJarsEnabled: r.split_jars_enabled ?? false,
    sharedJarEnabled: r.shared_jar_enabled ?? true,
    splitMode: r.split_mode === "percentage" ? "percentage" : "match",
    splitRatio: r.split_ratio ?? 50,
  };
}

let channel: RealtimeChannel | null = null;
let started = false;
let reloadTimer: number | undefined;

export function startPointPals() {
  if (started || !pointpalsConfigured) return;
  started = true;
  const c = sb();
  void c.auth.getSession().then(({ data }) => {
    usePointPals.setState({ ready: true, userId: data.session?.user.id, email: data.session?.user.email });
    if (data.session) void loadBundle();
  });
  c.auth.onAuthStateChange((_e, session) => {
    usePointPals.setState({ userId: session?.user.id, email: session?.user.email });
  });
}

export async function pointpalsSignIn(email: string, password: string) {
  const { data, error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw error;
  usePointPals.setState({ userId: data.user.id, email: data.user.email, error: undefined });
  await loadBundle();
}

export async function pointpalsSignOut() {
  if (channel) await sb().removeChannel(channel);
  channel = null;
  await sb().auth.signOut();
  usePointPals.setState({ userId: undefined, email: undefined, household: undefined, kids: [], chores: [], doneToday: new Set() });
}

export async function loadBundle() {
  const c = sb();
  const uid = usePointPals.getState().userId;
  if (!uid) return;
  try {
    const { data: mem, error: memErr } = await c
      .from("household_members")
      .select("household_id")
      .eq("user_id", uid)
      .limit(1)
      .maybeSingle();
    if (memErr) throw memErr;
    if (!mem) throw new Error("This PointPals account isn't in a household yet.");
    const hid = mem.household_id as string;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [hh, kids, chores, events] = await Promise.all([
      c.from("households").select("*").eq("id", hid).single(),
      c.from("kids").select("*").eq("household_id", hid).order("created_at"),
      c.from("chores").select("*").eq("household_id", hid).order("created_at"),
      c
        .from("point_events")
        .select("kid_id,item_name,points,created_at")
        .eq("household_id", hid)
        .gte("created_at", start.toISOString()),
    ]);
    for (const r of [hh, kids, chores, events]) if (r.error) throw r.error;
    usePointPals.setState({
      household: mapHousehold(hh.data as Row),
      kids: (kids.data as Row[]).map(mapKid),
      chores: (chores.data as Row[]).map((r) => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        points: r.points ?? 1,
        memberIds: (r.assigned_kid_ids as string[] | null) ?? null,
        recurrence: r.recurrence ?? "none",
      })),
      doneToday: new Set(
        (events.data as Row[]).filter((e) => (e.points ?? 0) > 0).map((e) => `${e.kid_id}|${e.item_name}`),
      ),
      error: undefined,
    });
    linkByName();
    subscribe(hid);
    watchHabits();
    void syncHabitsToPointPals();
  } catch (e) {
    usePointPals.setState({ error: e instanceof Error ? e.message : String(e) });
  }
}

/**
 * Anyone in the hub family who isn't linked to a PointPals person yet is
 * linked to the one with the same name (Mum, Dad, Leo, Ruby…). The link is
 * saved on the member, so it syncs and can still be changed in Parent → Family.
 */
function linkByName() {
  const hub = useHub.getState();
  for (const [memberId, kidId] of matchByName(hub.members, usePointPals.getState().kids)) {
    hub.updateMember(memberId, { pointpalsKidId: kidId });
  }
}

/** [memberId, PointPals kid id] pairs for unlinked members whose name matches. */
export function matchByName(
  members: { id: string; name: string; pointpalsKidId?: string }[],
  kids: { id: string; name: string }[],
): [string, string][] {
  const norm = (s: string) => s.trim().toLowerCase();
  const valid = new Set(kids.map((k) => k.id));
  const taken = new Set(members.map((m) => m.pointpalsKidId).filter((id): id is string => !!id && valid.has(id)));
  const out: [string, string][] = [];
  for (const m of members) {
    if (m.pointpalsKidId && valid.has(m.pointpalsKidId)) continue;
    const match = kids.find((k) => !taken.has(k.id) && norm(k.name) === norm(m.name));
    if (match) {
      out.push([m.id, match.id]);
      taken.add(match.id);
    }
  }
  return out;
}

function subscribe(hid: string) {
  if (channel) return;
  const reload = () => {
    window.clearTimeout(reloadTimer);
    reloadTimer = window.setTimeout(() => void loadBundle(), 400);
  };
  channel = sb()
    .channel(`homehub-${hid}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "kids", filter: `household_id=eq.${hid}` }, reload)
    .on("postgres_changes", { event: "*", schema: "public", table: "households", filter: `id=eq.${hid}` }, reload)
    .on("postgres_changes", { event: "*", schema: "public", table: "point_events", filter: `household_id=eq.${hid}` }, reload)
    .subscribe();
}

/**
 * Award points the way PointPals' awardPoints does: insert a point_events
 * row, bump the kid's totals (and personal jar when split jars are on), and
 * add to the family jar. Reads fresh rows first so totals don't drift.
 */
export async function pointpalsAward(kidId: string, item: { name: string; icon: string; points: number }) {
  const c = sb();
  const uid = usePointPals.getState().userId;
  const hidKnown = usePointPals.getState().household?.id;
  if (!uid || !hidKnown) throw new Error("Connect PointPals first.");

  const [{ data: hhRow, error: hhErr }, { data: kidRow, error: kidErr }] = await Promise.all([
    c.from("households").select("*").eq("id", hidKnown).single(),
    c.from("kids").select("*").eq("id", kidId).single(),
  ]);
  if (hhErr) throw hhErr;
  if (kidErr) throw kidErr;
  const hh = mapHousehold(hhRow as Row);
  const kid = mapKid(kidRow as Row);

  let shared: number;
  let personal: number;
  if (!hh.splitJarsEnabled) {
    shared = item.points;
    personal = 0;
  } else if (!hh.sharedJarEnabled) {
    shared = 0;
    personal = item.points;
  } else if (hh.splitMode === "match") {
    shared = item.points;
    personal = item.points;
  } else {
    shared = Math.floor((item.points * hh.splitRatio) / 100);
    personal = item.points - shared;
  }

  const batchId = crypto.randomUUID();
  const { error: evErr } = await c.from("point_events").insert({
    household_id: hh.id,
    kid_id: kidId,
    item_name: item.name,
    item_icon: item.icon,
    points: item.points,
    batch_id: batchId,
    awarded_by: uid,
  });
  if (evErr) throw evErr;

  const kidPatch: Row = {
    current_points: Math.max(0, kid.currentPoints + item.points),
    all_time_points: Math.max(0, kid.allTimePoints + item.points),
  };
  if (hh.splitJarsEnabled) kidPatch.personal_pool = Math.max(0, kid.personalPool + personal);

  const [k, h] = await Promise.all([
    c.from("kids").update(kidPatch).eq("id", kidId),
    c.from("households").update({ shared_pool: Math.max(0, hh.sharedPool + shared) }).eq("id", hh.id),
  ]);
  if (k.error) throw k.error;
  if (h.error) throw h.error;
  await loadBundle();
}

/* ── Habits ⇄ PointPals ────────────────────────────────────────────────── */

/**
 * Draws a new icon with PointPals' own generator (the `generate-icon` edge
 * function: Gemini in the PointPals house style, white knocked out). The icon
 * lands in the family's PointPals icon library too. PointPals allows each
 * household 10 a month.
 */
export async function pointpalsGenerateIcon(prompt: string): Promise<{ url: string; remaining?: number }> {
  const hid = usePointPals.getState().household?.id;
  if (!usePointPals.getState().userId || !hid) throw new Error("Connect PointPals in Parent → Connections to make pictures.");
  const { data, error } = await sb().functions.invoke("generate-icon", { body: { householdId: hid, prompt } });
  if (error) {
    // Supabase wraps non-2xx replies; dig the message out of the response body.
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    if (body?.error === "monthly_limit_reached") throw new Error(`That's all ${body.cap} PointPals pictures for this month. Pick an emoji for now.`);
    throw new Error(body?.error ?? error.message ?? "Couldn't make a picture");
  }
  if (!data?.url) throw new Error(data?.error ?? "Couldn't make a picture");
  return { url: data.url as string, remaining: data.remaining as number | undefined };
}

/**
 * Makes sure a hub habit exists in PointPals as a positive skill assigned to
 * that child (reusing one with the same name). Returns the skill id.
 */
export async function pointpalsEnsureSkill(kidId: string, habit: { title: string; icon: string }): Promise<string> {
  const c = sb();
  const st = usePointPals.getState();
  const hid = st.household?.id;
  if (!st.userId || !hid) throw new Error("Connect PointPals first.");
  const { data: existing, error } = await c.from("skills").select("id,name,assigned_kid_ids").eq("household_id", hid);
  if (error) throw error;
  const same = (existing as Row[]).find((s) => String(s.name).trim().toLowerCase() === habit.title.trim().toLowerCase());
  if (same) {
    const ids = (same.assigned_kid_ids as string[] | null) ?? null;
    // null means "everyone" in PointPals, so only narrow lists need the kid added.
    if (ids && !ids.includes(kidId)) {
      const { error: upErr } = await c.from("skills").update({ assigned_kid_ids: [...ids, kidId] }).eq("id", same.id);
      if (upErr) throw upErr;
    }
    return same.id as string;
  }
  const kid = st.kids.find((k) => k.id === kidId);
  const { data: row, error: insErr } = await c
    .from("skills")
    .insert({ household_id: hid, name: habit.title.slice(0, 60), icon: habit.icon, color: kid?.color ?? "sky", points: 1, is_positive: true, assigned_kid_ids: [kidId] })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return (row as Row).id as string;
}

/**
 * A habit done today drops a marble in PointPals, once per habit per day
 * (skipped if PointPals already has today's award for it).
 */
export async function pointpalsAwardHabit(kidId: string, habit: { title: string; icon: string }): Promise<boolean> {
  const st = usePointPals.getState();
  if (!st.userId || !st.household) return false;
  if (st.doneToday.has(`${kidId}|${habit.title}`)) return false;
  await pointpalsAward(kidId, { name: habit.title, icon: habit.icon, points: 1 });
  return true;
}

let syncing = false;
let again = false;
const inFlight = new Set<string>();

/**
 * Every active hub habit of a PointPals-linked person gets a PointPals skill,
 * whichever screen or device added it. Runs after PointPals loads and
 * whenever the hub's habits change.
 */
export async function syncHabitsToPointPals() {
  const st = usePointPals.getState();
  if (!st.userId || !st.household) return;
  if (syncing) {
    again = true;
    return;
  }
  syncing = true;
  try {
    const hub = useHub.getState();
    const linked = new Map(hub.members.filter((m) => m.pointpalsKidId).map((m) => [m.id, m.pointpalsKidId!]));
    for (const h of hub.habits) {
      const kidId = linked.get(h.memberId);
      if (!h.active || h.pointpalsSkillId || !kidId || inFlight.has(h.id)) continue;
      inFlight.add(h.id);
      try {
        const skillId = await pointpalsEnsureSkill(kidId, h);
        useHub.getState().updateHabit(h.id, { pointpalsSkillId: skillId });
      } catch (e) {
        console.warn("PointPals habit sync failed", e);
      } finally {
        inFlight.delete(h.id);
      }
    }
  } finally {
    syncing = false;
    if (again) {
      again = false;
      void syncHabitsToPointPals();
    }
  }
}

/** Renames or re-pictures the PointPals skill when the habit is edited on the hub. */
export async function pointpalsUpdateSkill(skillId: string, patch: { title: string; icon: string }) {
  if (!usePointPals.getState().userId) return;
  const { error } = await sb().from("skills").update({ name: patch.title.slice(0, 60), icon: patch.icon }).eq("id", skillId);
  if (error) throw error;
}

let habitWatch: (() => void) | null = null;
function watchHabits() {
  if (habitWatch) return;
  let last = useHub.getState().habits;
  habitWatch = useHub.subscribe((s) => {
    if (s.habits === last) return;
    last = s.habits;
    void syncHabitsToPointPals();
  });
}
