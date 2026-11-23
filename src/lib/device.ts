/** Small browser helpers: ids, PIN hashing, speech, sounds, wake lock. */

export function uid(prefix = ""): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${rand}` : rand;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function newSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** PBKDF2 so a stolen settings blob can't be brute-forced instantly. */
export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 120_000, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

/* ── Read it to me ─────────────────────────────────────────────────────── */

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = window.speechSynthesis?.getVoices?.() ?? [];
  if (!voices.length) return null;
  const pref = ["en-NZ", "en-AU", "en-GB", "en-US"];
  for (const lang of pref) {
    const v = voices.find((x) => x.lang?.replace("_", "-") === lang);
    if (v) return (cachedVoice = v);
  }
  return (cachedVoice = voices.find((v) => v.lang?.startsWith("en")) ?? null);
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speak(text: string, opts: { rate?: number; onEnd?: () => void } = {}): void {
  if (!canSpeak() || !text.trim()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v) u.voice = v;
  u.lang = v?.lang ?? "en-NZ";
  u.rate = opts.rate ?? 0.92;
  u.pitch = 1.05;
  if (opts.onEnd) u.onend = opts.onEnd;
  synth.speak(u);
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/* ── Speech to text (say it instead of typing) ────────────────────────── */

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function canListen(): boolean {
  return typeof window !== "undefined" && !!recognitionCtor();
}

/** Listen once and resolve with what was said (empty string if nothing). */
export function listenOnce(): { promise: Promise<string>; stop: () => void } {
  const Ctor = recognitionCtor();
  if (!Ctor) return { promise: Promise.resolve(""), stop: () => {} };
  const rec = new Ctor();
  rec.lang = "en-NZ";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;
  let text = "";
  const promise = new Promise<string>((resolve) => {
    rec.onresult = (e) => {
      text = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
    };
    rec.onerror = () => resolve(text);
    rec.onend = () => resolve(text);
    try {
      rec.start();
    } catch {
      resolve("");
    }
  });
  return { promise, stop: () => rec.stop() };
}

/* ── Little sounds, synthesised so there are no audio files to load ───── */

let audioCtx: AudioContext | null = null;
let soundsOn = true;

export function setSoundsEnabled(on: boolean) {
  soundsOn = on;
}

function ctx(): AudioContext | null {
  if (!soundsOn) return null;
  try {
    audioCtx ??= new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audioCtx.state === "suspended") void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.12) {
  const c = ctx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.05);
}

export const sfx = {
  tap: () => tone(660, 0, 0.08, "triangle", 0.06),
  pop: () => {
    tone(520, 0, 0.09, "sine", 0.1);
    tone(880, 0.05, 0.1, "sine", 0.08);
  },
  success: () => {
    tone(523.25, 0, 0.16, "triangle");
    tone(659.25, 0.1, 0.16, "triangle");
    tone(783.99, 0.2, 0.28, "triangle");
  },
  marble: () => {
    tone(1568, 0, 0.06, "sine", 0.08);
    tone(2093, 0.07, 0.08, "sine", 0.06);
    tone(1760, 0.16, 0.1, "sine", 0.05);
  },
  soft: () => tone(392, 0, 0.25, "sine", 0.07),
  error: () => {
    tone(220, 0, 0.12, "square", 0.05);
    tone(180, 0.12, 0.16, "square", 0.05);
  },
};

/* ── Keep the bench screen awake ──────────────────────────────────────── */

type WakeLockSentinel = { release: () => Promise<void>; released: boolean };

export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  const nav = navigator as Navigator & {
    wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinel> };
  };
  try {
    return (await nav.wakeLock?.request("screen")) ?? null;
  } catch {
    return null;
  }
}
