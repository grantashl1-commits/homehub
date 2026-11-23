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
    subscribe(hid);
  } catch (e) {
    usePointPals.setState({ error: e instanceof Error ? e.message : String(e) });
  }
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
