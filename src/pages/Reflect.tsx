import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Keyboard, Mic, X } from "lucide-react";
import confetti from "canvas-confetti";
import { useHub, activeHabit, familyStreak, habitStreak } from "@/lib/store";
import { HABIT_PRESETS } from "@/lib/catalog";
import { pal } from "@/lib/pals";
import { dateKey, fromDateKey } from "@/lib/time";
import { sfx, speak } from "@/lib/device";
import type { Member } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { AudioPlayer, VoiceRecorder } from "@/components/Voice";
import { BigButton, ChoreIcon, ReadAloud } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useTranscriber } from "@/lib/transcribe";
import { RecordPill, SaveReflection } from "@/components/ReflectionRecorder";

type Phase = "intro" | "ask" | "why" | "summary";

export default function Reflect() {
  const navigate = useNavigate();
  const members = useHub((s) => s.members);
  const habits = useHub((s) => s.habits);
  const checkins = useHub((s) => s.checkins);
  const nights = useHub((s) => s.nights);
  const { checkIn, completeNight, setHabit, updateHabit } = useHub.getState();
  const reducedMotion = useHub((s) => s.settings.reducedMotion);
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [whyMode, setWhyMode] = useState<"choose" | "type" | "talk">("choose");
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const recorder = useTranscriber();
  const today = dateKey();

  const person = members[index];
  const habit = person ? activeHabit(habits, person.id) : undefined;
  const next = members[index + 1];
  const tonight = useMemo(() => checkins.filter((c) => c.date === today), [checkins, today]);
  const answered = (m: Member) => tonight.find((c) => c.memberId === m.id);

  const advance = () => {
    setBusy(false);
    setWhy("");
    setWhyMode("choose");
    if (next) {
      setIndex(index + 1);
      setPhase("ask");
      sfx.pop();
    } else {
      completeNight(members.map((m) => m.id));
      setPhase("summary");
      sfx.success();
      if (!reducedMotion) void confetti({ particleCount: 180, spread: 110, origin: { y: 0.6 }, scalar: 1.3 });
    }
  };

  const yes = () => {
    if (!person || !habit || busy) return;
    setBusy(true);
    checkIn({ habitId: habit.id, memberId: person.id, status: "done" });
    sfx.success();
    if (!reducedMotion) void confetti({ particleCount: 90, spread: 80, origin: { y: 0.7 }, colors: [pal(person.palId).color, "#F6C64E", "#EE7B5B"], scalar: 1.2 });
    window.setTimeout(advance, 1200);
  };

  const notToday = () => {
    if (busy) return;
    sfx.soft();
    setPhase("why");
    speak("That's okay. What got in the way?");
  };

  const saveWhy = (noteMediaId?: string) => {
    if (!person || !habit) return;
    checkIn({ habitId: habit.id, memberId: person.id, status: "not_today", noteText: why.trim() || undefined, noteMediaId });
    advance();
  };

  const bg = person && phase !== "summary" && phase !== "intro" ? pal(person.palId) : null;

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden px-[2.4rem] py-[1.8rem] transition-[background] duration-700"
      style={{
        background: bg
          ? `radial-gradient(80% 70% at 50% 10%, ${bg.tint} 0%, transparent 70%), linear-gradient(170deg, #fff6e9 0%, ${bg.tint} 100%)`
          : "linear-gradient(160deg,#ffe9c9 0%,#fbd3d8 50%,#e3d6ff 100%)",
      }}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {members.map((m, i) => {
            const a = answered(m);
            return (
              <div key={m.id} className="relative">
                <Avatar member={m} size={3.4} dim={phase !== "summary" && i > index && !a} ring={i === index && phase !== "summary"} />
                {a && (
                  <span className="absolute -bottom-1 -right-1 grid size-[1.7rem] place-items-center rounded-full bg-white text-[1rem] shadow">
                    {a.status === "done" ? "✅" : "☁️"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex min-w-0 items-center gap-4">
          <p className="font-display text-[2.2rem] font-black max-xl:hidden">Dinnertime reflection 🍽️</p>
          <RecordPill t={recorder} />
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={() => navigate("/")}
          className="tap grid size-[4rem] place-items-center rounded-full bg-white shadow-[var(--shadow-soft)]"
        >
          <X className="size-8" strokeWidth={3} />
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <Stage key="intro">
              <div className="relative h-[19rem] w-[34rem]">
                <div className="absolute left-1/2 top-1/2 size-[13rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-[var(--shadow-lift)]">
                  <span className="absolute inset-0 grid place-items-center text-[6rem]">🍽️</span>
                </div>
                {members.map((m, i) => {
                  const angle = (i / members.length) * Math.PI * 2 - Math.PI / 2;
                  return (
                    <motion.div
                      key={m.id}
                      className="absolute left-1/2 top-1/2"
                      initial={{ x: "-50%", y: "-50%", scale: 0 }}
                      animate={{ x: `calc(-50% + ${Math.cos(angle) * 13.5}rem)`, y: `calc(-50% + ${Math.sin(angle) * 7.8}rem)`, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 260, damping: 18 }}
                    >
                      <Avatar member={m} size={5.4} ring />
                    </motion.div>
                  );
                })}
              </div>
              <h1 className="mt-4 text-center font-display text-[4.6rem] font-black leading-none">Let's go round the table</h1>
              <p className="max-w-[44rem] text-center text-[1.6rem] font-bold text-ink-2">
                Everyone shares how their habit went today. Wins get a cheer. Tricky days get a hug and a chat.
              </p>
              <BigButton
                size="xl"
                className="mt-3"
                onClick={() => {
                  setIndex(0);
                  setPhase("ask");
                }}
                icon={<ArrowRight className="size-10" strokeWidth={3} />}
              >
                Start with {members[0]?.name}
              </BigButton>
            </Stage>
          )}

          {phase === "ask" && person && (
            <Stage key={`ask-${person.id}`}>
              <Avatar member={person} size={11} float />
              <h1 className="font-display text-[4.4rem] font-black leading-none" style={{ color: pal(person.palId).ink }}>
                {person.name}'s turn
              </h1>
              {habit ? (
                <>
                  <div className="flex items-center gap-4 rounded-[2rem] bg-white px-7 py-4 shadow-[var(--shadow-soft)]">
                    <ChoreIcon icon={habit.icon} size={5} />
                    <div>
                      <p className="text-[1.15rem] font-black uppercase tracking-[0.08em] text-ink-3">My habit</p>
                      <p className="font-display text-[2.6rem] font-black leading-none">{habit.title}</p>
                      <p className="text-[1.2rem] font-bold text-ink-2">
                        {habitStreak(checkins, habit.id) > 0 ? `🔥 ${habitStreak(checkins, habit.id)} days in a row` : "Let's start a streak!"}
                      </p>
                    </div>
                    <ReadAloud text={`${person.name}, did you ${habit.title.toLowerCase()} today?`} />
                  </div>
                  <p className="font-display text-[3rem] font-black">Did you do it today?</p>
                  <div className="flex gap-6">
                    <BigButton tone="sage" size="xl" className="min-w-[19rem]" onClick={yes}>
                      Yes! 🎉
                    </BigButton>
                    <BigButton tone="white" size="xl" className="min-w-[19rem] text-lilac-ink" onClick={notToday}>
                      Not today ☁️
                    </BigButton>
                  </div>
                </>
              ) : (
                <QuickHabitPick member={person} onPick={(h) => setHabit(person.id, h)} onSkip={advance} />
              )}
            </Stage>
          )}

          {phase === "why" && person && (
            <Stage key={`why-${person.id}`}>
              <Avatar member={person} size={8} />
              <h1 className="font-display text-[4rem] font-black leading-none">That's okay, {person.name} 💛</h1>
              <p className="text-[1.8rem] font-bold text-ink-2">What got in the way?</p>
              {whyMode === "choose" && (
                <div className="flex gap-5">
                  <BigButton tone="sun" size="xl" icon={<Keyboard className="size-10" />} onClick={() => setWhyMode("type")}>
                    Type it
                  </BigButton>
                  <BigButton tone="coral" size="xl" icon={<Mic className="size-10" />} onClick={() => setWhyMode("talk")}>
                    Talk
                  </BigButton>
                  <BigButton tone="white" size="xl" onClick={() => saveWhy()}>
                    Skip
                  </BigButton>
                </div>
              )}
              {whyMode === "type" && (
                <div className="flex w-[min(44rem,90%)] flex-col gap-4">
                  <textarea
                    autoFocus
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    placeholder="I forgot because…"
                    className="h-[10rem] resize-none rounded-[1.6rem] bg-white p-5 text-[1.8rem] font-bold outline-none ring-2 ring-black/5 focus:ring-sky"
                  />
                  <BigButton size="lg" onClick={() => saveWhy()} disabled={!why.trim()}>
                    Save
                  </BigButton>
                </div>
              )}
              {whyMode === "talk" && (
                <div className="w-[min(44rem,90%)] rounded-[2rem] bg-white/80 p-5">
                  <VoiceRecorder color={pal(person.palId).shade} onSaved={(id) => saveWhy(id)} />
                </div>
              )}
            </Stage>
          )}

          {phase === "summary" && (
            <Summary key="summary" onDone={() => navigate("/")} streak={familyStreak(nights)} onRenew={(id) => updateHabit(id, { startDate: today })}>
              <SaveReflection t={recorder} />
            </Summary>
          )}
        </AnimatePresence>
      </div>

      {phase === "ask" && person && habit && next && (
        <button
          type="button"
          onClick={advance}
          className="tap absolute bottom-[1.8rem] right-[2.4rem] flex items-center gap-3 rounded-full bg-white/90 py-2 pl-5 pr-2 text-[1.35rem] font-black shadow-[var(--shadow-soft)]"
        >
          Skip, pass to {next.name}
          <Avatar member={next} size={3.2} />
        </button>
      )}
    </div>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center gap-5"
      initial={{ opacity: 0, x: 60, scale: 0.98 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -60, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
    >
      {children}
    </motion.div>
  );
}

function QuickHabitPick({
  member,
  onPick,
  onSkip,
}: {
  member: Member;
  onPick: (h: { title: string; icon: string; frequency: { kind: "daily" } }) => void;
  onSkip: () => void;
}) {
  const presets = HABIT_PRESETS.filter((h) => h.forKids === (member.role === "child")).slice(0, 8);
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="font-display text-[2.6rem] font-black">Pick a habit to work on</p>
      <div className="grid grid-cols-4 gap-3">
        {presets.map((h) => (
          <button
            key={h.title}
            type="button"
            onClick={() => {
              sfx.pop();
              onPick({ title: h.title, icon: h.icon, frequency: { kind: "daily" } });
            }}
            className="tap flex w-[11rem] flex-col items-center gap-1.5 rounded-[1.6rem] bg-white p-3 shadow-[var(--shadow-soft)]"
          >
            <ChoreIcon icon={h.icon} size={4.6} />
            <span className="text-[1.15rem] font-extrabold leading-tight">{h.title}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onSkip} className="text-[1.3rem] font-extrabold text-ink-2 underline">
        Choose later
      </button>
    </div>
  );
}

function Summary({ onDone, streak, onRenew, children }: { onDone: () => void; streak: number; onRenew: (habitId: string) => void; children?: React.ReactNode }) {
  const navigate = useNavigate();
  const members = useHub((s) => s.members);
  const habits = useHub((s) => s.habits);
  const checkins = useHub((s) => s.checkins);
  const today = dateKey();
  const wins = checkins.filter((c) => c.date === today && c.status === "done").length;
  return (
    <Stage>
      <motion.p className="text-[5rem] leading-none" animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] }} transition={{ duration: 1.2 }}>
        🏆
      </motion.p>
      <h1 className="font-display text-[4.6rem] font-black leading-none">Family wins tonight</h1>
      <p className="text-[1.7rem] font-bold text-ink-2">
        {wins} win{wins === 1 ? "" : "s"} · 🔥 {streak} night{streak === 1 ? "" : "s"} of reflection in a row
      </p>
      <div className="grid w-full max-w-[64rem] grid-cols-4 gap-4">
        {members.map((m) => {
          const h = activeHabit(habits, m.id);
          const c = checkins.find((x) => x.memberId === m.id && x.date === today);
          const p = pal(m.palId);
          const age = h ? (Date.now() - fromDateKey(h.startDate).getTime()) / 86400000 : 0;
          return (
            <div key={m.id} className="flex flex-col items-center gap-2 rounded-[1.8rem] bg-white p-4 text-center shadow-[var(--shadow-soft)]">
              <Avatar member={m} size={5} />
              <p className="font-display text-[2rem] font-black leading-none" style={{ color: p.ink }}>
                {m.name}
              </p>
              <p className={cn("rounded-full px-3 py-0.5 text-[1.15rem] font-black", c?.status === "done" ? "bg-sage-tint text-sage-ink" : "bg-lilac-tint text-lilac-ink")}>
                {c?.status === "done" ? "✅ Did it!" : c ? "☁️ Not today" : "—"}
              </p>
              {c?.noteText && <p className="line-clamp-2 text-[1.1rem] font-bold text-ink-2">“{c.noteText}”</p>}
              {c?.noteMediaId && <AudioPlayer mediaId={c.noteMediaId} color={p.shade} />}
              {h && age >= 14 && (
                <div className="mt-1 flex flex-col items-center gap-1.5 rounded-[1.2rem] bg-sun-tint p-2">
                  <p className="text-[1.05rem] font-extrabold">2 weeks of {h.title.toLowerCase()}!</p>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => onRenew(h.id)} className="tap rounded-full bg-white px-3 py-1 text-[1.05rem] font-black">
                      Keep going
                    </button>
                    <button type="button" onClick={() => navigate(`/habits/${m.id}`)} className="tap rounded-full bg-ink px-3 py-1 text-[1.05rem] font-black text-white">
                      New one
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {children}
      <BigButton size="xl" onClick={onDone}>
        Goodnight table! 🌙
      </BigButton>
    </Stage>
  );
}
