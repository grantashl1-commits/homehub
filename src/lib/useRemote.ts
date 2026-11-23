import { useCallback, useEffect, useRef, useState } from "react";

interface RemoteState<T> {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  /** True when showing the last saved copy because the network failed. */
  stale: boolean;
  refresh: () => void;
}

const memory = new Map<string, unknown>();

function readCache<T>(key: string): T | undefined {
  if (memory.has(key)) return memory.get(key) as T;
  try {
    const raw = localStorage.getItem(`homehub-cache:${key}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache<T>(key: string, value: T) {
  memory.set(key, value);
  try {
    localStorage.setItem(`homehub-cache:${key}`, JSON.stringify(value));
  } catch {
    /* storage full: memory copy is enough */
  }
}

/**
 * Fetch something on an interval, keep the last good copy on the device so
 * the screen still shows it offline, and refetch when the tab wakes up.
 */
export function useRemote<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  opts: { intervalMs?: number; persist?: boolean } = {},
): RemoteState<T> {
  const { intervalMs = 5 * 60_000, persist = true } = opts;
  const [data, setData] = useState<T | undefined>(() => (key ? readCache<T>(key) : undefined));
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    try {
      const value = await fetcherRef.current();
      setData(value);
      setError(undefined);
      setStale(false);
      if (persist) writeCache(key, value);
      else memory.set(key, value);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStale(true);
    } finally {
      setLoading(false);
    }
  }, [key, persist]);

  useEffect(() => {
    if (!key) return;
    setData(readCache<T>(key));
    void run();
    const t = window.setInterval(run, intervalMs);
    const onVis = () => document.visibilityState === "visible" && void run();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", run);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", run);
    };
  }, [key, intervalMs, run]);

  return { data, error, loading, stale, refresh: run };
}
