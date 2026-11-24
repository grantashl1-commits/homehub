/**
 * Habit Adventure: the habit worksheet as a game, for each kid from their Me
 * page (/me/:id/adventure).
 *
 * 1. Which ones sound fun? Picture cards, read aloud, three faces to tap.
 * 2. Habit games: colour the rainbow, join the dots, the toothbrush maze, and
 *    "when do we do it?". Play any or all of them.
 * 3. Pick a habit (the ones you loved come first), when you'll do it, and a
 *    hold-to-sign high-five promise. That adds the habit, so it comes up at
 *    dinnertime reflection.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Volume2, X } from "lucide-react";
import { useHub, activeHabits, MAX_HABITS } from "@/lib/store";
import { useMember } from "@/lib/hooks";
import { HABIT_PRESETS } from "@/lib/catalog";
import { pal } from "@/lib/pals";
import { sfx, speak } from "@/lib/device";
import { Avatar } from "@/components/Avatar";
import { BigButton, ChoreIcon, EmptyState } from "@/components/ui";
import { celebrate } from "@/components/Celebrate";
import { cn } from "@/lib/utils";
import { useIsPhone } from "@/lib/useIsPhone";
import type { Member } from "@/lib/types";

type Feeling = "yes" | "maybe" | "no";
type Stage = "intro" | "like" | "games" | "colour" | "dots" | "maze" | "when" | "pick" | "time" | "promise" | "done";
type GameId = "colour" | "dots" | "maze" | "when";

interface HabitIdea {
  title: string;
  icon: string;
  /** What the kid says in the promise, e.g. "brush my teeth". */
  say: string;
}

const KID_HABITS: HabitIdea[] = HABIT_PRESETS.filter((h) => h.forKids).map((h) => ({
  title: h.title,
  icon: h.icon,
  say: h.title.charAt(0).toLowerCase() + h.title.slice(1),
}));
// Extras from the worksheet that aren't in the picture library: emoji pictures.
const EXTRAS: HabitIdea[] = [
  { title: "Drink my water", icon: "💧", say: "drink my water" },
  { title: "Wash my hands", icon: "🧼", say: "wash my hands" },
  { title: "Get dressed myself", icon: "👕", say: "get dressed by myself" },
];
const IDEAS = [...KID_HABITS, ...EXTRAS];

const FACES: { id: Feeling; emoji: string; label: string; bg: string }[] = [
  { id: "yes", emoji: "😀", label: "Yes please!", bg: "bg-sage" },
  { id: "maybe", emoji: "🤔", label: "Maybe", bg: "bg-sun" },
  { id: "no", emoji: "🙅", label: "Not yet", bg: "bg-lilac" },
];

const TIMES = [
  { id: "morning", emoji: "🌅", label: "Morning", say: "every morning" },
  { id: "afternoon", emoji: "☀️", label: "After school", say: "after school" },
  { id: "bedtime", emoji: "🌙", label: "Bedtime", say: "at bedtime" },
] as const;

const GAMES: { id: GameId; emoji: string; title: string; blurb: string; tint: string }[] = [
  { id: "colour", emoji: "🌈", title: "Colour the rainbow", blurb: "Tap a colour, then tap to fill", tint: "bg-coral-tint" },
  { id: "dots", emoji: "⭐", title: "Join the dots", blurb: "Tap 1 to 10 to find a reward", tint: "bg-sun-tint" },
  { id: "maze", emoji: "🪥", title: "Toothbrush maze", blurb: "Help the brush find the tooth", tint: "bg-sky-tint" },
  { id: "when", emoji: "🕐", title: "When do we do it?", blurb: "Morning, afternoon or bedtime?", tint: "bg-lilac-tint" },
];

