/**
 * "My habits this week" on someone's Me page: each habit with its Monday to
 * Sunday ticks (from dinnertime reflection or the habits page) and how close
 * they are to the week's goal. A met goal turns gold with a trophy.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ChevronRight, Plus } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useHub, MAX_HABITS } from "@/lib/store";
import { HabitSheet } from "@/pages/Habits";
import { pal } from "@/lib/pals";
import { dateKey } from "@/lib/time";
import { sfx } from "@/lib/device";
import { frequencyLabel, habitDueOn, habitStats, weekProgress } from "@/lib/habit-stats";
import type { Habit, Member } from "@/lib/types";
import { ChoreIcon } from "@/components/ui";
import { cn } from "@/lib/utils";

const NO_HABITS: Habit[] = [];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function HabitTracker({ member }: { member: Member }) {
  const habits = useHub(useShallow((s) => s.habits.filter((h) => h.memberId === member.id && h.active) ?? NO_HABITS));
  const [adding, setAdding] = useState(false);
  const full = habits.length >= MAX_HABITS;
  const add = () => {
    sfx.tap();
    setAdding(true);
  };
  // The same sheet as the habits page: write your own (with ✨ Make a picture
  // from PointPals) or pick from the libraries. New habits sync to PointPals.
  const sheet = <HabitSheet open={adding} onOpenChange={setAdding} member={member} />;

  if (!habits.length) {
    return (
      <>
        <button type="button" onClick={add} className="tap card flex shrink-0 items-center gap-3 p-4 text-left max-md:p-3">
          <span className="text-[3.2rem] leading-none">🌱</span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[1.9rem] font-black leading-none">No habit yet</span>
            <span className="block text-[1.2rem] font-bold text-ink-2">Tap to add one: write your own or pick a picture habit</span>
          </span>
          <span className="flex h-[4.4rem] shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-[1.2rem] font-black text-white">
            <Plus className="size-5" strokeWidth={3} /> Add habit
          </span>
        </button>
        {sheet}
      </>
    );
  }

  return (
    <section className="card flex shrink-0 flex-col gap-2 p-3.5 max-md:p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 flex-1 font-display text-[1.9rem] font-black leading-none max-md:text-[1.8rem]">My habits this week</h2>
        {!full && (
          <button type="button" onClick={add} className="tap flex h-[3.6rem] shrink-0 items-center gap-1 rounded-full bg-ink px-3.5 text-[1.1rem] font-black text-white">
            <Plus className="size-4" strokeWidth={3} /> Add habit
          </button>
        )}
        <Link to={`/habits/${member.id}`} onClick={() => sfx.tap()} className="tap flex h-[3.6rem] shrink-0 items-center gap-1 rounded-full bg-paper px-3 text-[1.1rem] font-black text-ink-2">
          See all <ChevronRight className="size-4" />
        </Link>
      </div>
      <div className="grid gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(17rem,1fr))]">
        {habits.map((h) => (
          <HabitWeek key={h.id} habit={h} member={member} />
        ))}
      </div>
      {sheet}
    </section>
  );
}

function HabitWeek({ habit, member }: { habit: Habit; member: Member }) {
  const checkins = useHub((s) => s.checkins);
  const stats = useMemo(() => habitStats(habit, checkins), [habit, checkins]);
  const week = useMemo(() => weekProgress(habit, checkins), [habit, checkins]);
  const won = week.done >= week.goal;
  const resting = !habitDueOn(habit);

  return (
    <Link
      to={`/habits/${member.id}`}
      onClick={() => sfx.tap()}
      className={cn("tap relative flex items-center gap-2.5 overflow-hidden rounded-[1.6rem] p-2.5 ring-1 ring-black/5", won ? GOAL_RING : "bg-paper")}
      style={won ? GOAL_BG : undefined}
      aria-label={`${habit.title}: ${week.done} of ${week.goal} this week${won ? ", goal reached" : ""}`}
    >
      {won && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent"
          initial={{ x: "-120%" }}
          animate={{ x: "320%" }}
          transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 2.5 }}
        />
      )}
      <ChoreIcon icon={habit.icon} size={4.2} className="relative shrink-0" />
      <div className="relative min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[1.3rem] font-extrabold leading-tight">{habit.title}</p>
          <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[1.05rem] font-black", won ? "bg-white/80 text-[#7a5a0c]" : "bg-white text-ink-2")}>
            {won ? "🏆 Goal!" : `${week.done}/${week.goal}`}
          </span>
        </div>
        <WeekDots habit={habit} member={member} className="mt-1.5" />
        <p className="mt-0.5 text-[1rem] font-bold text-ink-3">
          {won
            ? "You did it this week! 🎉"
            : resting
              ? "Rest day today"
              : `${frequencyLabel(habit.frequency)}${stats.streak > 1 ? ` · 🔥 ${stats.streak} in a row` : ""}`}
        </p>
      </div>
    </Link>
  );
}

/** The gold look for a habit whose weekly goal is met (Me page and habits page). */
export const GOAL_RING = "ring-2 ring-[#e0a21c]";
export const GOAL_BG = { background: "linear-gradient(120deg, #fff4c7, #ffe08a)" };

/** Monday to Sunday ticks for a habit this week, with the day letters under them. */
export function WeekDots({ habit, member, className }: { habit: Habit; member: Member; className?: string }) {
  const checkins = useHub((s) => s.checkins);
  const p = pal(member.palId);
  const stats = useMemo(() => habitStats(habit, checkins), [habit, checkins]);
  const today = dateKey();
  return (
    <div className={cn("grid grid-cols-7 gap-1", className)}>
      {stats.weeks[3].map((d, i) => {
        const isToday = d.key === today;
        return (
          <div key={d.key} className="flex flex-col items-center gap-0.5">
            <motion.span
              initial={false}
              animate={d.mark === "done" ? { scale: [0.6, 1.15, 1] } : { scale: 1 }}
              className={cn(
                "grid aspect-square w-full max-w-[2.6rem] place-items-center rounded-full text-[1.05rem] font-black text-white",
                d.mark === "not_today" && "bg-lilac-tint",
                d.mark === "none" && "bg-white ring-1 ring-black/10",
                (d.mark === "future" || d.mark === "before") && "bg-white/50 ring-1 ring-black/5",
                isToday && d.mark !== "done" && "ring-2 ring-coral",
              )}
              style={d.mark === "done" ? { background: p.shade } : undefined}
            >
              {d.mark === "done" ? "✓" : d.mark === "not_today" ? "☁️" : ""}
            </motion.span>
            <span className={cn("text-[0.9rem] font-black leading-none", isToday ? "text-coral-ink" : "text-ink-3")}>{DAYS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}
