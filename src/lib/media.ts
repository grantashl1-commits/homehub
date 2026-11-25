/**
 * Voice notes, doodles and slideshow photos live as Blobs in IndexedDB on the
 * device (localStorage is far too small). Ids are stored in the app state.
 * When the screen is signed in to the family account, each blob is also copied
 * to the family's private storage, so a note recorded on the tablet plays on
 * the desktop too (fetched once, then kept in that screen's IndexedDB).
 */
import { createStore, del, get, keys, set } from "idb-keyval";
import { uid } from "./device";
import { downloadFamilyMedia, removeFamilyMedia, uploadFamilyMedia } from "./account";

const store = createStore("homehub-media", "blobs");
const urlCache = new Map<string, string>();

export async function saveMedia(blob: Blob): Promise<string> {
  const id = uid("m");
  await set(id, blob, store);
  void uploadFamilyMedia(id, blob).catch((e) => console.warn("Couldn't copy media to the family", e));
  return id;
}

export async function getMedia(id: string): Promise<Blob | undefined> {
  const here = await get<Blob>(id, store);
  if (here) return here;
  // Made on another screen: fetch it from the family's storage and keep a copy.
  const there = await downloadFamilyMedia(id).catch(() => undefined);
  if (there) await set(id, there, store).catch(() => {});
  return there;
}

export async function mediaUrl(id: string): Promise<string | undefined> {
  const hit = urlCache.get(id);
  if (hit) return hit;
  const blob = await getMedia(id);
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export async function deleteMedia(id: string): Promise<void> {
  const url = urlCache.get(id);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(id);
  await del(id, store);
  void removeFamilyMedia(id).catch(() => {});
}

/** Pick the recording format each browser can both record and replay. */
export function preferredAudioType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const options = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  return options.find((t) => MediaRecorder.isTypeSupported?.(t));
}

export function canRecord(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/** Downscale photos before storing so the slideshow stays light. */
export async function resizeImage(file: File, maxSide = 1920): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.86),
  );
}

/**
 * Turns a camera or library photo into a small square profile picture
 * (about 25KB), cropped from the middle with a little headroom for faces.
 */
export async function profilePhoto(file: File, side = 320): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const s = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - s) / 2;
  const sy = (bitmap.height - s) * 0.3;
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, s, s, 0, 0, side, side);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

const SHARED = "homehub-media-shared";

/**
 * Copies this screen's older voice notes, doodles and photos to the family's
 * storage, once each (remembered on this screen), so other screens can play
 * them. Runs when a family account is signed in.
 */
let sharing = false;

export async function shareOlderMedia(): Promise<void> {
  if (sharing) return;
  sharing = true;
  let done: string[] = [];
  try {
    done = JSON.parse(localStorage.getItem(SHARED) ?? "[]") as string[];
  } catch {
    /* fresh list */
  }
  const seen = new Set(done);
  // One file failing (too big, odd type) mustn't stop the rest. Only a run of
  // failures in a row (offline, signed out) ends this pass; the next one retries.
  let failedInARow = 0;
  try {
    for (const k of await keys(store)) {
      const id = String(k);
      if (seen.has(id)) continue;
      const blob = await get<Blob>(id, store);
      if (!blob) continue;
      try {
        await uploadFamilyMedia(id, blob);
        seen.add(id);
        failedInARow = 0;
      } catch (e) {
        console.warn(`Couldn't share ${id} with the family`, e);
        if (++failedInARow >= 3) break;
      }
    }
  } finally {
    sharing = false;
  }
  try {
    localStorage.setItem(SHARED, JSON.stringify([...seen]));
  } catch {
    /* private mode */
  }
}