export default function HabitAdventure() {
  const { id } = useParams();
  const member = useMember(id);
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("intro");
  const [feelings, setFeelings] = useState<Record<string, Feeling>>({});
  const [played, setPlayed] = useState<GameId[]>([]);
  const [choice, setChoice] = useState<HabitIdea | null>(null);
  const [time, setTime] = useState<(typeof TIMES)[number] | null>(null);

  if (!member) return <EmptyState emoji="🤔" title="Who's playing?" action={<BigButton onClick={() => navigate("/me")}>Pick someone</BigButton>} />;
  const p = pal(member.palId);
  const finishGame = (g: GameId) => {
    setPlayed((x) => (x.includes(g) ? x : [...x, g]));
    setStage("games");
  };
  const back: Partial<Record<Stage, Stage>> = { like: "intro", games: "like", colour: "games", dots: "games", maze: "games", when: "games", pick: "games", time: "pick", promise: "time" };

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden px-[2.4rem] py-[1.6rem] max-md:h-auto max-md:min-h-[100dvh] max-md:overflow-visible max-md:px-4 max-md:pb-8 max-md:pt-[max(0.8rem,env(safe-area-inset-top))]"
      style={{ background: `radial-gradient(80% 60% at 50% 0%, ${p.tint} 0%, transparent 70%), linear-gradient(170deg, #fff8ec 0%, ${p.tint} 100%)` }}
    >
      <header className="flex items-center gap-3">
        {back[stage] ? (
          <button type="button" aria-label="Back" onClick={() => (sfx.tap(), setStage(back[stage]!))} className="tap grid size-[4.4rem] shrink-0 place-items-center rounded-full bg-white shadow-[var(--shadow-soft)]">
            <ArrowLeft className="size-7" strokeWidth={3} />
          </button>
        ) : (
          <Avatar member={member} size={4.4} />
        )}
        <p className="min-w-0 flex-1 truncate font-display text-[2.2rem] font-black leading-none max-md:text-[1.8rem]" style={{ color: p.ink }}>
          {member.name}'s Habit Adventure
        </p>
        <Progress stage={stage} />
        <button type="button" aria-label="Close" onClick={() => navigate(`/me/${member.id}`)} className="tap grid size-[4.4rem] shrink-0 place-items-center rounded-full bg-white shadow-[var(--shadow-soft)]">
          <X className="size-7" strokeWidth={3} />
        </button>
      </header>

      <div className="relative min-h-0 flex-1 max-md:flex-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 py-4 text-center max-md:relative max-md:inset-auto max-md:gap-4 max-md:py-6"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
          >
            {stage === "intro" && <Intro member={member} onStart={() => setStage("like")} />}
            {stage === "like" && (
              <LikeCards
                member={member}
                feelings={feelings}
                onFeel={(title, f) => setFeelings((x) => ({ ...x, [title]: f }))}
                onDone={() => {
                  setStage("games");
                  speak("Brilliant! Now let's play some habit games.");
                }}
              />
            )}
            {stage === "games" && <GameHub played={played} onPlay={(g) => setStage(g)} onNext={() => setStage("pick")} />}
            {stage === "colour" && <ColourRainbow onDone={() => finishGame("colour")} />}
            {stage === "dots" && <JoinDots member={member} onDone={() => finishGame("dots")} />}
            {stage === "maze" && <Maze onDone={() => finishGame("maze")} />}
            {stage === "when" && <WhenGame onDone={() => finishGame("when")} />}
            {stage === "pick" && <PickHabit member={member} feelings={feelings} onPick={(h) => (setChoice(h), setStage("time"))} />}
            {stage === "time" && choice && (
              <PickTime
                habit={choice}
                onPick={(t) => {
                  setTime(t);
                  setStage("promise");
                }}
              />
            )}
            {stage === "promise" && choice && time && <PromiseStep member={member} habit={choice} time={time} onSigned={() => setStage("done")} />}
            {stage === "done" && choice && <Done member={member} habit={choice} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Bits ─────────────────────────────────────────────────────────────── */

function Say({ text, label = "Read it to me" }: { text: string; label?: string }) {
  return (
    <button type="button" aria-label={label} onClick={() => (sfx.tap(), speak(text))} className="tap grid size-[4.4rem] shrink-0 place-items-center rounded-full bg-white shadow-[var(--shadow-soft)]">
      <Volume2 className="size-7 text-sky" />
    </button>
  );
}

function Progress({ stage }: { stage: Stage }) {
  const step = stage === "intro" || stage === "like" ? 0 : ["games", "colour", "dots", "maze", "when"].includes(stage) ? 1 : 2;
  return (
    <div className="flex items-center gap-1.5 max-md:hidden" aria-label={`Part ${step + 1} of 3`}>
      {["Fun?", "Games", "My habit"].map((l, i) => (
        <span key={l} className={cn("rounded-full px-3 py-1 text-[1.1rem] font-black", i === step ? "bg-ink text-white" : i < step ? "bg-sage-tint text-sage-ink" : "bg-white/70 text-ink-3")}>
          {i < step ? "✓ " : ""}
          {l}
        </span>
      ))}
    </div>
  );
}

function Title({ children, say }: { children: React.ReactNode; say?: string }) {
  return (
    <div className="flex items-center gap-3">
      <h1 className="font-display text-[3.6rem] font-black leading-none max-md:text-[2.4rem]">{children}</h1>
      {say && <Say text={say} />}
    </div>
  );
}

/* ── Intro ────────────────────────────────────────────────────────────── */

function Intro({ member, onStart }: { member: Member; onStart: () => void }) {
  const phone = useIsPhone();
  useEffect(() => {
    const t = window.setTimeout(() => speak(`Hi ${member.name}! Let's go on a habit adventure and find a habit you'd love to try.`), 400);
    return () => window.clearTimeout(t);
  }, [member.name]);
  return (
    <>
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 2.4, repeat: Infinity }}>
        <Avatar member={member} size={phone ? 9 : 12} />
      </motion.div>
      <h1 className="font-display text-[5rem] font-black leading-none max-md:text-[3rem]">Habit Adventure! 🗺️</h1>
      <p className="max-w-[46rem] text-[1.7rem] font-bold text-ink-2 max-md:text-[1.4rem]">
        Little things we do every day help us grow big and strong. Let's find a habit you'd love to try!
      </p>
      <div className="flex flex-wrap justify-center gap-3 text-[1.3rem] font-black">
        <span className="rounded-full bg-white px-4 py-1.5 shadow-sm">1 😀 Which sound fun?</span>
        <span className="rounded-full bg-white px-4 py-1.5 shadow-sm">2 🎮 Habit games</span>
        <span className="rounded-full bg-white px-4 py-1.5 shadow-sm">3 ⭐ Pick my habit</span>
      </div>
      <BigButton size="xl" onClick={onStart} icon={<ArrowRight className="size-9" strokeWidth={3} />}>
        Let's go!
      </BigButton>
    </>
  );
}

