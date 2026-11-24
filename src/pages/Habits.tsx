/**
 * Everyone's habits. Each person can have up to four going at once: from
 * SIGNAL's habit library (with its illustrations), the kids' picture habits,
 * or their own, with an emoji and how often. Each habit card shows this
 * week's ticks and a tick button; the detail shows streaks, a four-week tick
 * chart and this month, and lets you edit or stop it.
 *
 * Desktop and bench: people rail | habit cards | detail of the chosen habit.
 * Phone: people strip on top, cards stacked, and the chosen card opens up in place.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Flame, Loader2, Pencil, Plus, Search, Sparkles, Trophy } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";
import { useHub, MAX_HABITS } from "@/lib/store";
import { HABIT_PRESETS } from "@/lib/catalog";
import { pal } from "@/lib/pals";
import { dateKey, formatDayShort, fromDateKey } from "@/lib/time";
import { sfx } from "@/lib/device";
import { frequencyLabel, habitDueOn, habitStats, weekProgress, type DayMark } from "@/lib/habit-stats";
import { SIGNAL_SITE } from "@/lib/integrations/signal";
import { SIGNAL_HABITS, type HabitGroup } from "@/content/signal-habits";
import type { Habit, HabitFrequency, Member } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { BigButton, ChoreIcon, Sheet } from "@/components/ui";
import { celebrate } from "@/components/Celebrate";
import { cn } from "@/lib/utils";
import { useIsPhone } from "@/lib/useIsPhone";
import { useParentUnlocked } from "@/components/PinPad";
import { GOAL_BG, GOAL_RING, WeekDots } from "@/components/HabitTracker";
import { pointpalsAwardHabit, pointpalsGenerateIcon, pointpalsUpdateSkill, usePointPals } from "@/lib/integrations/pointpals";

type Tab = "own" | "kids" | "grownups" | HabitGroup;

const TABS: { id: Tab; label: string }[] = [
  { id: "own", label: "✏️ Make your own" },
  { id: "kids", label: "Kids" },
  { id: "grownups", label: "Family" },
  { id: "food", label: "Food" },
  { id: "move", label: "Move" },
  { id: "mind", label: "Mind & rest" },
];

/** Emoji for home-made habits. */
const EMOJI = ["⭐", "💧", "🥦", "🍎", "🏃", "🚴", "🧘", "📚", "✍️", "🎹", "🎨", "🧹", "🛏️", "🦷", "😴", "📵", "🙏", "💛", "🤗", "🐶", "🌳", "☀️", "🧺", "💪"];

interface Option {
  title: string;
  icon: string;
  note?: string;
}

function optionsFor(tab: Tab): Option[] {
  if (tab === "own") return [];
  if (tab === "kids" || tab === "grownups") {
    return HABIT_PRESETS.filter((h) => h.forKids === (tab === "kids")).map((h) => ({ title: h.title, icon: h.icon }));
  }
  return SIGNAL_HABITS.filter((h) => h.group === tab).map((h) => ({
    title: h.name,
    icon: `${SIGNAL_SITE}/images/habits/${h.image}.png`,
    note: h.description,
  }));
}

const NO_HABITS: Habit[] = [];

function useHabitsOf(memberId: string | undefined): Habit[] {
  return useHub(useShallow((s) => (memberId ? s.habits.filter((h) => h.memberId === memberId && h.active) : NO_HABITS)));
}

