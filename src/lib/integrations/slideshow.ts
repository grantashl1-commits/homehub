import { useRemote } from "../useRemote";
import { cacheKey, hubFetch } from "./hub-api";
import { useHubAccess } from "../account";

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
  const access = useHubAccess();
  const remote = useRemote<SlideshowResponse>(
    access ? cacheKey("slideshow", access) : null,
    () => hubFetch<SlideshowResponse>("/api/slideshow"),
    { intervalMs: 10 * 60_000 },
  );
  return {
    items: remote.data?.items ?? [],
    connected: !!remote.data,
    error: access ? remote.error : undefined,
    stale: remote.stale,
    refresh: remote.refresh,
  };
}
