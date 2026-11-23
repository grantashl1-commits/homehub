/**
 * Guest-only device mode.
 *
 * A screen can be set up as a dedicated guest screen (e.g. the wall screen at
 * an Airbnb). It only ever loads the guidebook, Wi-Fi and owner PIN — it never
 * starts the SIGNAL/PointPals connectors or shows family data.
 */
import type { HouseGuide } from "./types";

export interface GuestConfig {
  guidebookUrl: string;
  wifiName: string;
  wifiPassword: string;
  houseGuide: HouseGuide;
  /** Owner PIN hash + salt, kept so the owner can leave guest-only mode. */
  pinHash?: string;
  pinSalt?: string;
}

const CONFIG_KEY = "homehub:guestConfig";
const ONLY_KEY = "homehub:guestOnly";

export function isGuestOnly(): boolean {
  try {
    return localStorage.getItem(ONLY_KEY) === "1";
  } catch {
    return false;
  }
}

export function setGuestOnly(on: boolean): void {
  try {
    if (on) localStorage.setItem(ONLY_KEY, "1");
    else localStorage.removeItem(ONLY_KEY);
  } catch {
    /* ignore */
  }
}

export function getGuestConfig(): GuestConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? (JSON.parse(raw) as GuestConfig) : null;
  } catch {
    return null;
  }
}

export function saveGuestConfig(cfg: GuestConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore */
  }
}

/** Wipe the guest-only flag and config so the screen returns to family setup. */
export function clearGuestOnly(): void {
  setGuestOnly(false);
  try {
    localStorage.removeItem(CONFIG_KEY);
  } catch {
    /* ignore */
  }
}
