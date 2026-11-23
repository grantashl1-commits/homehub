/**
 * Voice notes, doodles and slideshow photos live as Blobs in IndexedDB on the
 * device (localStorage is far too small). Ids are stored in the app state.
 */
import { createStore, del, get, set } from "idb-keyval";
import { uid } from "./device";

const store = createStore("homehub-media", "blobs");
const urlCache = new Map<string, string>();

export async function saveMedia(blob: Blob): Promise<string> {
  const id = uid("m");
  await set(id, blob, store);
  return id;
}

export async function getMedia(id: string): Promise<Blob | undefined> {
  return get<Blob>(id, store);
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
