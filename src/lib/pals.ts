/**
 * The PointPals cast — used as everyone's avatar in Home Hub.
 * Art and chore icons are PointPals' public brand assets, served from the
 * PointPals Supabase `assets` bucket. Colours are sampled from the art
 * (see PointPals src/lib/pals.ts).
 */

export const POINTPALS_ASSETS =
  "https://tcpbvcgvtwrqsrzerwwr.supabase.co/storage/v1/object/public/assets";

export type PalId =
  | "sunny"
  | "pip"
  | "bramble"
  | "ziggy"
  | "ridge"
  | "coda"
  | "fern"
  | "marlow";

export interface Pal {
  id: PalId;
  name: string;
  value: string;
  quote: string;
  color: string;
  shade: string;
  tint: string;
  ink: string;
}

export const PALS: Pal[] = [
  { id: "sunny", name: "Sunny", value: "Kindness", quote: "The smallest kindness leaves the biggest glow.", color: "#F3D375", shade: "#D9AE45", tint: "#FFF4CF", ink: "#7A5A0C" },
  { id: "pip", name: "Pip", value: "Learning", quote: "You don't have to know it yet. You just have to open the book.", color: "#8FC7EA", shade: "#5D9FD1", tint: "#E3F2FC", ink: "#1F5683" },
  { id: "bramble", name: "Bramble", value: "Goals", quote: "Every done thing is a star you made yourself.", color: "#9CD08C", shade: "#6EAE5E", tint: "#E4F4DE", ink: "#2F6324" },
  { id: "ziggy", name: "Ziggy", value: "Creativity", quote: "The swirl never stops until something wonderful comes out.", color: "#D8B48A", shade: "#B48A5D", tint: "#F6E9D8", ink: "#6B4521" },
  { id: "ridge", name: "Ridge", value: "Perseverance", quote: "You just take the next step.", color: "#55698B", shade: "#36465F", tint: "#DFE5EF", ink: "#263247" },
  { id: "coda", name: "Coda", value: "Independence", quote: "One brave step is all it takes to begin.", color: "#B79BE0", shade: "#8E6CC9", tint: "#EFE7FB", ink: "#4E2F86" },
  { id: "fern", name: "Fern", value: "Daily habits", quote: "Every habit was once just a start.", color: "#84CFCB", shade: "#55AFAA", tint: "#DEF4F2", ink: "#1F625E" },
  { id: "marlow", name: "Marlow", value: "Teamwork", quote: "The jar fills faster when everyone adds to it.", color: "#F2A7B8", shade: "#D97B92", tint: "#FCE4EA", ink: "#8A2F48" },
];

const BY_ID = new Map(PALS.map((p) => [p.id, p]));

export function pal(id: string | undefined | null): Pal {
  return (id && BY_ID.get(id as PalId)) || PALS[0];
}

export function palArt(id: string | undefined | null): string {
  return `${POINTPALS_ASSETS}/${pal(id).id}.png`;
}

/** PointPals chore/skill icon registry key → public URL. Full URLs pass through. */
export function iconUrl(key: string | undefined | null): string | undefined {
  if (!key) return undefined;
  if (key.startsWith("http")) return key;
  if (/\.(png|jpe?g|webp|svg)$/i.test(key)) {
    return `${POINTPALS_ASSETS}/${encodeURIComponent(key)}?v=5`;
  }
  return undefined;
}

/** True when an icon value is an emoji/short text rather than an image. */
export function isEmojiIcon(key: string | undefined | null): boolean {
  return !!key && !iconUrl(key);
}

/** PointPals kid colour keys → hex (PASTEL_HEX in PointPals). */
export const PASTEL_HEX: Record<string, string> = {
  sky: "#B8D4EC",
  butter: "#F3E1A0",
  sage: "#C8DDBF",
  blush: "#EFC8CE",
  lilac: "#D4C4E8",
  sand: "#E8CFA8",
  foam: "#B8DDDC",
  orange: "#F5CAA0",
};