/* ── 1. Which ones sound fun? ─────────────────────────────────────────── */

function LikeCards({
  member,
  feelings,
  onFeel,
  onDone,
}: {
  member: Member;
  feelings: Record<string, Feeling>;
  onFeel: (title: string, f: Feeling) => void;
  onDone: () => void;
}) {
  const [i, setI] = useState(() => Math.min(Object.keys(feelings).length, IDEAS.length - 1));
  const idea = IDEAS[i];
  const p = pal(member.palId);
  const phone = useIsPhone();
  useEffect(() => {
    speak(`${idea.title}. Does that sound fun?`);
  }, [idea.title]);

  const feel = (f: Feeling) => {
    onFeel(idea.title, f);
    if (f === "yes") sfx.success();
    else sfx.pop();
    if (i + 1 < IDEAS.length) window.setTimeout(() => setI(i + 1), 280);
    else window.setTimeout(onDone, 350);
  };

  return (
    <>
      <Title>Which ones sound fun?</Title>
      <div className="flex gap-1.5" aria-label={`${i + 1} of ${IDEAS.length}`}>
        {IDEAS.map((h, j) => (
          <span key={h.title} className={cn("size-[1.1rem] rounded-full", j === i ? "bg-ink" : feelings[h.title] === "yes" ? "bg-sage" : feelings[h.title] ? "bg-ink/30" : "bg-white")} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={idea.title}
          initial={{ rotate: -6, scale: 0.85, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 6, scale: 0.85, opacity: 0, x: 80 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="flex w-[min(30rem,86vw)] flex-col items-center gap-3 rounded-[2.4rem] bg-white p-6 shadow-[var(--shadow-lift)]"
          style={{ boxShadow: `0 0 0 0.5rem ${p.tint}, var(--shadow-lift)` }}
        >
          <ChoreIcon icon={idea.icon} size={phone ? 10 : 13} />
          <div className="flex items-center gap-3">
            <p className="font-display text-[2.8rem] font-black leading-none max-md:text-[2.2rem]">{idea.title}</p>
            <Say text={`${idea.title}. Does that sound fun?`} />
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="grid w-full max-w-[52rem] grid-cols-3 gap-4 max-md:gap-2.5">
        {FACES.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => feel(f.id)}
            className={cn("tap flex flex-col items-center gap-1 rounded-[2rem] py-4 text-white shadow-[var(--shadow-soft)] max-md:rounded-[1.5rem] max-md:py-3", f.bg)}
          >
            <span className="text-[4.4rem] leading-none max-md:text-[3.4rem]">{f.emoji}</span>
            <span className="font-display text-[1.9rem] font-black text-ink max-md:text-[1.4rem]">{f.label}</span>
          </button>
        ))}
      </div>
      {i > 0 && (
        <button type="button" onClick={() => setI(i - 1)} className="text-[1.25rem] font-extrabold text-ink-2 underline">
          Go back one
        </button>
      )}
    </>
  );
}

/* ── 2. Games ─────────────────────────────────────────────────────────── */

function GameHub({ played, onPlay, onNext }: { played: GameId[]; onPlay: (g: GameId) => void; onNext: () => void }) {
  return (
    <>
      <Title say="Habit games! Pick a game to play. When you're ready, pick your habit.">Habit games 🎮</Title>
      <div className="grid w-full max-w-[64rem] grid-cols-2 gap-4 max-md:gap-2.5">
        {GAMES.map((g) => {
          const done = played.includes(g.id);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => (sfx.pop(), onPlay(g.id))}
              className={cn("tap relative flex flex-col items-center gap-1.5 rounded-[2rem] p-5 shadow-[var(--shadow-soft)] ring-1 ring-black/5 max-md:rounded-[1.5rem] max-md:p-3", g.tint)}
            >
              {done && (
                <span className="absolute right-3 top-3 grid size-[3rem] place-items-center rounded-full bg-sage text-white">
                  <Check className="size-5" strokeWidth={4} />
                </span>
              )}
              <span className="text-[4.6rem] leading-none max-md:text-[3.4rem]">{g.emoji}</span>
              <span className="font-display text-[2.1rem] font-black leading-none max-md:text-[1.6rem]">{g.title}</span>
              <span className="text-[1.15rem] font-bold text-ink-2 max-md:text-[1rem]">{g.blurb}</span>
            </button>
          );
        })}
      </div>
      <BigButton size="xl" tone={played.length ? "coral" : "white"} onClick={onNext} icon={<ArrowRight className="size-9" strokeWidth={3} />}>
        Pick my habit ⭐
      </BigButton>
    </>
  );
}

