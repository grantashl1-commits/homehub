import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Keyboard, Mic, X } from "lucide-react";
import confetti from "canvas-confetti";
import { useHub, activeHabit, activeHabits, familyStreak, habitStreak } from "@/lib/store";
import { habitDueOn } from "@/lib/habit-stats";
import { useIsPhone } from "@/lib/useIsPhone";
import { HABIT_PRESETS } from "@/lib/catalog";
import { pal } from "@/lib/pals";
import { dateKey, fromDateKey } from "@/lib/time";
import { sfx, speak } from "@/lib/device";
import type { Habit, Member } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { AudioPlayer, VoiceRecorder } from "@/components/Voice";
import { BigButton, ChoreIcon, ReadAloud } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useTranscriber } from "@/lib/transcribe";
import { RecordPill, SaveReflection } from "@/components/ReflectionRecorder";
import { pointpalsAward, pointpalsAwardHabit, usePointPals } from "@/lib/integrations/pointpals";
import { canListen, listenOnce } from "@/lib/device";
import { celebrate } from "@/components/Celebrate";
import { toast } from "sonner";

type Phase = "intro" | "ask" | "why" | "nominate" | "summary";

/** One question at the table: a person and one of their habits (none yet: pick one). */
interface Step {
  member: Member;
  habit?: Habit;
  /** 1-based place among this person's habits tonight, and how many they have. */
  n: number;
  of: number;
}

