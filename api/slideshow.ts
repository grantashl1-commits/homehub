/**
 * GET /api/slideshow → the family's photos and videos for the idle screensaver,
 * listed from the Google Drive folder shared with the hub's service account.
 *   GOOGLE_SERVICE_ACCOUNT_JSON  (required) base64 service-account key
 *   SLIDESHOW_DRIVE_FOLDER_ID    (per family) the "Home Hub Slideshow" folder,
 *                                saved in Parent → Connections or, for the
 *                                home family, in Vercel
 * Each item's `url` is a short-lived signed link to /api/slideshow-media, so
 * the <img>/<video> tags can load it without the x-hub-key header.
 */
import { json, signMediaUrl } from "./_shared.js";
import { requireFamily } from "./_family.js";
import { driveToken } from "./_google.js";

interface SlideItem {
  id: string;
  name: string;
  kind: "image" | "video";
  url: string;
}

const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; items: SlideItem[] }>();

export async function GET(request: Request): Promise<Response> {
  const family = await requireFamily(request);
  if (family instanceof Response) return family;

  try {
    const folderId = await family.secret("SLIDESHOW_DRIVE_FOLDER_ID");
    if (!folderId) return json({ error: "No slideshow folder linked yet. Add it in Parent → Connections." }, 503);
    // Links are signed fresh on every reply, so a cached list never hands out
    // ones that have already expired.
    const fresh = (items: SlideItem[]) => items.map((i) => ({ ...i, url: signMediaUrl(i.id, 6 * 3600) }));
    const hit = cache.get(folderId);
    if (hit && Date.now() - hit.at < TTL_MS) {
      return json({ items: fresh(hit.items), fetchedAt: new Date(hit.at).toISOString() });
    }

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
        url: "",
      }));
    cache.set(folderId, { at: Date.now(), items });
    return json({ items: fresh(items), fetchedAt: new Date().toISOString() });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Couldn't read the slideshow folder." }, 502);
  }
}
