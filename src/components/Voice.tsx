import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Mic, Pause, Play, RotateCcw, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { canRecord, mediaUrl, preferredAudioType, saveMedia } from "@/lib/media";
import { sfx } from "@/lib/device";

const LIMIT_MS = 60_000;

/**
 * Tap to start, big stop button, 60-second ring, listen back or try again.
 * Calls onSaved with the stored media id once the child is happy with it.
 */
export function VoiceRecorder({
  onSaved,
  color = "var(--coral)",
}: {
  onSaved: (mediaId: string, durationMs: number) => void;
  color?: string;
}) {
  const [state, setState] = useState<"idle" | "recording" | "review" | "error">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string>();
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(
    () => () => {
      window.clearInterval(timer.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  if (!canRecord()) {
    return <p className="rounded-[1.5rem] bg-white p-6 text-[1.4rem] font-bold text-ink-2">This screen can't record sound. Try writing or drawing instead.</p>;
  }

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const type = preferredAudioType();
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const b = new Blob(chunks.current, { type: rec.mimeType || type || "audio/webm" });
        setBlob(b);
        setUrl(URL.createObjectURL(b));
        setState("review");
      };
      rec.start(250);
      recRef.current = rec;
      startedAt.current = Date.now();
      setElapsed(0);
      setState("recording");
      sfx.pop();
      timer.current = window.setInterval(() => {
        const e = Date.now() - startedAt.current;
        setElapsed(e);
        if (e >= LIMIT_MS) stop();
      }, 100);
    } catch {
      setState("error");
    }
  };

  const stop = () => {
    window.clearInterval(timer.current);
    if (recRef.current?.state === "recording") recRef.current.stop();
    sfx.soft();
  };

  const reset = () => {
    if (url) URL.revokeObjectURL(url);
    setUrl(undefined);
    setBlob(null);
    setElapsed(0);
    setState("idle");
  };

  const save = async () => {
    if (!blob) return;
    const id = await saveMedia(blob);
    onSaved(id, elapsed);
  };

  const pct = Math.min(1, elapsed / LIMIT_MS);
  const R = 46;
  const C = 2 * Math.PI * R;

  return (
    <div className="flex flex-col items-center gap-5 py-2">
      {state === "error" && (
        <p className="text-center text-[1.35rem] font-bold text-coral-ink">
          The microphone is switched off. Ask a grown-up to allow it in the browser settings.
        </p>
      )}
      {(state === "idle" || state === "error") && (
        <button
          type="button"
          onClick={start}
          className="tap grid size-[11rem] place-items-center rounded-full text-white shadow-[var(--shadow-glow)]"
          style={{ background: color }}
          aria-label="Start recording"
        >
          <Mic className="size-[4.5rem]" strokeWidth={2.4} />
        </button>
      )}
      {state === "recording" && (
        <div className="relative grid size-[12rem] place-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(0 0 0 / 0.08)" strokeWidth="6" />
            <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
          </svg>
          <motion.button
            type="button"
            onClick={stop}
            aria-label="Stop recording"
            className="tap grid size-[9rem] place-items-center rounded-full bg-ink text-white"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 1.1, repeat: Infinity }}
          >
            <Square className="size-[3.4rem] fill-current" />
          </motion.button>
        </div>
      )}
      {state === "recording" && (
        <p className="font-display text-[2.4rem] font-black">
          Listening… {Math.ceil((LIMIT_MS - elapsed) / 1000)}s
        </p>
      )}
      {state === "idle" && <p className="text-[1.5rem] font-extrabold text-ink-2">Tap the microphone and talk</p>}
      {state === "review" && url && (
        <>
          <AudioPlayer src={url} durationMs={elapsed} color={color} big />
          <div className="flex gap-4">
            <button type="button" onClick={reset} className="tap flex min-h-[4.6rem] items-center gap-2 rounded-full bg-white px-7 text-[1.4rem] font-extrabold shadow-[var(--shadow-soft)]">
              <RotateCcw className="size-6" /> Try again
            </button>
            <button type="button" onClick={save} className="tap flex min-h-[4.6rem] items-center gap-2 rounded-full bg-sage px-9 text-[1.5rem] font-extrabold text-white shadow-[var(--shadow-soft)]">
              Use this one ✓
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Big round play button with a bouncing waveform. */
export function AudioPlayer({
  src,
  mediaId,
  durationMs,
  color = "var(--ink)",
  big,
  className,
}: {
  src?: string;
  mediaId?: string;
  durationMs?: number;
  color?: string;
  big?: boolean;
  className?: string;
}) {
  const [url, setUrl] = useState(src);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (src) return setUrl(src);
    if (mediaId) void mediaUrl(mediaId).then(setUrl);
  }, [src, mediaId]);

  useEffect(() => () => audio.current?.pause(), []);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!url) return;
    audio.current ??= new Audio(url);
    const a = audio.current;
    if (playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    a.currentTime = 0;
    a.onended = () => setPlaying(false);
    void a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const bars = [0.4, 0.75, 0.5, 1, 0.65, 0.85, 0.45, 0.9, 0.55, 0.7, 0.35, 0.6];
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play voice note"}
        className={cn("tap grid shrink-0 place-items-center rounded-full text-white shadow-[var(--shadow-soft)]", big ? "size-[6rem]" : "size-[4.2rem]")}
        style={{ background: color }}
      >
        {playing ? <Pause className={big ? "size-10" : "size-7"} /> : <Play className={cn("translate-x-[0.1rem]", big ? "size-10" : "size-7")} />}
      </button>
      <div className="flex h-[3.2rem] items-center gap-[0.3rem]">
        {bars.map((h, i) => (
          <motion.span
            key={i}
            className="w-[0.45rem] rounded-full"
            style={{ background: color, opacity: 0.75 }}
            animate={playing ? { height: [`${h * 1.2}rem`, `${(1 - h) * 2.6 + 0.6}rem`, `${h * 2.8}rem`] } : { height: `${h * 2.4}rem` }}
            transition={playing ? { duration: 0.6 + (i % 3) * 0.15, repeat: Infinity, repeatType: "mirror" } : { duration: 0.2 }}
          />
        ))}
      </div>
      {durationMs !== undefined && (
        <span className="text-[1.25rem] font-extrabold opacity-70">{Math.max(1, Math.round(durationMs / 1000))}s</span>
      )}
    </div>
  );
}
