/**
 * Everyone's habit: what it is, how it's going (streaks, this week's ticks, a
 * four-week tick chart, this month), and a picker to set or change it with
 * SIGNAL's habit library and illustrations (or the kids' picture habits).
 */
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { Check, Flame, Search, Trophy } from "lucide-react";
import { useHub, activeHabit } from "@/lib/store";
import { HABIT_PRESETS } from "@/lib/catalog";
import { pal } from "@/lib/pals";
import { dateKey, formatDayShort, fromDateKey } from "@/lib/time";
import { sfx } from "@/lib/device";
import { habitStats, type DayMark } from "@/lib/habit-stats";
import { SIGNAL_SITE } from "@/lib/integrations/signal";
import { SIGNAL_HABITS, type HabitGroup } from "@/content/signal-habits";
import type { HabitFrequency, Member } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { BigButton, ChoreIcon, Segmented } from "@/components/ui";
import { celebrate } from "@/components/Celebrate";
import { cn } from "@/lib/utils";

type Freq = "daily" | "weekdays" | "3";
type Tab = "kids" | "grownups" | HabitGroup;

const TABS: { id: Tab; label: string }[] = [
  { id: "kids", label: "Kids" },
  { id: "grownups", label: "Family" },
  { id: "food", label: "Food" },
  { id: "move", label: "Move" },
  { id: "mind", label: "Mind & rest" },
];

interface Option {
  title: string;
  icon: string;
  note?: string;
}

function optionsFor(tab: Tab): Option[] {
  if (tab === "kids" || tab === "grownups") {
    return HABIT_PRESETS.filter((h) => h.forKids === (tab === "kids")).map((h) => ({ title: h.title, icon: h.icon }));
  }
  return SIGNAL_HABITS.filter((h) => h.group === tab).map((h) => ({
    title: h.name,
    icon: `${SIGNAL_SITE}/images/habits/${h.image}.png`,
    note: h.description,
  }));
}

const freqLabel = (f: HabitFrequency) => (f.kind === "daily" ? "Every day" : f.kind === "weekdays" ? "School days" : `${f.times} times a week`);

export default function Habits() {
  const { id } = useParams();
  const navigate = useNavigate();
  const members = useHub((s) => s.members);
  const member = members.find((m) => m.id === id) ?? members[0];
  if (!member) return null;

  return (
    <div className="grid h-full gap-[1.3rem] max-md:flex max-md:h-auto max-md:flex-col md:grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="flex items-center gap-3 rounded-[2rem] bg-white/70 p-3 ring-1 ring-black/5 max-md:overflow-x-auto md:flex-col md:py-4">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              sfx.tap();
              navigate(`/habits/${m.id}`, { replace: true });
            }}
            className={cn("tap shrink-0 rounded-full p-0.5", m.id === member.id && "ring-[0.3rem] ring-ink")}
            aria-label={m.name}
          >
            <Avatar member={m} size={4.6} />
          </button>
        ))}
      </div>
      <Progress member={member} />
      <Picker member={member} />
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

