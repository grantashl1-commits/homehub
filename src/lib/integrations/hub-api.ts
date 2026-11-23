/**
 * Calls the hub's own Vercel functions (/api/*). They hold each family's
 * private calendar links and Notion token. The screen proves which family it
 * is with the signed-in family account, or (screens set up before accounts)
 * the shared hub access key entered in Parent → Connections.
 */
import { useHub } from "../store";
import { accessToken, useAccount } from "../account";

export class HubApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function hubFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const household = useAccount.getState().household?.id;
  const token = household ? await accessToken() : undefined;
  const key = useHub.getState().settings.hubKey;
  if (!token && !key) throw new HubApiError(401, "Sign in to your family account first.");
  const auth: Record<string, string> =
    token && household ? { authorization: `Bearer ${token}`, "x-household-id": household } : { "x-hub-key": key! };
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...init.headers,
      ...auth,
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

/** A cache key per family, so one family's data never shows for another. */
export function cacheKey(name: string, access: string): string {
  return access === "key" ? name : `${name}:${access}`;
}
