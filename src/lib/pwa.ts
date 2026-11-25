/**
 * Installing the hub as an app (Add to Home Screen), after the usual PWA
 * pattern: keep Chrome's `beforeinstallprompt` event for our own Install
 * button, and show iPhone/iPad people the Share → Add to Home Screen steps,
 * since Safari has no install prompt.
 */
import { create } from "zustand";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const usePwa = create<{ promptEvent: InstallPromptEvent | null; installed: boolean }>(() => ({
  promptEvent: null,
  installed: isStandalone(),
}));

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** iPhone or iPad Safari (iPadOS reports itself as a Mac with touch). */
export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

export function startInstallWatch() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    usePwa.setState({ promptEvent: e as InstallPromptEvent });
  });
  window.addEventListener("appinstalled", () => usePwa.setState({ promptEvent: null, installed: true }));
}

export async function installApp(): Promise<boolean> {
  const e = usePwa.getState().promptEvent;
  if (!e) return false;
  await e.prompt();
  const { outcome } = await e.userChoice;
  usePwa.setState({ promptEvent: null, installed: outcome === "accepted" });
  return outcome === "accepted";
}
