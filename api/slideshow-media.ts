/**
 * GET /api/slideshow-media?id=…&exp=…&sig=… → streams one photo/video from the
 * Drive folder. No x-hub-key header (an <img>/<video> tag can't send one);
 * instead the link is an HMAC of `id.exp` signed with HUB_ACCESS_KEY, minted
 * only by /api/slideshow.
 *
 * Videos are served in byte ranges (206 Partial Content), as browsers expect:
 * Safari won't play a video without them, Chrome needs them to reach an MP4's
 * index at the end of the file, and each reply stays under Vercel's response
 * size limit. A request for "everything from byte N" gets the next chunk and
 * the browser asks for the rest as it plays.
 */
import { json, verifyMediaUrl } from "./_shared.js";
import { driveToken } from "./_google.js";

/** Largest slice sent in one reply (Vercel caps function responses at 4.5MB). */
export const CHUNK = 4 * 1024 * 1024;

/** The byte range to ask Drive for, capped at CHUNK. Null means "the whole file". */
export function clampRange(header: string | null): { start: number; end: number } | null {
  const m = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (m[1] === "" && m[2] === "")) return null;
  if (m[1] === "") return null; // suffix ranges ("last N bytes") aren't used by <video>; send from the start
  const start = Number(m[1]);
  const wanted = m[2] === "" ? Infinity : Number(m[2]);
  return { start, end: Math.min(wanted, start + CHUNK - 1) };
}

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
    const range = clampRange(request.headers.get("range"));
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`, {
      headers: { authorization: `Bearer ${token}`, ...(range ? { range: `bytes=${range.start}-${range.end}` } : {}) },
    });
    if (res.status === 416) return new Response(null, { status: 416, headers: { "accept-ranges": "bytes" } });
    if (!res.ok) return json({ error: `Drive returned ${res.status}.` }, 502);
    const headers: Record<string, string> = {
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "private, max-age=3600",
      "accept-ranges": "bytes",
    };
    const length = res.headers.get("content-length");
    if (length) headers["content-length"] = length;
    const contentRange = res.headers.get("content-range");
    if (res.status === 206 && contentRange) headers["content-range"] = contentRange;
    return new Response(res.body, { status: res.status === 206 ? 206 : 200, headers });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Couldn't stream that file." }, 502);
  }
}
