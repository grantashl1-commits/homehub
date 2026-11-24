/**
 * Record the dinnertime chat: a pill in the reflection header that listens
 * the whole way round the table, and a panel on the summary that turns the
 * transcript into a family summary plus a few lines on each person's profile.
 */
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Mic, Square, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useHub, activeHabit } from "@/lib/store";
import { dateKey } from "@/lib/time";
import { sfx } from "@/lib/device";
import { hubFetch } from "@/lib/integrations/hub-api";
import type { useTranscriber } from "@/lib/transcribe";
import { BigButton } from "@/components/ui";
import { cn } from "@/lib/utils";

type Transcriber = ReturnType<typeof useTranscriber>;

export function RecordPill({ t }: { t: Transcriber }) {
  const [started, setStarted] = useState<number>();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!t.listening) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [t.listening]);
  if (!t.supported) return null;
  const secs = started ? Math.max(0, Math.floor((now - started) / 1000)) : 0;
  const live = (t.interim || t.transcript).split(" ").slice(-9).join(" ");

  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={() => {
          sfx.tap();
          if (t.listening) t.stop();
          else {
            setStarted((s) => s ?? Date.now());
            t.start();
          }
        }}
        className={cn(
          "tap flex h-[4rem] shrink-0 items-center gap-2 rounded-full px-5 text-[1.25rem] font-black shadow-[var(--shadow-soft)]",
          t.listening ? "bg-coral text-white" : "bg-white text-ink",
        )}
        aria-pressed={t.listening}
      >
        {t.listening ? (
          <>
            <motion.span className="size-3 rounded-full bg-white" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
            {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
            <Square className="size-5 fill-current" />
          </>
        ) : (
          <>
            <Mic className="size-6 text-coral" /> {t.transcript ? "Keep recording" : "Record our chat"}
          </>
        )}
      </button>
      {t.listening && live && (
        <p className="hidden max-w-[22rem] truncate text-[1.1rem] font-bold italic text-ink-2 lg:block">“…{live}”</p>
      )}
      {t.error && <p className="max-w-[20rem] text-[1.05rem] font-bold text-coral-ink">{t.error}</p>}
    </div>
  );
}

export function SaveReflection({ t }: { t: Transcriber }) {
  const members = useHub((s) => s.members);
  const habits = useHub((s) => s.habits);
  const addReflection = useHub((s) => s.addReflection);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ summary?: string } | null>(null);
  const text = t.transcript.trim();
  if (!text && !saved) return null;

  const save = async () => {
    t.stop();
    setBusy(true);
    const people = members.map((m) => ({ id: m.id, name: m.name, habit: activeHabit(habits, m.id)?.title }));
    let summary: string | undefined;
    let perPerson: Record<string, string> = {};
    try {
      const r = await hubFetch<{ summary: string; people: Record<string, string> }>("/api/reflect-summary", {
        method: "POST",
        body: JSON.stringify({ transcript: text, people }),
      });
      summary = r.summary || undefined;
      perPerson = r.people;
    } catch (e) {
      toast.warning(`Saved the words, but couldn't summarise them: ${e instanceof Error ? e.message : "try again later"}`);
    }
    addReflection({ date: dateKey(), transcript: text, summary, people: perPerson });
    sfx.success();
    setSaved({ summary });
    t.reset();
    setBusy(false);
  };

  return (
    <div className="w-full max-w-[64rem] rounded-[1.8rem] bg-white/90 p-5 text-left shadow-[var(--shadow-soft)]">
      {saved ? (
        <>
          <p className="flex items-center gap-2 font-display text-[2rem] font-black">
            <Sparkles className="size-7 text-[#e0a21c]" /> Saved to everyone's profile
          </p>
          {saved.summary && <p className="mt-1 text-[1.3rem] font-bold leading-snug text-ink-2">{saved.summary}</p>}
        </>
      ) : (
        <>
          <p className="font-display text-[2rem] font-black">Our chat tonight</p>
          <p className="mt-1 line-clamp-3 text-[1.2rem] font-bold leading-snug text-ink-2">“{text}”</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <BigButton size="md" disabled={busy} icon={<Sparkles className="size-6" />} onClick={() => void save()}>
              {busy ? "Writing it up…" : "Save our reflection"}
            </BigButton>
            <BigButton size="md" tone="white" disabled={busy} onClick={() => t.reset()}>
              Don't keep it
            </BigButton>
          </div>
        </>
      )}
    </div>
  );
}