const PALETTE = ["#EE5B5B", "#F59A3E", "#F6D04E", "#6FB784", "#64A3D8", "#8A6FD8", "#EC8EA8", "#8B5E3C", "#ffffff"];

/** Tap a crayon, then tap the picture to fill it in. */
function ColourRainbow({ onDone }: { onDone: () => void }) {
  const [crayon, setCrayon] = useState(PALETTE[0]);
  const [fills, setFills] = useState<Record<string, string>>({});
  const fill = (id: string) => () => {
    sfx.pop();
    setFills((f) => ({ ...f, [id]: crayon }));
  };
  const c = (id: string) => fills[id] ?? "#fff";
  const region = (id: string) => ({ fill: c(id), stroke: "#23263b", strokeWidth: 3.2, strokeLinejoin: "round" as const, onClick: fill(id), style: { cursor: "pointer" } });
  const bands = Array.from({ length: 5 }, (_, i) => {
    const r = 230 - i * 26;
    return `M ${300 - r} 280 A ${r} ${r} 0 0 1 ${300 + r} 280 L ${300 + r - 26} 280 A ${r - 26} ${r - 26} 0 0 0 ${300 - r + 26} 280 Z`;
  });
  const cloud = "M0 40 q-2 -24 22 -24 q6 -18 28 -14 q18 -14 36 4 q24 -2 24 20 q14 4 8 16 h-114 q-8 -2 -4 -2z";
  const filled = Object.keys(fills).length;

  return (
    <>
      <Title say="Colour the rainbow! Tap a colour, then tap the picture to fill it in.">Colour the rainbow 🌈</Title>
      <div className="flex flex-wrap justify-center gap-2">
        {PALETTE.map((col) => (
          <button
            key={col}
            type="button"
            aria-label={col === "#ffffff" ? "Rubber" : `Colour ${col}`}
            onClick={() => (sfx.tap(), setCrayon(col))}
            className={cn("tap size-[4.4rem] rounded-full ring-2 ring-black/10 transition-transform", crayon === col && "scale-110 ring-[0.35rem] ring-ink")}
            style={{ background: col }}
          >
            {col === "#ffffff" && "🧽"}
          </button>
        ))}
      </div>
      <svg viewBox="0 0 600 440" className="w-full max-w-[60rem] rounded-[2rem] bg-white shadow-[var(--shadow-soft)] max-md:rounded-[1.4rem]" style={{ touchAction: "manipulation" }}>
        <rect x="0" y="0" width="600" height="440" {...region("sky")} strokeWidth={0} />
        {bands.map((d, i) => (
          <path key={i} d={d} {...region(`band${i}`)} />
        ))}
        <g transform="translate(20 240) scale(1.05)">
          <path d={cloud} {...region("cloudL")} />
        </g>
        <g transform="translate(460 240) scale(1.05)">
          <path d={cloud} {...region("cloudR")} />
        </g>
        <circle cx="530" cy="70" r="40" {...region("sun")} />
        <path d="M530 12 v-8 M530 128 v8 M472 70 h-8 M588 70 h8 M489 29 l-6 -6 M571 111 l6 6 M571 29 l6 -6 M489 111 l-6 6" stroke="#23263b" strokeWidth={3.2} strokeLinecap="round" pointerEvents="none" />
        <path d="M518 64 v4 M542 64 v4 M516 82 q14 12 28 0" stroke="#23263b" strokeWidth={3.2} strokeLinecap="round" fill="none" pointerEvents="none" />
        <path d="M0 440 V340 q120 -60 260 -10 q150 -60 340 0 V440z" {...region("hillBack")} />
        <path d="M0 440 V395 q150 -40 300 0 q150 -40 300 0 V440z" {...region("hillFront")} />
        <path d="M70 60 l9 18 l20 3 l-15 14 l4 20 l-18 -10 l-18 10 l4 -20 l-15 -14 l20 -3z" {...region("star")} />
      </svg>
      <BigButton size="lg" tone={filled >= 4 ? "sage" : "white"} onClick={() => (celebrate({ title: "Beautiful!", emoji: "🌈" }), onDone())}>
        {filled >= 4 ? "I'm finished! 🎨" : "Done"}
      </BigButton>
    </>
  );
}

