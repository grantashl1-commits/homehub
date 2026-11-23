/**
 * GET /api/slideshow-media?id=…&exp=…&sig=… → streams one photo/video from the
 * Drive folder. No x-hub-key header (an <img>/<video> tag can't send one);
 * instead the link is an HMAC of `id.exp` signed with HUB_ACCESS_KEY, minted
 * only by /api/slideshow.
 */
import { json, verifyMediaUrl } from "./_shared.js";
import { driveToken } from "./_google.js";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const exp = Number(url.searchParams.get("exp") ?? 0);
  const sig = url.searchParams.get("sig") ?? "";
  if (!id || !verifyMediaUrl(id, exp, sig)) {
    return json({ error: "That link isn't valid or has expired." }, 401);
  }
  try {
    const token = await driveToken();
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return json({ error: `Drive returned ${res.status}.` }, 502);
    return new Response(res.body, {
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/octet-stream",
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Couldn't stream that file." }, 502);
  }
}
