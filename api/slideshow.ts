/**
 * GET /api/slideshow → the family's photos and videos for the idle screensaver,
 * listed from the Google Drive folder shared with the hub's service account.
 *   GOOGLE_SERVICE_ACCOUNT_JSON  (required) base64 service-account key
 *   SLIDESHOW_DRIVE_FOLDER_ID    (required) the "Home Hub Slideshow" folder
 * Each item's `url` is a short-lived signed link to /api/slideshow-media, so
 * the <img>/<video> tags can load it without the x-hub-key header.
 */
import { json, requireHubKey, signMediaUrl } from "./_shared.js";
import { driveToken } from "./_google.js";

interface SlideItem {
  id: string;
  name: string;
  kind: "image" | "video";
  url: string;
}

const TTL_MS = 5 * 60_000;
let cache: { at: number; items: SlideItem[] } | undefined;

export async function GET(request: Request): Promise<Response> {
  const denied = requireHubKey(request);
  if (denied) return denied;
  const folderId = process.env.SLIDESHOW_DRIVE_FOLDER_ID;
  if (!folderId) return json({ error: "SLIDESHOW_DRIVE_FOLDER_ID isn't set on the Vercel project yet." }, 503);

  if (cache && Date.now() - cache.at < TTL_MS) {
    return json({ items: cache.items, fetchedAt: new Date(cache.at).toISOString() });
  }

  try {
    const token = await driveToken();
    const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType)&pageSize=1000&orderBy=name`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!res.ok) throw new Error(`Drive list returned ${res.status}.`);
    const data = (await res.json()) as { files?: { id: string; name: string; mimeType: string }[] };
    const items: SlideItem[] = (data.files ?? [])
      .filter((f) => f.mimeType.startsWith("image/") || f.mimeType.startsWith("video/"))
      .map((f) => ({
        id: f.id,
        name: f.name,
        kind: f.mimeType.startsWith("video/") ? "video" : "image",
        url: signMediaUrl(f.id),
      }));
    cache = { at: Date.now(), items };
    return json({ items, fetchedAt: new Date().toISOString() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Couldn't read the slideshow folder." }, 502);
  }
}
