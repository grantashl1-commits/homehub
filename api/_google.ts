/**
 * Shared Google helpers for the hub's Vercel functions. Uses the base64
 * service-account key (GOOGLE_SERVICE_ACCOUNT_JSON) to mint a short-lived
 * Drive access token. No googleapis dependency — just a signed JWT.
 */
import { createSign } from "node:crypto";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri: string;
}

function base64url(input: string | Buffer): string {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function loadServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON isn't set on the Vercel project yet.");
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as ServiceAccount;
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON isn't a base64 service-account key.");
  }
}

function signJwt(privateKey: string, header: object, claims: object): string {
  const h = base64url(JSON.stringify(header));
  const c = base64url(JSON.stringify(claims));
  const sign = createSign("RSA-SHA256");
  sign.update(`${h}.${c}`);
  const sig = sign
    .sign(privateKey, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${h}.${c}.${sig}`;
}

let cached: { token: string; exp: number } | undefined;

/** A Google OAuth access token for the Drive API (cached until ~2 min before expiry). */
export async function driveToken(
  scope = "https://www.googleapis.com/auth/drive.readonly",
): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const jwt = signJwt(
    sa.private_key,
    { alg: "RS256", typ: "JWT" },
    { iss: sa.client_email, scope, aud: sa.token_uri, iat: now, exp: now + 3600 },
  );
  const res = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Google token endpoint returned ${res.status}.`);
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Google didn't return an access token.");
  cached = { token: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 - 120_000 };
  return cached.token;
}
