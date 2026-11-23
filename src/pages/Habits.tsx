import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { useHub, activeHabit, habitStreak } from "@/lib/store";
import { HABIT_PRESETS } from "@/lib/catalog";
import { pal } from "@/lib/pals";
import { addDays, dateKey, formatDayShort, startOfWeek } from "@/lib/time";
import { sfx } from "@/lib/device";
import type { HabitFrequency } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { BigButton, ChoreIcon, Segmented } from "@/components/ui";
import { celebrate } from "@/components/Celebrate";
import { cn } from "@/lib/utils";

type Freq = "daily" | "weekdays" | "3";

export default function Habits() {
  const { id } = useParams();
  const navigate = useNavigate();
  const members = useHub((s) => s.members);
  const habits = useHub((s) => s.habits);
  const checkins = useHub((s) => s.checkins);
  const setHabit = useHub((s) => s.setHabit);
  const member = members.find((m) => m.id === id) ?? members[0];
  const habit = member ? activeHabit(habits, member.id) : undefined;
  const [freq, setFreq] = useState<Freq>("daily");
  const [custom, setCustom] = useState("");
  if (!member) return null;
  const p = pal(member.palId);
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(), i));
  const streak = habit ? habitStreak(checkins, habit.id) : 0;
  const presets = HABIT_PRESETS.filter((h) => h.forKids === (member.role === "child"));

  const frequency = (): HabitFrequency =>
    freq === "daily" ? { kind: "daily" } : freq === "weekdays" ? { kind: "weekdays" } : { kind: "perWeek", times: 3 };

  const choose = (title: string, icon: string) => {
    setHabit(member.id, { title, icon, frequency: frequency() });
    celebrate({ title: "New habit!", subtitle: title, palId: member.palId });
  };

  return (
    <div className="grid h-full grid-cols-[6.5rem_minmax(0,1fr)_minmax(0,1.25fr)] gap-[1.3rem]">
      <div className="flex flex-col items-center gap-3 rounded-[2rem] bg-white/70 py-4 ring-1 ring-black/5">
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              sfx.tap();
              navigate(`/habits/${m.id}`, { replace: true });
            }}
            className={cn("tap rounded-full p-0.5", m.id === member.id && "ring-[0.3rem] ring-ink")}
            aria-label={m.name}
          >
            <Avatar member={m} size={4.6} />
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-4 rounded-[2.2rem] p-6 shadow-[var(--shadow-lift)]" style={{ background: `linear-gradient(170deg, ${p.tint}, #fff 75%)` }}>
        <div className="flex items-center gap-4">
          <Avatar member={member} size={6} />
          <h1 className="font-display text-[3.2rem] font-black leading-none" style={{ color: p.ink }}>
            {member.name}'s habit
          </h1>
        </div>
        {habit ? (
          <motion.div key={habit.id} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3 rounded-[1.8rem] bg-white p-6 text-center shadow-[var(--shadow-soft)]">
            <ChoreIcon icon={habit.icon} size={8} />
            <p className="font-display text-[3rem] font-black leading-none">{habit.title}</p>
            <p className="text-[1.3rem] font-bold text-ink-2">
              {habit.frequency.kind === "daily" ? "Every day" : habit.frequency.kind === "weekdays" ? "School days" : `${habit.frequency.times} times a week`}
              {streak > 0 && ` · 🔥 ${streak} in a row`}
            </p>
          </motion.div>
        ) : (
          <div className="grid flex-1 place-items-center rounded-[1.8rem] bg-white/70 p-6 text-center text-[1.6rem] font-bold text-ink-2">
            🌱 No habit yet. Pick one on the right!
          </div>
        )}
        <div>
          <p className="mb-2 text-[1.15rem] font-black uppercase tracking-[0.08em] text-ink-3">This week</p>
          <div className="grid grid-cols-7 gap-2">
            {week.map((d) => {
              const c = habit && checkins.find((x) => x.habitId === habit.id && x.date === dateKey(d));
              const isToday = dateKey(d) === dateKey();
              return (
                <div key={d.toISOString()} className="flex flex-col items-center gap-1">
                  <span className={cn("text-[1.05rem] font-black", isToday ? "text-coral-ink" : "text-ink-3")}>{formatDayShort(d)}</span>
                  <span
                    className={cn(
                      "grid size-[3.4rem] place-items-center rounded-full text-[1.4rem] ring-2",
                      c?.status === "done" ? "ring-transparent" : "bg-white ring-black/10",
                      isToday && !c && "ring-coral",
                    )}
                    style={c?.status === "done" ? { background: p.color } : c ? { background: "var(--lilac-tint)" } : undefined}
                  >
                    {c?.status === "done" ? "✓" : c ? "☁️" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="card flex min-h-0 flex-col p-6">
        <div className="mb-3 flex flex-col gap-3">
          <h2 className="font-display text-[2.6rem] font-black leading-none">{habit ? "Choose a new habit" : "Choose a habit"}</h2>
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
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-3 overflow-y-auto no-scrollbar">
          {presets.map((h) => (
            <button
              key={h.title}
              type="button"
              onClick={() => {
                sfx.pop();
                choose(h.title, h.icon);
              }}
              className={cn(
                "tap flex flex-col items-center justify-center gap-2 rounded-[1.6rem] p-3 text-center ring-1 ring-black/5",
                habit?.title === h.title ? "bg-sage-tint ring-[0.25rem] ring-sage" : "bg-paper",
              )}
            >
              <ChoreIcon icon={h.icon} size={4.8} />
              <span className="text-[1.25rem] font-extrabold leading-tight">{h.title}</span>
            </button>
          ))}
        </div>
        {member.role === "parent" && (
          <div className="mt-4 flex gap-3">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Or write your own…"
              className="h-[4.6rem] min-w-0 flex-1 rounded-[1.3rem] border-2 border-line bg-white px-5 text-[1.45rem] font-bold outline-none focus:border-sky"
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
        )}
      </section>
    </div>
  );
}