/** Tap the dots 1 to 10 to draw the reward star. */
function JoinDots({ member, onDone }: { member: Member; onDone: () => void }) {
  const [next, setNext] = useState(0);
  const [wrong, setWrong] = useState<number | null>(null);
  const p = pal(member.palId);
  const pts = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 ? 58 : 130;
        return [160 + r * Math.cos(a), 160 + r * Math.sin(a)] as const;
      }),
    [],
  );
  const finished = next >= 10;
  useEffect(() => {
    if (finished) {
      celebrate({ title: "A reward star!", subtitle: "You get one for every habit you do", emoji: "⭐" });
      speak("A reward star! You get one for every habit you do.");
    }
  }, [finished]);

  const tap = (i: number) => {
    if (finished) return;
    if (i === next) {
      sfx.pop();
      speak(String(i + 1));
      setNext(i + 1);
    } else {
      sfx.soft();
      setWrong(i);
      window.setTimeout(() => setWrong(null), 450);
    }
  };
  const path = pts.slice(0, next).map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ") + (finished ? " Z" : "");

  return (
    <>
      <Title say="Join the dots! Tap the numbers from 1 to 10.">Join the dots ⭐</Title>
      <p className="text-[1.5rem] font-bold text-ink-2">{finished ? "You found the reward star!" : `Tap number ${next + 1}`}</p>
      <svg viewBox="0 0 320 320" className="w-[min(46rem,88vw)] rounded-[2rem] bg-white shadow-[var(--shadow-soft)]">
        <motion.path d={path} fill={finished ? "#F6C64E" : "none"} stroke="#23263b" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" animate={{ fillOpacity: finished ? 1 : 0 }} />
        {finished && <path d="M146 158 v6 M174 158 v6 M144 178 q16 14 32 0" stroke="#23263b" strokeWidth={4} strokeLinecap="round" fill="none" />}
        {pts.map(([x, y], i) => {
          const done = i < next;
          const isNext = i === next;
          return (
            <motion.g key={i} onClick={() => tap(i)} style={{ cursor: "pointer" }} animate={wrong === i ? { x: [0, -5, 5, -3, 0] } : { x: 0 }} transition={{ duration: 0.35 }}>
              <circle cx={x} cy={y} r={22} fill={done ? p.shade : isNext ? "#fff" : "#fff"} stroke={isNext ? "#EE7B5B" : "#23263b"} strokeWidth={isNext ? 5 : 3} />
              <text x={x} y={y + 8} textAnchor="middle" style={{ font: "900 22px Zain, sans-serif", fill: done ? "#fff" : "#23263b", pointerEvents: "none" }}>
                {i + 1}
              </text>
            </motion.g>
          );
        })}
      </svg>
      {finished && (
        <BigButton size="lg" tone="sage" onClick={onDone}>
          Yay! Back to the games
        </BigButton>
      )}
    </>
  );
}

type Cell = { n: boolean; s: boolean; e: boolean; w: boolean };

function makeMaze(n: number): Cell[][] {
  const g = Array.from({ length: n }, () => Array.from({ length: n }, () => ({ n: true, s: true, e: true, w: true, v: false })));
  const stack: [number, number][] = [[0, 0]];
  g[0][0].v = true;
  const dirs = [["n", 0, -1, "s"], ["s", 0, 1, "n"], ["e", 1, 0, "w"], ["w", -1, 0, "e"]] as const;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const opts = dirs.filter(([, dx, dy]) => g[y + dy]?.[x + dx] && !g[y + dy][x + dx].v);
    if (!opts.length) {
      stack.pop();
      continue;
    }
    const [d, dx, dy, back] = opts[Math.floor(Math.random() * opts.length)];
    g[y][x][d] = false;
    g[y + dy][x + dx][back] = false;
    g[y + dy][x + dx].v = true;
    stack.push([x + dx, y + dy]);
  }
  return g;
}