function Progress({ member }: { member: Member }) {
  const habits = useHub((s) => s.habits);
  const checkins = useHub((s) => s.checkins);
  const checkIn = useHub((s) => s.checkIn);
  const habit = activeHabit(habits, member.id);
  const p = pal(member.palId);
  const stats = useMemo(() => (habit ? habitStats(habit, checkins) : undefined), [habit, checkins]);
  const today = dateKey();
  const doneToday = !!habit && checkins.some((c) => c.habitId === habit.id && c.date === today && c.status === "done");
  const thisWeek = stats?.weeks[3] ?? [];

  return (
    <section className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-[2.2rem] p-5 shadow-[var(--shadow-lift)] no-scrollbar" style={{ background: `linear-gradient(170deg, ${p.tint}, #fff 75%)` }}>
      <div className="flex items-center gap-3">
        <Avatar member={member} size={5} />
        <h1 className="font-display text-[3rem] font-black leading-none" style={{ color: p.ink }}>
          {member.name}'s habit
        </h1>
      </div>

      {habit && stats ? (
        <>
          <motion.div key={habit.id} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-4 rounded-[1.8rem] bg-white p-4 shadow-[var(--shadow-soft)]">
            <ChoreIcon icon={habit.icon} size={7} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[2.4rem] font-black leading-[1.05]">{habit.title}</p>
              <p className="text-[1.2rem] font-bold text-ink-2">
                {freqLabel(habit.frequency)} · since {fromDateKey(habit.startDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (doneToday) return;
                checkIn({ habitId: habit.id, memberId: member.id, status: "done" });
                sfx.success();
                celebrate({ title: "Ticked!", subtitle: habit.title, palId: member.palId, photo: member.photo });
              }}
              className={cn("tap flex h-[5.4rem] shrink-0 flex-col items-center justify-center rounded-[1.4rem] px-4 text-[1.05rem] font-black", doneToday ? "bg-sage-tint text-sage-ink" : "text-white")}
              style={doneToday ? undefined : { background: p.shade }}
            >
              <Check className="size-7" strokeWidth={3} />
              {doneToday ? "Done today" : "Tick today"}
            </button>
          </motion.div>

          <div className="grid grid-cols-3 gap-2.5">
            <Stat icon={<Flame className="size-6 text-coral" />} value={stats.streak} label={stats.streak === 1 ? "day in a row" : "days in a row"} />
            <Stat icon={<Trophy className="size-6 text-[#e0a21c]" />} value={stats.best} label="best streak" />
            <Stat icon={<Check className="size-6 text-sage-ink" strokeWidth={3} />} value={`${stats.monthDone}/${stats.monthDays}`} label="this month" />
          </div>

          <div className="rounded-[1.6rem] bg-white/80 p-4">
            <p className="mb-2 text-[1.05rem] font-black uppercase tracking-[0.08em] text-ink-3">This week</p>
            <div className="grid grid-cols-7 gap-2">
              {thisWeek.map((d) => {
                const isToday = d.key === today;
                return (
                  <div key={d.key} className="flex flex-col items-center gap-1">
                    <span className={cn("text-[1.05rem] font-black", isToday ? "text-coral-ink" : "text-ink-3")}>{formatDayShort(fromDateKey(d.key))}</span>
                    <span
                      className={cn("grid size-[3.4rem] place-items-center rounded-full text-[1.4rem] font-black text-white", MARK_STYLE[d.mark], isToday && d.mark !== "done" && "ring-2 ring-coral")}
                      style={d.mark === "done" ? { background: p.shade } : undefined}
                    >
                      {d.mark === "done" ? "✓" : d.mark === "not_today" ? "☁️" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.6rem] bg-white/80 p-4">
            <div className="mb-2 flex items-center justify-between">
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
            <div className="flex flex-col gap-1.5">
              {stats.weeks.map((w, i) => (
                <div key={i} className="grid grid-cols-7 gap-1.5">
                  {w.map((d) => (
                    <span
                      key={d.key}
                      title={d.key}
                      className={cn("grid aspect-square place-items-center rounded-[0.6rem] text-[0.95rem] font-black text-white", MARK_STYLE[d.mark], d.key === today && "ring-2 ring-coral")}
                      style={d.mark === "done" ? { background: p.shade } : undefined}
                    >
                      {d.mark === "done" ? "✓" : ""}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="grid flex-1 place-items-center rounded-[1.8rem] bg-white/70 p-6 text-center text-[1.6rem] font-bold text-ink-2">
          🌱 No habit yet. Pick one {typeof window !== "undefined" && window.innerWidth < 768 ? "below" : "on the right"}!
        </div>
      )}
    </section>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-[1.4rem] bg-white/80 px-2 py-3 text-center">
      {icon}
      <span className="font-display text-[2.4rem] font-black leading-none">{value}</span>
      <span className="text-[1rem] font-bold text-ink-2">{label}</span>
    </div>
  );
}

function Picker({ member }: { member: Member }) {
  const habits = useHub((s) => s.habits);
  const setHabit = useHub((s) => s.setHabit);
  const habit = activeHabit(habits, member.id);
  const [tab, setTab] = useState<Tab>(member.role === "child" ? "kids" : "grownups");
  const [freq, setFreq] = useState<Freq>("daily");
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState("");

  const options = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return optionsFor(tab);
    // Search across every group when typing.
    return (["kids", "grownups", "food", "move", "mind"] as Tab[])
      .flatMap(optionsFor)
      .filter((o) => o.title.toLowerCase().includes(t) || o.note?.toLowerCase().includes(t));
  }, [tab, q]);

  const frequency = (): HabitFrequency =>
    freq === "daily" ? { kind: "daily" } : freq === "weekdays" ? { kind: "weekdays" } : { kind: "perWeek", times: 3 };

  const choose = (title: string, icon: string) => {
    sfx.pop();
    setHabit(member.id, { title, icon, frequency: frequency() });
    celebrate({ title: habit ? "New habit!" : "Habit set!", subtitle: title, palId: member.palId, photo: member.photo });
  };

  return (
    <section className="card flex min-h-0 flex-col p-5">
      <h2 className="mb-3 font-display text-[2.4rem] font-black leading-none">{habit ? "Change the habit" : "Choose a habit"}</h2>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setQ("");
            }}
            aria-pressed={tab === t.id && !q}
            className={cn("tap h-[3.4rem] rounded-full px-4 text-[1.15rem] font-black", tab === t.id && !q ? "bg-ink text-white" : "bg-paper text-ink-2")}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search habits…"
            className="h-[3.8rem] w-full rounded-[1.2rem] border-2 border-line bg-white pl-11 pr-4 text-[1.3rem] font-bold outline-none focus:border-sky"
          />
        </div>
        <Segmented<Freq>
          value={freq}
          onChange={setFreq}
          options={[
            { value: "daily", label: "Every day" },
            { value: "weekdays", label: "School days" },
            { value: "3", label: "3× a week" },
          ]}
        />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-y-auto no-scrollbar sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={`${o.title}-${o.icon}`}
            type="button"
            onClick={() => choose(o.title, o.icon)}
            title={o.note}
            className={cn(
              "tap flex flex-col items-center justify-start gap-1.5 rounded-[1.6rem] p-3 text-center ring-1 ring-black/5",
              habit?.title === o.title ? "bg-sage-tint ring-[0.25rem] ring-sage" : "bg-paper",
            )}
          >
            <ChoreIcon icon={o.icon} size={5.2} />
            <span className="text-[1.2rem] font-extrabold leading-tight">{o.title}</span>
            {o.note && <span className="line-clamp-2 text-[0.95rem] font-semibold leading-snug text-ink-3">{o.note}</span>}
          </button>
        ))}
        {!options.length && <p className="col-span-full py-6 text-center text-[1.2rem] font-bold text-ink-2">Nothing matches. Write your own below.</p>}
      </div>
      <div className="mt-3 flex gap-3">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Or write your own…"
          className="h-[4.4rem] min-w-0 flex-1 rounded-[1.3rem] border-2 border-line bg-white px-5 text-[1.35rem] font-bold outline-none focus:border-sky"
        />
        <BigButton
          size="md"
          disabled={!custom.trim()}
          onClick={() => {
            choose(custom.trim(), "⭐");
            setCustom("");
          }}
        >
          Save
        </BigButton>
      </div>
    </section>
  );
}