export default function Habits() {
  const { id } = useParams();
  const navigate = useNavigate();
  const members = useHub((s) => s.members);
  const member = members.find((m) => m.id === id) ?? members[0];
  const habits = useHabitsOf(member?.id);
  const phone = useIsPhone();
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);

  // Keep a habit chosen on the bench screen; phones start with every card closed.
  const chosen = habits.find((h) => h.id === selected) ?? (phone ? undefined : habits[0]);
  useEffect(() => setSelected(null), [member?.id]);

  if (!member) return null;
  const p = pal(member.palId);
  const full = habits.length >= MAX_HABITS;

  return (
    <div className="grid h-full gap-[1.3rem] max-md:flex max-md:h-auto max-md:flex-col max-md:gap-3 md:grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* People */}
      <div className="flex items-center gap-3 rounded-[2rem] bg-white/70 p-3 ring-1 ring-black/5 max-md:sticky max-md:top-0 max-md:z-10 max-md:overflow-x-auto max-md:rounded-[1.4rem] max-md:bg-white/90 max-md:p-2 max-md:backdrop-blur no-scrollbar md:flex-col md:py-4">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              sfx.tap();
              navigate(`/habits/${m.id}`, { replace: true });
            }}
            className={cn("tap flex shrink-0 flex-col items-center gap-1 rounded-[1.2rem] p-1", m.id === member.id && "bg-ink/5")}
            aria-label={m.name}
            aria-pressed={m.id === member.id}
          >
            <span className={cn("rounded-full p-0.5", m.id === member.id && "ring-[0.3rem] ring-ink")}>
              <Avatar member={m} size={phone ? 3.8 : 4.6} />
            </span>
            <span className="text-[1rem] font-black text-ink-2 md:hidden">{m.name}</span>
          </button>
        ))}
      </div>

      {/* Habit cards */}
      <section className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-[2.2rem] p-5 shadow-[var(--shadow-lift)] no-scrollbar max-md:overflow-visible max-md:p-3" style={{ background: `linear-gradient(170deg, ${p.tint}, #fff 75%)` }}>
        <div className="flex items-center gap-3">
          <Avatar member={member} size={phone ? 3.6 : 5} />
          <h1 className="min-w-0 flex-1 font-display text-[3rem] font-black leading-none" style={{ color: p.ink }}>
            {member.name}'s habits
          </h1>
          {!full && (
            <button
              type="button"
              onClick={() => {
                sfx.tap();
                setAdding(true);
              }}
              className="tap flex h-[4.4rem] shrink-0 items-center gap-1.5 rounded-full px-4 text-[1.2rem] font-black text-white shadow-[var(--shadow-soft)]"
              style={{ background: p.shade }}
            >
              <Plus className="size-6" strokeWidth={3} /> Add
            </button>
          )}
        </div>

        {habits.length === 0 && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="tap grid flex-1 place-items-center rounded-[1.8rem] border-2 border-dashed border-black/15 bg-white/60 p-8 text-center max-md:min-h-[16rem]"
          >
            <span>
              <span className="block text-[4rem] leading-none">🌱</span>
              <span className="mt-2 block font-display text-[2rem] font-black">No habits yet</span>
              <span className="block text-[1.3rem] font-bold text-ink-2">Tap to pick one, or make your own</span>
            </span>
          </button>
        )}

        {habits.map((h) => {
          const open = chosen?.id === h.id;
          return (
            <div key={h.id}>
              <HabitCard
                habit={h}
                member={member}
                open={open}
                onSelect={() => {
                  sfx.tap();
                  setSelected(open && phone ? null : h.id);
                }}
              />
              {/* Phones open the detail under the card. */}
              <AnimatePresence initial={false}>
                {phone && open && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pt-2.5">
                      <Detail habit={h} member={member} onEdit={() => setEditing(h)} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {habits.length > 0 && (
          <p className="px-1 text-center text-[1.1rem] font-bold text-ink-3">
            {full ? `${MAX_HABITS} habits is plenty! Stop one to start another.` : "Tick a habit here, or at dinnertime reflection."}
          </p>
        )}
      </section>

      {/* Detail (bench and wall screens) */}
      {!phone && (
        <section className="card flex min-h-0 flex-col overflow-y-auto p-5 no-scrollbar">
          {chosen ? (
            <Detail habit={chosen} member={member} onEdit={() => setEditing(chosen)} />
          ) : (
            <div className="grid flex-1 place-items-center text-center text-[1.5rem] font-bold text-ink-2">
              <span>
                <span className="block text-[4rem]">📈</span>
                Pick or add a habit to see how it's going.
              </span>
            </div>
          )}
        </section>
      )}

      <HabitSheet open={adding} onOpenChange={setAdding} member={member} />
      <HabitSheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)} member={member} editing={editing ?? undefined} />
    </div>
  );
}

const MARK_STYLE: Record<DayMark, string> = {
  done: "",
  not_today: "bg-lilac-tint",
  none: "bg-white ring-1 ring-black/10",
  future: "bg-white/40 ring-1 ring-black/5",
  before: "bg-transparent ring-1 ring-dashed ring-black/10",
};

function useTick(habit: Habit, member: Member) {
  const checkins = useHub((s) => s.checkins);
  const checkIn = useHub((s) => s.checkIn);
  const today = dateKey();
  const doneToday = checkins.some((c) => c.habitId === habit.id && c.date === today && c.status === "done");
  const grownUp = useParentUnlocked();
  const tick = () => {
    if (doneToday) return;
    checkIn({ habitId: habit.id, memberId: member.id, status: "done" });
    sfx.success();
    celebrate({ title: "Ticked!", subtitle: habit.title, palId: member.palId, photo: member.photo });
    // With a grown-up's PIN in, a ticked habit also drops a marble in PointPals.
    if (grownUp && member.pointpalsKidId) void pointpalsAwardHabit(member.pointpalsKidId, habit).catch(() => {});
  };
  return { doneToday, tick };
}

function HabitCard({ habit, member, open, onSelect }: { habit: Habit; member: Member; open: boolean; onSelect: () => void }) {
  const checkins = useHub((s) => s.checkins);
  const p = pal(member.palId);
  const { doneToday, tick } = useTick(habit, member);
  const stats = useMemo(() => habitStats(habit, checkins), [habit, checkins]);
  const week = useMemo(() => weekProgress(habit, checkins), [habit, checkins]);
  const resting = !habitDueOn(habit);
  const won = week.done >= week.goal;

  return (
    <motion.div
      layout="position"
      className={cn("flex items-center gap-3 rounded-[1.8rem] bg-white p-3.5 shadow-[var(--shadow-soft)] ring-1 ring-black/5", won && GOAL_RING, open && "ring-[0.25rem]")}
      style={{ ...(won ? GOAL_BG : {}), ...(open ? ({ "--tw-ring-color": p.shade } as React.CSSProperties) : {}) }}
    >
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open}>
        <ChoreIcon icon={habit.icon} size={5.4} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[1.8rem] font-black leading-[1.05]">{habit.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[1.05rem] font-bold text-ink-2 [&>span+span]:before:mr-2.5 [&>span+span]:before:text-ink-3 [&>span+span]:before:content-['·']">
            <span>{frequencyLabel(habit.frequency)}</span>
            <span className={cn(won && "font-black text-[#7a5a0c]")}>{won ? `🏆 Goal! ${week.done}/${week.goal}` : `${week.done}/${week.goal} this week`}</span>
            {stats.streak > 1 && <span className="text-coral-ink">🔥 {stats.streak}</span>}
          </span>
          {/* This week, Monday to Sunday */}
          <WeekDots habit={habit} member={member} className="mt-1.5 max-w-[24rem]" />
        </span>
        <ChevronDown className={cn("size-6 shrink-0 text-ink-3 transition-transform md:hidden", open && "rotate-180")} />
      </button>
      <button
        type="button"
        onClick={tick}
        aria-label={doneToday ? `${habit.title}: done today` : `Tick ${habit.title} for today`}
        className={cn(
          "tap grid size-[5.2rem] shrink-0 place-items-center rounded-[1.4rem] text-[0.95rem] font-black leading-none",
          doneToday ? "bg-sage-tint text-sage-ink" : resting ? "bg-paper text-ink-3" : "text-white",
        )}
        style={doneToday || resting ? undefined : { background: p.shade }}
      >
        <span className="flex flex-col items-center gap-0.5">
          <Check className="size-7" strokeWidth={3.2} />
          {doneToday ? "Done" : resting ? "Rest day" : "Tick"}
        </span>
      </button>
    </motion.div>
  );
}