/** Steer the toothbrush to the tooth with the arrows, a swipe, or the keyboard. */
function Maze({ onDone }: { onDone: () => void }) {
  const N = 6;
  const C = 50;
  const [maze, setMaze] = useState(() => makeMaze(N));
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [trail, setTrail] = useState<[number, number][]>([[0, 0]]);
  const [bump, setBump] = useState(0);
  const won = pos[0] === N - 1 && pos[1] === N - 1;
  const start = useRef<{ x: number; y: number } | null>(null);

  const move = useCallback(
    (d: "n" | "s" | "e" | "w") => {
      if (won) return;
      const [x, y] = pos;
      if (maze[y][x][d]) {
        sfx.soft();
        setBump((b) => b + 1);
        return;
      }
      const nx = x + (d === "e" ? 1 : d === "w" ? -1 : 0);
      const ny = y + (d === "s" ? 1 : d === "n" ? -1 : 0);
      sfx.tap();
      setPos([nx, ny]);
      setTrail((t) => [...t, [nx, ny]]);
    },
    [pos, maze, won],
  );

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const m = { ArrowUp: "n", ArrowDown: "s", ArrowLeft: "w", ArrowRight: "e" } as const;
      const d = m[e.key as keyof typeof m];
      if (d) {
        e.preventDefault();
        move(d);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [move]);

  useEffect(() => {
    if (won) {
      celebrate({ title: "Sparkly clean!", subtitle: "You found the tooth", emoji: "🦷" });
      speak("Sparkly clean! You found the tooth.");
    }
  }, [won]);

  let walls = "";
  maze.forEach((row, y) =>
    row.forEach((c, x) => {
      const X = 10 + x * C;
      const Y = 10 + y * C;
      if (c.n) walls += `M${X} ${Y}h${C}`;
      if (c.w) walls += `M${X} ${Y}v${C}`;
      if (y === N - 1 && c.s) walls += `M${X} ${Y + C}h${C}`;
      if (x === N - 1 && c.e) walls += `M${X + C} ${Y}v${C}`;
    }),
  );
  const centre = ([x, y]: [number, number]) => [10 + x * C + C / 2, 10 + y * C + C / 2];

  return (
    <>
      <Title say="Toothbrush maze! Use the arrows, or swipe, to help the toothbrush find the tooth.">Toothbrush maze 🪥</Title>
      <motion.svg
        viewBox={`0 0 ${N * C + 20} ${N * C + 20}`}
        className="w-[min(44rem,88vw)] rounded-[2rem] bg-white shadow-[var(--shadow-soft)]"
        style={{ touchAction: "none" }}
        animate={bump ? { x: [0, -6, 6, 0] } : undefined}
        key={`b${bump}`}
        onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          if (!start.current) return;
          const dx = e.clientX - start.current.x;
          const dy = e.clientY - start.current.y;
          start.current = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "e" : "w") : dy > 0 ? "s" : "n");
        }}
      >
        <polyline points={trail.map((t) => centre(t).join(",")).join(" ")} fill="none" stroke="#64A3D8" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" opacity={0.45} />
        <path d={walls} stroke="#23263b" strokeWidth={5} strokeLinecap="round" fill="none" />
        <text x={centre([N - 1, N - 1])[0]} y={centre([N - 1, N - 1])[1] + 13} textAnchor="middle" fontSize="36">
          🦷
        </text>
        <motion.text animate={{ x: centre(pos)[0], y: centre(pos)[1] + 13 }} transition={{ type: "spring", stiffness: 400, damping: 30 }} textAnchor="middle" fontSize="34">
          🪥
        </motion.text>
      </motion.svg>
      {won ? (
        <div className="flex gap-3">
          <BigButton
            size="lg"
            tone="white"
            onClick={() => {
              setMaze(makeMaze(N));
              setPos([0, 0]);
              setTrail([[0, 0]]);
            }}
          >
            New maze
          </BigButton>
          <BigButton size="lg" tone="sage" onClick={onDone}>
            Back to the games
          </BigButton>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <span />
          <ArrowKey label="Up" onPress={() => move("n")} icon={<ArrowUp className="size-9" strokeWidth={3} />} />
          <span />
          <ArrowKey label="Left" onPress={() => move("w")} icon={<ArrowLeft className="size-9" strokeWidth={3} />} />
          <ArrowKey label="Down" onPress={() => move("s")} icon={<ArrowDown className="size-9" strokeWidth={3} />} />
          <ArrowKey label="Right" onPress={() => move("e")} icon={<ArrowRight className="size-9" strokeWidth={3} />} />
        </div>
      )}
    </>
  );
}

function ArrowKey({ label, onPress, icon }: { label: string; onPress: () => void; icon: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} onClick={onPress} className="tap grid size-[6.4rem] place-items-center rounded-[1.6rem] bg-sky text-white shadow-[var(--shadow-soft)] max-md:size-[5.6rem]">
      {icon}
    </button>
  );
}