function stepsFor(members: Member[], habits: Habit[], day = new Date()): Step[] {
  return members.flatMap((m) => {
    const all = activeHabits(habits, m.id);
    if (!all.length) return [{ member: m, n: 1, of: 1 }];
    const due = all.filter((h) => habitDueOn(h, day));
    return due.map((h, i) => ({ member: m, habit: h, n: i + 1, of: due.length }));
  });
}

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
  const phone = useIsPhone();

  const steps = useMemo(() => stepsFor(members, habits), [members, habits]);
  const step = steps[index];
  const person = step?.member;
  const habit = step?.habit;
  const nextStep = steps[index + 1];
  const next = nextStep?.member;
  const personIndex = person ? members.indexOf(person) : 0;
  const tonight = useMemo(() => checkins.filter((c) => c.date === today), [checkins, today]);
  const answered = (m: Member) => {
    const mine = tonight.filter((c) => c.memberId === m.id);
    return mine.find((c) => c.status === "done") ?? mine[0];
  };

  const advance = () => {
    setBusy(false);
    setWhy("");
    setWhyMode("choose");
    if (nextStep) {
      setIndex(index + 1);
      setPhase("ask");
      sfx.pop();
    } else {
      // After everyone's habits: anyone earned a marble from the family today?
      setPhase("nominate");
      sfx.pop();
      speak("Would you like to give a marble to anyone today? If so, why?");
    }
  };

  const finishNight = () => {
    completeNight(members.map((m) => m.id));
    setPhase("summary");
    sfx.success();
    if (!reducedMotion) void confetti({ particleCount: 180, spread: 110, origin: { y: 0.6 }, scalar: 1.3 });
  };
  const [nominations, setNominations] = useState<{ memberId: string; why: string }[]>([]);

  const yes = () => {
    if (!person || !habit || busy) return;
    setBusy(true);
    checkIn({ habitId: habit.id, memberId: person.id, status: "done" });
    // A habit done drops a marble in that person's PointPals jar (once a day).
    if (person.pointpalsKidId) void pointpalsAwardHabit(person.pointpalsKidId, habit).catch(() => {});
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
      className="relative flex h-full flex-col overflow-hidden px-[2.4rem] py-[1.8rem] transition-[background] duration-700 max-md:h-auto max-md:min-h-[100dvh] max-md:overflow-visible max-md:px-4 max-md:pb-8 max-md:pt-[max(0.8rem,env(safe-area-inset-top))]"
      style={{
        background: bg
          ? `radial-gradient(80% 70% at 50% 10%, ${bg.tint} 0%, transparent 70%), linear-gradient(170deg, #fff6e9 0%, ${bg.tint} 100%)`
          : "linear-gradient(160deg,#ffe9c9 0%,#fbd3d8 50%,#e3d6ff 100%)",
      }}
    >
      <header className="flex items-center justify-between max-md:flex-wrap max-md:gap-y-3">
        <div className="flex items-center gap-3 max-md:order-1 max-md:gap-1.5">
          {members.map((m, i) => {
            const a = answered(m);
            return (
              <div key={m.id} className="relative">
                <Avatar member={m} size={phone ? 3 : 3.4} dim={phase !== "summary" && i > personIndex && !a} ring={i === personIndex && phase !== "summary" && phase !== "intro"} />
                {a && (
                  <span className="absolute -bottom-1 -right-1 grid size-[1.7rem] place-items-center rounded-full bg-white text-[1rem] shadow">
                    {a.status === "done" ? "✅" : "☁️"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex min-w-0 items-center gap-4 max-md:order-3 max-md:w-full max-md:justify-center">
          <p className="font-display text-[2.2rem] font-black max-xl:hidden">Dinnertime reflection 🍽️</p>
          <RecordPill t={recorder} />
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={() => navigate("/")}
          className="tap grid size-[4rem] shrink-0 place-items-center rounded-full bg-white shadow-[var(--shadow-soft)] max-md:order-2"
        >
          <X className="size-8" strokeWidth={3} />
        </button>
      </header>

      <div className="relative min-h-0 flex-1 max-md:flex-none">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <Stage key="intro">
              <div className="relative h-[19rem] w-[34rem] max-md:h-[15rem] max-md:w-[26rem]">
                <div className="absolute left-1/2 top-1/2 size-[13rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-[var(--shadow-lift)] max-md:size-[9rem]">
                  <span className="absolute inset-0 grid place-items-center text-[6rem] max-md:text-[4.2rem]">🍽️</span>
                </div>
                {members.map((m, i) => {
                  const angle = (i / members.length) * Math.PI * 2 - Math.PI / 2;
                  return (
                    <motion.div
                      key={m.id}
                      className="absolute left-1/2 top-1/2"
                      initial={{ x: "-50%", y: "-50%", scale: 0 }}
                      animate={{ x: `calc(-50% + ${Math.cos(angle) * (phone ? 10 : 13.5)}rem)`, y: `calc(-50% + ${Math.sin(angle) * (phone ? 5.6 : 7.8)}rem)`, scale: 1 }}
                      transition={{ delay: 0.1 + i * 0.08, type: "spring", stiffness: 260, damping: 18 }}
                    >
                      <Avatar member={m} size={phone ? 4.2 : 5.4} ring />
                    </motion.div>
                  );
                })}
              </div>
              <h1 className="mt-4 text-center font-display text-[4.6rem] font-black leading-none">Let's go round the table</h1>
              <p className="max-w-[44rem] text-center text-[1.6rem] font-bold text-ink-2 max-md:text-[1.35rem]">
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
                Start with {steps[0]?.member.name}
              </BigButton>
            </Stage>
          )}

          {phase === "ask" && person && (
            <Stage key={`ask-${index}`}>
              <Avatar member={person} size={phone ? 7.5 : 11} float />
              <h1 className="font-display text-[4.4rem] font-black leading-none" style={{ color: pal(person.palId).ink }}>
                {person.name}'s turn
              </h1>
              {step.of > 1 && (
                <p className="-mt-2 rounded-full bg-white/80 px-4 py-1 text-[1.2rem] font-black text-ink-2">
                  Habit {step.n} of {step.of}
                </p>
              )}
              {habit ? (
                <>
                  <div className="flex items-center gap-4 rounded-[2rem] bg-white px-7 py-4 shadow-[var(--shadow-soft)] max-md:w-full max-md:gap-3 max-md:px-4 max-md:py-3">
                    <ChoreIcon icon={habit.icon} size={phone ? 4.2 : 5} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[1.15rem] font-black uppercase tracking-[0.08em] text-ink-3">My habit</p>
                      <p className="font-display text-[2.6rem] font-black leading-none max-md:text-[1.9rem]">{habit.title}</p>
                      <p className="text-[1.2rem] font-bold text-ink-2">
                        {habitStreak(checkins, habit.id) > 0 ? `🔥 ${habitStreak(checkins, habit.id)} days in a row` : "Let's start a streak!"}
                      </p>
                    </div>
                    <ReadAloud text={`${person.name}, did you ${habit.title.toLowerCase()} today?`} />
                  </div>
                  <p className="font-display text-[3rem] font-black max-md:text-[2.2rem]">Did you do it today?</p>
                  <div className="flex gap-6 max-md:w-full max-md:gap-3">
                    <BigButton tone="sage" size="xl" className="min-w-[19rem] max-md:min-w-0 max-md:flex-1 max-md:px-3" onClick={yes}>
                      Yes! 🎉
                    </BigButton>
                    <BigButton tone="white" size="xl" className="min-w-[19rem] text-lilac-ink max-md:min-w-0 max-md:flex-1 max-md:px-3" onClick={notToday}>
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
            <Stage key={`why-${index}`}>
              <Avatar member={person} size={phone ? 6 : 8} />
              <h1 className="font-display text-[4rem] font-black leading-none">That's okay, {person.name} 💛</h1>
              <p className="text-[1.8rem] font-bold text-ink-2">What got in the way?</p>
              {whyMode === "choose" && (
                <div className="flex flex-wrap justify-center gap-5 max-md:gap-3">
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
                <div className="flex w-[min(44rem,100%)] flex-col gap-4">
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
                <div className="w-[min(44rem,100%)] rounded-[2rem] bg-white/80 p-5">
                  <VoiceRecorder color={pal(person.palId).shade} onSaved={(id) => saveWhy(id)} />
                </div>
              )}
            </Stage>
          )}

          {phase === "nominate" && (
            <Stage key="nominate">
              <Nominate given={nominations} listening={recorder.listening} onGive={(n) => setNominations((x) => [...x, n])} onDone={finishNight} />
            </Stage>
          )}

          {phase === "summary" && (
            <Summary key="summary" onDone={() => navigate("/")} streak={familyStreak(nights)} onRenew={(id) => updateHabit(id, { startDate: today })}>
              {nominations.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {nominations.map((n, i) => {
                    const m = members.find((x) => x.id === n.memberId);
                    return (
                      <span key={i} className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[1.2rem] font-extrabold shadow-sm">
                        <ChoreIcon icon="thumbs up.png" size={2.2} /> {m?.name}
                        {n.why && <span className="font-bold text-ink-2">· {n.why}</span>}
                      </span>
                    );
                  })}
                </div>
              )}
              <SaveReflection t={recorder} />
            </Summary>
          )}
        </AnimatePresence>
      </div>

      {phase === "ask" && person && habit && next && (
        <button
          type="button"
          onClick={advance}
          className="tap absolute bottom-[1.8rem] right-[2.4rem] flex items-center gap-3 rounded-full bg-white/90 py-2 pl-5 pr-2 text-[1.35rem] font-black shadow-[var(--shadow-soft)] max-md:static max-md:mx-auto max-md:mt-6 max-md:text-[1.2rem]"
        >
          {next.id === person.id ? "Skip this one" : `Skip, pass to ${next.name}`}
          <Avatar member={next} size={3.2} />
        </button>
      )}
    </div>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="no-scrollbar absolute inset-0 flex flex-col items-center gap-5 overflow-y-auto py-3 text-center max-md:relative max-md:inset-auto max-md:gap-4 max-md:overflow-visible max-md:py-6 [&>*:first-child]:mt-auto [&>*:last-child]:mb-auto"
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
      <div className="grid grid-cols-4 gap-3 max-md:w-full max-md:grid-cols-2">
        {presets.map((h) => (
          <button
            key={h.title}
            type="button"
            onClick={() => {
              sfx.pop();
              onPick({ title: h.title, icon: h.icon, frequency: { kind: "daily" } });
            }}
            className="tap flex w-[11rem] flex-col items-center gap-1.5 rounded-[1.6rem] bg-white p-3 shadow-[var(--shadow-soft)] max-md:w-auto"
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
      <div className="grid w-full max-w-[64rem] grid-cols-4 gap-4 max-md:grid-cols-2 max-md:gap-3">
        {members.map((m) => {
          const h = activeHabit(habits, m.id);
          const mine = checkins.filter((x) => x.memberId === m.id && x.date === today);
          const c = mine.find((x) => x.status === "done") ?? mine[0];
          const won = mine.filter((x) => x.status === "done").length;
          const p = pal(m.palId);
          const age = h ? (Date.now() - fromDateKey(h.startDate).getTime()) / 86400000 : 0;
          return (
            <div key={m.id} className="flex flex-col items-center gap-2 rounded-[1.8rem] bg-white p-4 text-center shadow-[var(--shadow-soft)]">
              <Avatar member={m} size={5} />
              <p className="font-display text-[2rem] font-black leading-none" style={{ color: p.ink }}>
                {m.name}
              </p>
              <p className={cn("rounded-full px-3 py-0.5 text-[1.15rem] font-black", c?.status === "done" ? "bg-sage-tint text-sage-ink" : "bg-lilac-tint text-lilac-ink")}>
                {c?.status === "done" ? (mine.length > 1 ? `✅ ${won} of ${mine.length}` : "✅ Did it!") : c ? "☁️ Not today" : "—"}
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

const REASONS = ["Being kind", "Helping out", "Working hard", "Being brave", "Sharing", "Making us laugh"];

/**
 * "Would you like to give a marble to anyone today? Why?" Pick a person, say
 * or type why (or tap a reason), and a 👍 marble goes in their PointPals jar
 * (or their hub marbles when they're not in PointPals). As many as you like.
 */
function Nominate({
  given,
  listening,
  onGive,
  onDone,
}: {
  given: { memberId: string; why: string }[];
  listening: boolean;
  onGive: (n: { memberId: string; why: string }) => void;
  onDone: () => void;
}) {
  const members = useHub((s) => s.members);
  const ppReady = usePointPals((s) => !!s.userId && !!s.household);
  const [who, setWho] = useState<Member | null>(null);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [hearing, setHearing] = useState(false);
  const phone = useIsPhone();

  const give = async () => {
    if (!who || busy) return;
    setBusy(true);
    const reason = why.trim();
    try {
      if (ppReady && who.pointpalsKidId) {
        await pointpalsAward(who.pointpalsKidId, { name: reason ? `Marble from the family: ${reason}` : "Marble from the family", icon: "thumbs up.png", points: 1 });
      } else {
        useHub.getState().addLocalMarbles(who.id, 1);
      }
      sfx.marble();
      celebrate({ title: `A marble for ${who.name}!`, subtitle: reason || "From the whole family", palId: who.palId, photo: who.photo });
      onGive({ memberId: who.id, why: reason });
      setWho(null);
      setWhy("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PointPals didn't take that marble");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex w-full max-w-[64rem] flex-col items-center gap-3.5">
      {!who && <ChoreIcon icon="thumbs up.png" size={phone ? 5 : 6.4} />}
      <div className="flex items-center gap-3">
        <h1 className="font-display text-[3.2rem] font-black leading-none max-md:text-[2.4rem]">Give a marble to anyone today?</h1>
        <ReadAloud text="Would you like to give a marble to anyone today? If so, why?" />
      </div>
      <p className="text-[1.5rem] font-bold text-ink-2">Who did something great? Tap them, then tell us why.</p>
      <div className="flex flex-wrap justify-center gap-4 max-md:gap-2.5">
        {members.map((m) => {
          const gotOne = given.some((g) => g.memberId === m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                sfx.pop();
                setWho(who?.id === m.id ? null : m);
              }}
              aria-pressed={who?.id === m.id}
              className={cn("tap relative flex flex-col items-center gap-1 rounded-[1.8rem] bg-white/80 p-3 shadow-[var(--shadow-soft)]", who?.id === m.id && "ring-[0.35rem] ring-sage")}
            >
              <Avatar member={m} size={phone ? 4.6 : who ? 4.6 : 6} />
              <span className="font-display text-[1.7rem] font-black">{m.name}</span>
              {gotOne && <span className="absolute -right-1 -top-1 grid size-[2.6rem] place-items-center rounded-full bg-sage text-[1.3rem] shadow">👍</span>}
            </button>
          );
        })}
      </div>
      {who && (
        <div className="flex w-full max-w-[50rem] flex-col gap-3 rounded-[2rem] bg-white/85 p-4 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap justify-center gap-2">
            {REASONS.map((r) => (
              <button key={r} type="button" onClick={() => (sfx.tap(), setWhy(r))} className={cn("tap rounded-full px-4 py-2 text-[1.2rem] font-black", why === r ? "bg-ink text-white" : "bg-paper text-ink-2")}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              maxLength={120}
              placeholder={`Why does ${who.name} get a marble?`}
              className="h-[4.6rem] min-w-0 flex-1 rounded-[1.2rem] border-2 border-line bg-white px-4 text-[1.4rem] font-bold outline-none focus:border-sky"
            />
            {canListen() && !listening && (
              <button
                type="button"
                aria-label="Say why"
                disabled={hearing}
                onClick={async () => {
                  setHearing(true);
                  const said = await listenOnce().promise;
                  setHearing(false);
                  if (said) setWhy(said.replace(/^./, (c) => c.toUpperCase()));
                }}
                className={cn("tap grid size-[4.6rem] shrink-0 place-items-center rounded-[1.2rem] text-white", hearing ? "bg-coral" : "bg-ink")}
              >
                <Mic className="size-7" />
              </button>
            )}
          </div>
          <BigButton tone="sage" size="lg" disabled={busy} onClick={() => void give()} icon={<ChoreIcon icon="thumbs up.png" size={3} />}>
            Give {who.name} a marble
          </BigButton>
        </div>
      )}
      <BigButton size="lg" tone={given.length ? "coral" : "white"} onClick={onDone} icon={<ArrowRight className="size-8" strokeWidth={3} />}>
        {given.length ? "All done" : "Not today"}
      </BigButton>
    </div>
  );
}
