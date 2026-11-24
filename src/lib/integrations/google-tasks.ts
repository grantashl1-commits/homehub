/**
 * The family's Google Tasks (the "Task" option in Google Calendar), read by
 * /api/google-tasks with a grown-up's one-time Google permission. They show on
 * the fridge as notes until someone peels them off, which ticks them off in
 * Google too.
 */
import { create } from "zustand";
import { useRemote } from "../useRemote";
import { cacheKey, hubFetch } from "./hub-api";
import { useHubAccess } from "../account";

export interface GoogleTask {
  id: string;
  listId: string;
  list: string;
  title: string;
  notes: string | null;
  due: string | null;
  updated: string | null;
  link: string | null;
}

interface TasksResponse {
  connected: boolean;
  configured: boolean;
  tasks: GoogleTask[];
}

/** Tasks peeled off on this screen, hidden straight away while Google catches up. */
const usePeeled = create<{ ids: Set<string> }>(() => ({ ids: new Set() }));
const NO_TASKS: GoogleTask[] = [];

export function useGoogleTasks() {
  const access = useHubAccess();
  const peeled = usePeeled((s) => s.ids);
  const remote = useRemote<TasksResponse>(
    access ? cacheKey("googletasks", access) : null,
    () => hubFetch<TasksResponse>("/api/google-tasks"),
    { intervalMs: 5 * 60_000 },
  );
  const tasks = (remote.data?.tasks ?? NO_TASKS).filter((t) => !peeled.has(t.id));
  return { tasks, connected: !!remote.data?.connected, configured: remote.data?.configured ?? true, error: access ? remote.error : undefined, refresh: remote.refresh };
}

export async function completeGoogleTask(t: GoogleTask): Promise<void> {
  usePeeled.setState((s) => ({ ids: new Set(s.ids).add(t.id) }));
  try {
    await hubFetch("/api/google-tasks", { method: "POST", body: JSON.stringify({ action: "complete", listId: t.listId, id: t.id }) });
  } catch (e) {
    usePeeled.setState((s) => {
      const ids = new Set(s.ids);
      ids.delete(t.id);
      return { ids };
    });
    throw e;
  }
}

export async function connectGoogleTasks(): Promise<void> {
  const { url } = await hubFetch<{ url: string }>("/api/google-tasks", { method: "POST", body: JSON.stringify({ action: "connect" }) });
  window.location.assign(url);
}

export async function disconnectGoogleTasks(): Promise<void> {
  await hubFetch("/api/google-tasks", { method: "POST", body: JSON.stringify({ action: "disconnect" }) });
}

/** "Due Thu 26 Nov" / "Due today" / "Overdue · Mon 23 Nov". */
export function dueLabel(due: string | null, today: string): string | null {
  if (!due) return null;
  const d = new Date(`${due}T12:00:00`);
  const nice = d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });
  if (due === today) return "Due today";
  if (due < today) return `Overdue · ${nice}`;
  return `Due ${nice}`;
}
