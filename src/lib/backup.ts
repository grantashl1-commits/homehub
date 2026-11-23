/**
 * Backup and restore for the data a screen keeps in the browser.
 *
 * One JSON file: the hub's own state (family, profile photos, notes, habits,
 * claims, settings) plus the blobs in IndexedDB that voice notes, doodles and
 * the slideshow point at. It exists so a screen can move to a new address
 * (`localhost` → the Vercel URL) or a new device while everything still lives
 * on that device, and so nothing is lost if a screen is wiped.
 *
 * The hub key is deliberately left out: it is a secret, and the new screen
 * should have it entered by hand in Parent → Connections.
 */
import { createStore, get, set } from "idb-keyval";
import { useHub, type HubState } from "./store";

const store = createStore("homehub-media", "blobs");
const APP = "homehub";
const BACKUP_VERSION = 2;
/** Skip a single huge blob (a long slideshow video) so the file stays usable. */
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
/** And a total, so a slideshow of videos can't fill the phone's memory. */
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;

/** The state slices that belong to this screen. Settings are handled apart. */
const SLICES = [
  "members",
  "notes",
  "habits",
  "checkins",
  "nights",
  "claims",
  "localChores",
  "marbles",
  "familyJar",
  "localList",
  "kidPlans",
  "mealHearts",
  "localDinners",
  "photos",
] as const;

type Slice = (typeof SLICES)[number];
type SavedState = Pick<HubState, Slice> & { settings: Omit<HubState["settings"], "hubKey"> };

export interface BackupFile {
  app: typeof APP;
  backupVersion: number;
  savedAt: string;
  state: SavedState;
  media: { id: string; type: string; data: string }[];
  skippedMedia: number;
}

export interface BackupSummary {
  members: number;
  notes: number;
  photos: number;
  media: number;
  skipped: number;
  bytes: number;
}

function pickSlices(from: Pick<HubState, Slice>): Pick<HubState, Slice> {
  const out = {} as Pick<HubState, Slice>;
  const writable = out as Record<Slice, unknown>;
  for (const key of SLICES) writable[key] = from[key];
  return out;
}

/** Every blob id the state points at, so a backup only carries what it needs. */
function referencedMedia(state: Pick<HubState, Slice>): string[] {
  const ids = new Set<string>();
  for (const n of state.notes) if (n.mediaId) ids.add(n.mediaId);
  for (const c of state.checkins) if (c.noteMediaId) ids.add(c.noteMediaId);
  for (const p of state.kidPlans) if (p.voiceMediaId) ids.add(p.voiceMediaId);
  for (const p of state.photos) ids.add(p.mediaId);
  return [...ids];
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read a media file"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(blob);
  });
}

function fromBase64(data: string, type: string): Blob {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: type || "application/octet-stream" });
}

/** Gather everything into a file. Settings travel without the hub key. */
export async function buildBackup(): Promise<{ blob: Blob; fileName: string; summary: BackupSummary }> {
  const hub = useHub.getState();
  const settings: SavedState["settings"] = { ...hub.settings };
  delete (settings as { hubKey?: string }).hubKey;

  const media: BackupFile["media"] = [];
  let skipped = 0;
  let carried = 0;
  for (const id of referencedMedia(hub)) {
    const blob = await get<Blob>(id, store);
    if (!blob) continue;
    if (blob.size > MAX_MEDIA_BYTES || carried + blob.size > MAX_TOTAL_BYTES) {
      skipped++;
      continue;
    }
    carried += blob.size;
    media.push({ id, type: blob.type, data: await toBase64(blob) });
  }

  const file: BackupFile = {
    app: APP,
    backupVersion: BACKUP_VERSION,
    savedAt: new Date().toISOString(),
    state: { ...pickSlices(hub), settings },
    media,
    skippedMedia: skipped,
  };
  const text = JSON.stringify(file);
  return {
    blob: new Blob([text], { type: "application/json" }),
    fileName: `home-hub-backup-${file.savedAt.slice(0, 10)}.json`,
    summary: {
      members: file.state.members.length,
      notes: file.state.notes.length,
      photos: file.state.photos.length,
      media: media.length,
      skipped,
      bytes: text.length,
    },
  };
}

/** Hand the file to the browser's downloader. */
export function saveBackupFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Replace this screen's data with a backup. Media is written first so the
 * screen can render straight after the reload. The hub key and guest mode are
 * kept as they are here — a backup shouldn't be able to lock a screen into
 * guest mode.
 */
export async function restoreBackup(file: File): Promise<BackupSummary> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text()) as BackupFile;
  } catch {
    throw new Error("That file isn't readable JSON.");
  }
  if (parsed?.app !== APP) throw new Error("That isn't a Home Hub backup.");
  const incoming = parsed.state;
  if (!incoming?.members?.length) throw new Error("That backup has no family in it.");

  for (const item of parsed.media ?? []) {
    try {
      await set(item.id, fromBase64(item.data, item.type), store);
    } catch {
      /* media is best-effort: the state still restores */
    }
  }

  const current = useHub.getState();
  useHub.setState({
    ...pickSlices(incoming),
    settings: {
      ...current.settings,
      ...incoming.settings,
      hubKey: current.settings.hubKey,
      guestMode: false,
    },
  });

  return {
    members: incoming.members.length,
    notes: incoming.notes?.length ?? 0,
    photos: incoming.photos?.length ?? 0,
    media: parsed.media?.length ?? 0,
    skipped: parsed.skippedMedia ?? 0,
    bytes: file.size,
  };
}
