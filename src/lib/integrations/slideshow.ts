import { useHub } from "../store";
import { useRemote } from "../useRemote";
import { hubFetch } from "./hub-api";

export interface SlideItem {
  id: string;
  name: string;
  kind: "image" | "video";
  url: string;
}

interface SlideshowResponse {
  items: SlideItem[];
  fetchedAt: string;
}

/**
 * The family photos and videos for the idle screensaver, listed from the
 * Google Drive folder via /api/slideshow (service account, server-side).
 */
export function useSlideshow() {
  const hubKey = useHub((s) => s.settings.hubKey);
  const remote = useRemote<SlideshowResponse>(
    hubKey ? "slideshow" : null,
    () => hubFetch<SlideshowResponse>("/api/slideshow"),
    { intervalMs: 10 * 60_000 },
  );
  return {
    items: remote.data?.items ?? [],
    connected: !!remote.data,
    error: hubKey ? remote.error : undefined,
    stale: remote.stale,
    refresh: remote.refresh,
  };
}