/** Match habits to a time of day. No wrong answers, just cheers. */
function WhenGame({ onDone }: { onDone: () => void }) {
  const items = useMemo(() => IDEAS.filter((h) => ["Brush my teeth", "Play outside", "Read a book", "Get ready for bed", "Drink my water"].includes(h.title)), []);
  const [i, setI] = useState(0);
  const [cheer, setCheer] = useState<string | null>(null);
  const item = items[i];
  const phone = useIsPhone();
  useEffect(() => {
    if (item) speak(`When do we ${item.say}?`);
  }, [item]);
  if (!item) return null;
  const pick = (t: (typeof TIMES)[number]) => {
    const line = `${item.title} ${t.say}. Great idea!`;
    sfx.success();
    setCheer(`${t.emoji} ${t.label}. Great idea!`);
    speak(line);
    window.setTimeout(() => {
      setCheer(null);
      if (i + 1 < items.length) setI(i + 1);
      else {
        celebrate({ title: "You know your habits!", emoji: "🕐" });
        onDone();
      }
    }, 1300);
  };
  return (
    <>
      <Title>When do we do it? 🕐</Title>
      <p className="text-[1.4rem] font-bold text-ink-2">There are no wrong answers!</p>
      <AnimatePresence mode="wait">
        <motion.div key={item.title} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex flex-col items-center gap-2 rounded-[2.2rem] bg-white px-10 py-6 shadow-[var(--shadow-lift)]">
          <ChoreIcon icon={item.icon} size={phone ? 8 : 10} />
          <div className="flex items-center gap-3">
            <p className="font-display text-[2.6rem] font-black leading-none max-md:text-[2rem]">{item.title}</p>
            <Say text={`When do we ${item.say}?`} />
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="h-[2.6rem] text-[1.8rem] font-black text-sage-ink">{cheer}</div>
      <div className="grid w-full max-w-[54rem] grid-cols-3 gap-4 max-md:gap-2.5">
        {TIMES.map((t) => (
          <button key={t.id} type="button" disabled={!!cheer} onClick={() => pick(t)} className="tap flex flex-col items-center gap-1 rounded-[2rem] bg-sun-tint py-5 shadow-[var(--shadow-soft)] ring-1 ring-black/5 disabled:opacity-60 max-md:rounded-[1.5rem] max-md:py-3">
            <span className="text-[4.4rem] leading-none max-md:text-[3.2rem]">{t.emoji}</span>
            <span className="font-display text-[1.9rem] font-black max-md:text-[1.4rem]">{t.label}</span>
          </button>
        ))}
      </div>
      <p className="text-[1.2rem] font-bold text-ink-3">
        {i + 1} of {items.length}
      </p>
    </>
  );
}

/* ── 3. Pick my habit ─────────────────────────────────────────────────── */