function Detail({ habit, member, onEdit }: { habit: Habit; member: Member; onEdit: () => void }) {
  const checkins = useHub((s) => s.checkins);
  const p = pal(member.palId);
  const stats = useMemo(() => habitStats(habit, checkins), [habit, checkins]);
  const today = dateKey();
  const phone = useIsPhone();

  return (
    <div className="flex flex-col gap-3">
      {!phone && (
        <div className="flex items-center gap-4">
          <ChoreIcon icon={habit.icon} size={7} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-[2.6rem] font-black leading-[1.05]">{habit.title}</p>
            <p className="text-[1.2rem] font-bold text-ink-2">
              {frequencyLabel(habit.frequency)} · since {fromDateKey(habit.startDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        <Stat icon={<Flame className="size-6 text-coral" />} value={stats.streak} label={stats.streak === 1 ? "day in a row" : "days in a row"} />
        <Stat icon={<Trophy className="size-6 text-[#e0a21c]" />} value={stats.best} label="best streak" />
        <Stat icon={<Check className="size-6 text-sage-ink" strokeWidth={3} />} value={`${stats.monthDone}/${stats.monthDays}`} label="this month" />
      </div>

      <div className="rounded-[1.6rem] bg-white/80 p-4 ring-1 ring-black/5 max-md:p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[1.05rem] font-black uppercase tracking-[0.08em] text-ink-3">Last 4 weeks</p>
          <p className="flex items-center gap-3 text-[0.95rem] font-bold text-ink-3">
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-[0.3rem]" style={{ background: p.shade }} /> done
            </span>
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-[0.3rem] bg-lilac-tint" /> not today
            </span>
          </p>
        </div>
        <div className="mx-auto grid w-full max-w-[30rem] grid-cols-7 gap-1.5 max-md:max-w-none">
          {stats.weeks[3].map((d) => (
            <span key={`h-${d.key}`} className={cn("text-center text-[0.95rem] font-black", d.key === today ? "text-coral-ink" : "text-ink-3")}>
              {formatDayShort(fromDateKey(d.key)).slice(0, 2)}
            </span>
          ))}
          {stats.weeks.flat().map((d) => (
            <span
              key={d.key}
              title={d.key}
              className={cn("grid aspect-square place-items-center rounded-[0.7rem] text-[1rem] font-black text-white", MARK_STYLE[d.mark], d.key === today && "ring-2 ring-coral")}
              style={d.mark === "done" ? { background: p.shade } : undefined}
            >
              {d.mark === "done" ? "✓" : d.mark === "not_today" ? "☁️" : fromDateKey(d.key).getDate() === 1 ? <span className="text-[0.85rem] text-ink-3">1</span> : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => {
            sfx.tap();
            onEdit();
          }}
          className="tap flex h-[4.4rem] flex-1 items-center justify-center gap-2 rounded-[1.3rem] bg-white text-[1.25rem] font-black shadow-sm ring-1 ring-black/5"
        >
          <Pencil className="size-5" /> Edit habit
        </button>
      </div>
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-[1.4rem] bg-white/80 px-2 py-3 text-center ring-1 ring-black/5">
      {icon}
      <span className="font-display text-[2.4rem] font-black leading-none">{value}</span>
      <span className="text-[1rem] font-bold text-ink-2">{label}</span>
    </div>
  );
}

type FreqKind = HabitFrequency["kind"];

function FrequencyPicker({ value, onChange }: { value: HabitFrequency; onChange: (f: HabitFrequency) => void }) {
  const kinds: { kind: FreqKind; label: string }[] = [
    { kind: "daily", label: "Every day" },
    { kind: "weekdays", label: "School days" },
    { kind: "perWeek", label: "Some days" },
  ];
  const times = value.kind === "perWeek" ? value.times : 3;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {kinds.map((k) => (
        <button
          key={k.kind}
          type="button"
          aria-pressed={value.kind === k.kind}
          onClick={() => {
            sfx.tap();
            onChange(k.kind === "perWeek" ? { kind: "perWeek", times } : { kind: k.kind });
          }}
          className={cn("tap h-[3.8rem] rounded-full px-4 text-[1.2rem] font-black", value.kind === k.kind ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-black/10")}
        >
          {k.label}
        </button>
      ))}
      {value.kind === "perWeek" && (
        <div className="flex items-center gap-1 rounded-full bg-white p-1 ring-1 ring-black/10">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} times a week`}
              onClick={() => onChange({ kind: "perWeek", times: n })}
              className={cn("tap grid size-[3.2rem] place-items-center rounded-full text-[1.2rem] font-black", times === n ? "bg-ink text-white" : "text-ink-2")}
            >
              {n}
            </button>
          ))}
          <span className="pr-2 text-[1.1rem] font-bold text-ink-2">× a week</span>
        </div>
      )}
    </div>
  );
}

/** Add a habit (from the libraries or your own), or edit one. Also used from the Me page. */
export function HabitSheet({ open, onOpenChange, member, editing }: { open: boolean; onOpenChange: (o: boolean) => void; member: Member; editing?: Habit }) {
  const addHabit = useHub((s) => s.addHabit);
  const updateHabit = useHub((s) => s.updateHabit);
  const stopHabit = useHub((s) => s.stopHabit);
  const [tab, setTab] = useState<Tab>("own");
  const [freq, setFreq] = useState<HabitFrequency>({ kind: "daily" });
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("⭐");
  const [confirmStop, setConfirmStop] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setConfirmStop(false);
    if (editing) {
      setTitle(editing.title);
      setIcon(editing.icon);
      setFreq(editing.frequency);
      setTab("own");
    } else {
      setTitle("");
      setIcon("⭐");
      setFreq({ kind: "daily" });
      setTab("own");
    }
  }, [open, editing, member.role]);

  const options = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return optionsFor(tab);
    return (["kids", "grownups", "food", "move", "mind"] as Tab[])
      .flatMap(optionsFor)
      .filter((o) => o.title.toLowerCase().includes(t) || o.note?.toLowerCase().includes(t));
  }, [tab, q]);

  const save = (name: string, pic: string) => {
    const clean = name.trim().slice(0, 60);
    if (!clean) return;
    sfx.pop();
    if (editing) {
      updateHabit(editing.id, { title: clean, icon: pic, frequency: freq });
      if (editing.pointpalsSkillId) void pointpalsUpdateSkill(editing.pointpalsSkillId, { title: clean, icon: pic }).catch(() => {});
      toast.success("Habit updated");
    } else {
      addHabit(member.id, { title: clean, icon: pic, frequency: freq });
      celebrate({ title: "New habit!", subtitle: clean, palId: member.palId, photo: member.photo });
    }
    onOpenChange(false);
  };

  const isPicture = /\.(png|jpe?g|webp|svg)$/i.test(icon) || icon.startsWith("http");
  const ppReady = usePointPals((s) => !!s.userId && !!s.household);
  const [drawing, setDrawing] = useState(false);
  const draw = async () => {
    const what = title.trim();
    if (!what || drawing) return;
    setDrawing(true);
    try {
      const { url, remaining } = await pointpalsGenerateIcon(what);
      setIcon(url);
      sfx.success();
      toast.success(remaining !== undefined ? `Picture made! ${remaining} left this month.` : "Picture made!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't make a picture");
    } finally {
      setDrawing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={editing ? "Edit habit" : `A new habit for ${member.name}`} wide>
      {!editing && (
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                sfx.tap();
                setTab(t.id);
                setQ("");
              }}
              aria-pressed={tab === t.id && !q}
              className={cn("tap h-[3.6rem] shrink-0 rounded-full px-4 text-[1.15rem] font-black", tab === t.id && !q ? "bg-ink text-white" : "bg-white text-ink-2 ring-1 ring-black/10")}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      <p className="mb-2 text-[1.05rem] font-black uppercase tracking-[0.08em] text-ink-3">How often</p>
      <div className="mb-4">
        <FrequencyPicker value={freq} onChange={setFreq} />
      </div>

      {tab === "own" || editing ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="grid size-[6rem] shrink-0 place-items-center rounded-[1.6rem] bg-white ring-1 ring-black/10">
              <ChoreIcon icon={icon} size={4.6} />
            </span>
            <input
              autoFocus={!editing}
              value={title}
              maxLength={60}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && save(title, icon)}
              placeholder="e.g. Practise piano for 10 min"
              className="h-[5rem] min-w-0 flex-1 rounded-[1.3rem] border-2 border-line bg-white px-4 text-[1.45rem] font-bold outline-none focus:border-sky"
            />
          </div>
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[1.05rem] font-black uppercase tracking-[0.08em] text-ink-3">Pick a picture</p>
              <button
                type="button"
                onClick={() => void draw()}
                disabled={!title.trim() || drawing || !ppReady}
                title={ppReady ? "Draw a new picture with PointPals" : "Connect PointPals in Parent → Connections to make pictures"}
                className="tap flex h-[4rem] items-center gap-2 rounded-full bg-lilac px-4 text-[1.2rem] font-black text-white shadow-[var(--shadow-soft)] disabled:opacity-50"
              >
                {drawing ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
                {drawing ? "Drawing…" : "Make a picture"}
              </button>
            </div>
            {!ppReady && <p className="mb-2 text-[1rem] font-bold text-ink-3">Connect PointPals to draw a picture for your own habit. Emoji work too.</p>}
            <div className="grid grid-cols-8 gap-2 max-md:grid-cols-6">
              {isPicture && (
                <button type="button" onClick={() => setIcon(icon)} className="tap grid aspect-square place-items-center rounded-[1.2rem] bg-sage-tint ring-[0.2rem] ring-sage" aria-label="Keep the picture">
                  <ChoreIcon icon={icon} size={3.2} />
                </button>
              )}
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    sfx.tap();
                    setIcon(e);
                  }}
                  aria-pressed={icon === e}
                  className={cn("tap grid aspect-square place-items-center rounded-[1.2rem] text-[2.2rem]", icon === e ? "bg-sage-tint ring-[0.2rem] ring-sage" : "bg-white ring-1 ring-black/5")}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <BigButton size="lg" disabled={!title.trim()} onClick={() => save(title, icon)} className="w-full">
            {editing ? "Save changes" : "Add this habit"}
          </BigButton>
          {editing &&
            (confirmStop ? (
              <div className="flex items-center gap-2 rounded-[1.4rem] bg-coral-tint p-3">
                <p className="min-w-0 flex-1 text-[1.2rem] font-bold">Stop “{editing.title}”? Its ticks stay in the history.</p>
                <button
                  type="button"
                  onClick={() => {
                    stopHabit(editing.id);
                    sfx.soft();
                    toast("Habit stopped");
                    onOpenChange(false);
                  }}
                  className="tap h-[4rem] rounded-full bg-coral px-4 text-[1.15rem] font-black text-white"
                >
                  Stop it
                </button>
                <button type="button" onClick={() => setConfirmStop(false)} className="tap h-[4rem] rounded-full bg-white px-4 text-[1.15rem] font-black">
                  Keep
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmStop(true)} className="tap self-center py-2 text-[1.2rem] font-extrabold text-coral-ink underline">
                Stop this habit
              </button>
            ))}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => (sfx.tap(), setTab("own"))}
            className="tap mb-3 flex w-full items-center gap-3 rounded-[1.4rem] border-2 border-dashed border-lilac bg-lilac-tint/60 p-3 text-left"
          >
            <span className="text-[2.4rem] leading-none">✨</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[1.35rem] font-black">Not here? Write your own</span>
              <span className="block text-[1.1rem] font-bold text-ink-2">Name it, pick an emoji or make a picture for it</span>
            </span>
          </button>
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search habits…"
              className="h-[4.2rem] w-full rounded-[1.2rem] border-2 border-line bg-white pl-11 pr-4 text-[1.3rem] font-bold outline-none focus:border-sky"
            />
          </div>
          <div className="grid grid-cols-4 gap-3 max-md:grid-cols-2">
            {options.map((o) => (
              <button
                key={`${o.title}-${o.icon}`}
                type="button"
                onClick={() => save(o.title, o.icon)}
                title={o.note}
                className="tap flex flex-col items-center justify-start gap-1.5 rounded-[1.6rem] bg-white p-3 text-center ring-1 ring-black/5"
              >
                <ChoreIcon icon={o.icon} size={5.2} />
                <span className="text-[1.2rem] font-extrabold leading-tight">{o.title}</span>
                {o.note && <span className="line-clamp-2 text-[0.95rem] font-semibold leading-snug text-ink-3">{o.note}</span>}
              </button>
            ))}
            {!options.length && (
              <button type="button" onClick={() => { setTitle(q); setQ(""); setTab("own"); }} className="col-span-full py-6 text-center text-[1.3rem] font-bold text-ink-2 underline">
                Nothing matches. Make “{q}” your own habit
              </button>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}
