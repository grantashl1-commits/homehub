/**
 * Calls the hub's own Vercel functions (/api/*). They hold the private
 * calendar link and the Notion token; the device proves itself with the
 * hub access key that a parent enters once in Parent → Connections.
 */
import { useHub } from "../store";

export class HubApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function hubFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = useHub.getState().settings.hubKey;
  if (!key) throw new HubApiError(401, "No hub access key on this device yet.");
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
      "x-hub-key": key,
    },
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }
  if (!res.ok) {
    const msg =
      (body as { error?: string } | undefined)?.error ??
      (res.status === 404 ? "This hub function isn't deployed yet." : `Request failed (${res.status})`);
    throw new HubApiError(res.status, msg);
  }
  if (body === undefined) throw new HubApiError(502, "The hub function returned an unexpected reply.");
  return body as T;
}