function PickHabit({ member, feelings, onPick }: { member: Member; feelings: Record<string, Feeling>; onPick: (h: HabitIdea) => void }) {
  const habits = useHub((s) => s.habits);
  const mine = activeHabits(habits, member.id);
  const has = new Set(mine.map((h) => h.title));
  const rank = (h: HabitIdea) => (feelings[h.title] === "yes" ? 0 : feelings[h.title] === "maybe" ? 1 : feelings[h.title] === "no" ? 3 : 2);
  const ideas = [...IDEAS].filter((h) => !has.has(h.title)).sort((a, b) => rank(a) - rank(b));
  const loved = ideas.filter((h) => feelings[h.title] === "yes").length;
  useEffect(() => {
    speak(loved ? "Here are the ones you loved. Which one do you want to try first?" : "Which habit do you want to try first?");
  }, [loved]);

  if (mine.length >= MAX_HABITS) {
    return (
      <>
        <Title>You've got {MAX_HABITS} habits already! 🌟</Title>
        <p className="max-w-[40rem] text-[1.5rem] font-bold text-ink-2">That's plenty to work on. Ask a grown-up to stop one on the habits page if you want to try a new one.</p>
      </>
    );
  }

  return (
    <>
      <Title>Pick your habit ⭐</Title>
      <p className="text-[1.4rem] font-bold text-ink-2">{loved ? "The ones you loved are first. Pick one to try!" : "Pick one to try!"}</p>
      <div className="grid w-full max-w-[70rem] grid-cols-4 gap-3 max-md:grid-cols-2 max-md:gap-2.5">
        {ideas.map((h) => {
          const f = feelings[h.title];
          return (
            <button
              key={h.title}
              type="button"
              onClick={() => (sfx.pop(), onPick(h))}
              className={cn("tap relative flex flex-col items-center gap-1.5 rounded-[1.8rem] bg-white p-3 shadow-[var(--shadow-soft)] ring-1 ring-black/5", f === "yes" && "ring-[0.3rem] ring-sage", f === "no" && "opacity-60")}
            >
              {f && <span className="absolute right-2 top-2 text-[1.8rem] leading-none">{FACES.find((x) => x.id === f)?.emoji}</span>}
              <ChoreIcon icon={h.icon} size={5.6} />
              <span className="text-[1.3rem] font-extrabold leading-tight">{h.title}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function PickTime({ habit, onPick }: { habit: HabitIdea; onPick: (t: (typeof TIMES)[number]) => void }) {
  useEffect(() => {
    speak(`When will you ${habit.say}?`);
  }, [habit.say]);
  return (
    <>
      <ChoreIcon icon={habit.icon} size={8} />
      <Title say={`When will you ${habit.say}?`}>When will you do it?</Title>
      <div className="grid w-full max-w-[54rem] grid-cols-3 gap-4 max-md:gap-2.5">
        {TIMES.map((t) => (
          <button key={t.id} type="button" onClick={() => (sfx.pop(), onPick(t))} className="tap flex flex-col items-center gap-1 rounded-[2rem] bg-sun-tint py-6 shadow-[var(--shadow-soft)] ring-1 ring-black/5 max-md:rounded-[1.5rem] max-md:py-4">
            <span className="text-[4.6rem] leading-none max-md:text-[3.4rem]">{t.emoji}</span>
            <span className="font-display text-[2rem] font-black max-md:text-[1.4rem]">{t.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

/** Hold the hand for a moment to "sign" the promise. Adds the habit. */
function PromiseStep({ member, habit, time, onSigned }: { member: Member; habit: HabitIdea; time: (typeof TIMES)[number]; onSigned: () => void }) {
  const addHabit = useHub((s) => s.addHabit);
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const p = pal(member.palId);
  const line = `I'll ${habit.say} ${time.say}. If I forget, that's okay. I can try again tomorrow!`;
  useEffect(() => {
    speak(`Your high-five promise. ${line} Hold the hand to make your promise.`);
  }, [line]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const start = () => {
    setHolding(true);
    sfx.tap();
    timer.current = window.setTimeout(() => {
      setHolding(false);
      addHabit(member.id, { title: habit.title, icon: habit.icon, frequency: { kind: "daily" } });
      celebrate({ title: "Promise made!", subtitle: habit.title, palId: member.palId, photo: member.photo });
      onSigned();
    }, 1500);
  };
  const stop = () => {
    window.clearTimeout(timer.current);
    setHolding(false);
  };

  return (
    <>
      <Title>My high-five promise ✋</Title>
      <div className="flex max-w-[50rem] items-center gap-4 rounded-[2rem] bg-white p-5 text-left shadow-[var(--shadow-soft)]">
        <ChoreIcon icon={habit.icon} size={6.4} className="shrink-0" />
        <p className="text-[1.7rem] font-extrabold leading-snug max-md:text-[1.4rem]">“{line}”</p>
      </div>
      <p className="text-[1.4rem] font-bold text-ink-2">Press and hold the hand to make your promise</p>
      <button
        type="button"
        aria-label="Hold to make the promise"
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        className="relative grid size-[15rem] place-items-center rounded-full bg-white shadow-[var(--shadow-lift)] max-md:size-[12rem]"
        style={{ touchAction: "none" }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r="46" fill="none" stroke={p.tint} strokeWidth="6" />
          <motion.circle cx="50" cy="50" r="46" fill="none" stroke={p.shade} strokeWidth="6" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" initial={false} animate={{ strokeDashoffset: holding ? 0 : 1 }} transition={{ duration: holding ? 1.5 : 0.2, ease: "linear" }} />
        </svg>
        <motion.span className="text-[7rem] leading-none max-md:text-[5.6rem]" animate={{ scale: holding ? 1.15 : 1 }}>
          ✋
        </motion.span>
      </button>
    </>
  );
}

function Done({ member, habit }: { member: Member; habit: HabitIdea }) {
  const navigate = useNavigate();
  useEffect(() => {
    speak(`Well done ${member.name}! ${habit.title} is your new habit. We'll ask about it at dinnertime. Colour a star every day you do it!`);
  }, [member.name, habit.title]);
  return (
    <>
      <motion.div animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.12, 1] }} transition={{ duration: 1.2 }}>
        <ChoreIcon icon={habit.icon} size={10} />
      </motion.div>
      <Title>Your new habit!</Title>
      <p className="font-display text-[2.6rem] font-black leading-none" style={{ color: pal(member.palId).ink }}>
        {habit.title}
      </p>
      <p className="max-w-[44rem] text-[1.5rem] font-bold text-ink-2">We'll ask about it at dinnertime. Every day you do it, you get a star!</p>
      <div className="flex gap-2">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.08, type: "spring" }} className="flex flex-col items-center gap-0.5">
            <span className="text-[3.4rem] leading-none grayscale-[0.2] max-md:text-[2.6rem]">☆</span>
            <span className="text-[1.1rem] font-black text-ink-3">{d}</span>
          </motion.div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <BigButton size="lg" tone="white" onClick={() => navigate(`/me/${member.id}`)}>
          Back to my page
        </BigButton>
        <BigButton size="lg" tone="sage" onClick={() => navigate(`/habits/${member.id}`)}>
          See my habits ⭐
        </BigButton>
      </div>
    </>
  );
}
