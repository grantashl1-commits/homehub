import { useShallow } from "zustand/react/shallow";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, CalendarPlus, ListPlus, StickyNote } from "lucide-react";
import { useHub, unreadNotesFor, activeHabit } from "@/lib/store";
import { useChoresFor, useFamilyJar, useNow, useShoppingList, useTonightsDinner } from "@/lib/hooks";
import { dateKey, dayPart, formatTime, greeting } from "@/lib/time";
import { binReminder, countdowns, reoDay, reoGreeting, sleepsLabel, wearTips } from "@/lib/nz";
import { eventMembers, eventStart, onDay, useCalendar } from "@/lib/integrations/calendar";
import { recipeImage } from "@/lib/integrations/signal";
import { describeWeather, useWeather } from "@/lib/integrations/weather";
import { groceryEmoji, noteColor } from "@/lib/catalog";
import { pal } from "@/lib/pals";
import type { Member } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { JarProgress, MarbleJar } from "@/components/MarbleJar";
import { ReadAloud } from "@/components/ui";
import { cn } from "@/lib/utils";
import { sfx } from "@/lib/device";

const SKIES = {
  morning: { bg: "linear-gradient(150deg,#FFE7BF 0%,#FFCFAE 55%,#F9B08F 100%)", ink: "#4a2a12" },
  afternoon: { bg: "linear-gradient(150deg,#DDF0FF 0%,#B7DDFB 55%,#94C7F1 100%)", ink: "#123a5e" },
  evening: { bg: "linear-gradient(150deg,#EADCFF 0%,#F6C9DC 55%,#F8B496 100%)", ink: "#3b1d4a" },
  night: { bg: "linear-gradient(150deg,#39407a 0%,#262b52 60%,#1b1f3c 100%)", ink: "#ffffff" },
} as const;

export default function Home() {
  return (
    <div className="grid h-full grid-cols-3 grid-rows-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-[1.3rem]">
      <Hero />
      <DinnerTile />
      <JarTile />
      <ListTile />
      <NotesTile />
      <QuickAdd />
    </div>
  );
}

function Hero() {
  const now = useNow();
  const part = dayPart(now);
  const sky = SKIES[part];
  const members = useHub((s) => s.members);
  const settings = useHub((s) => s.settings);
  const { events } = useCalendar();
  const weather = useWeather();
  const today = events.filter((e) => onDay(e, now) && (e.allDay || eventStart(e) > new Date(now.getTime() - 60 * 60000)));
  const w = weather.data ? describeWeather(weather.data.code, weather.data.isDay) : null;
  const hour = now.getHours();
  const reflectionTime = hour >= 17 && hour < 21;
  const tips = wearTips(weather.data);
  const bins = binReminder(settings.binDay, settings.recycling, now);
  const next = countdowns(members, now, settings.nzDates).find((c) => c.sleeps > 0);
  const english = greeting(now);
  const summary = `${settings.teReo ? `${reoGreeting(now)}! ` : ""}${english}! ${
    w && weather.data ? `It's ${weather.data.temp} degrees and ${w.label.toLowerCase()} in Taupō. ` : ""
  }${today.length ? `Today we have ${today.length} thing${today.length > 1 ? "s" : ""} on.` : "Nothing on the calendar today."}${
    next ? ` ${sleepsLabel(next.sleeps)} until ${next.label}!` : ""
  }`;

  return (
    <section
      className="relative row-span-3 flex min-h-0 flex-col overflow-hidden rounded-[2.2rem] p-[1.6rem] shadow-[var(--shadow-lift)]"
      style={{ background: sky.bg, color: sky.ink }}
    >
      <Sun part={part} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[1.2rem] font-extrabold opacity-75">
            {settings.teReo ? `${reoDay(now)} · ` : ""}
            {w && weather.data ? `${w.emoji} ${weather.data.temp}° ${w.label}` : "Taupō"}
          </p>
          <h1 className="mt-0.5 font-display text-[3.3rem] font-black leading-[0.95]">{settings.teReo ? reoGreeting(now) : english}!</h1>
          {settings.teReo && <p className="text-[1.2rem] font-extrabold leading-tight opacity-70">{english}</p>}
        </div>
        <ReadAloud text={summary} />
      </div>

      {(tips.length > 0 || bins || next) && (
        <div className="relative mt-2.5 flex max-h-[4.6rem] flex-wrap gap-1.5 overflow-hidden">
          {bins && (
            <span className="rounded-full bg-white/80 px-3 py-1 text-[1.1rem] font-black text-ink">
              🗑️ Bins out {bins.when}{bins.recycling ? " + recycling ♻️" : ""}
            </span>
          )}
          {tips.slice(0, 2).map((t) => (
            <span key={t.text} className="rounded-full bg-white/80 px-3 py-1 text-[1.1rem] font-black text-ink">
              {t.emoji} {t.text}
            </span>
          ))}
          {next && (
            <span className="rounded-full bg-white/80 px-3 py-1 text-[1.1rem] font-black text-ink">
              {next.emoji} {sleepsLabel(next.sleeps)} till {next.label}
            </span>
          )}
        </div>
      )}

      <div className="relative mt-3">
        <p className="mb-1 text-[1.05rem] font-black uppercase tracking-[0.1em] opacity-60">Who's here?</p>
        <div className="flex gap-2">
          {members.slice(0, 5).map((m) => (
            <WhoButton key={m.id} member={m} />
          ))}
        </div>
      </div>

      <div className="relative mt-3 flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[1.05rem] font-black uppercase tracking-[0.1em] opacity-60">Today</p>
          <Link to="/calendar" className="text-[1.1rem] font-extrabold underline-offset-4 opacity-70 hover:underline">
            See the week
          </Link>
        </div>
        <ul className="flex min-h-0 flex-col gap-1.5 overflow-hidden [mask-image:linear-gradient(to_bottom,black_78%,transparent)]">
          {today.map((e) => {
            const who = eventMembers(e, members);
            const m = members.find((x) => x.id === who[0]);
            const colour = e.calendar === "bookings" ? "#8a8597" : e.calendar === "nz" ? "#2f6b42" : m ? pal(m.palId).shade : "#ee7b5b";
            return (
              <li key={e.id} className="flex shrink-0 items-center gap-2.5 rounded-[1.1rem] bg-white/70 px-3 py-2 text-ink backdrop-blur">
                <span className="h-[2.2rem] w-[0.4rem] shrink-0 rounded-full" style={{ background: colour }} />
                <span className="w-[4.9rem] shrink-0 text-[1.1rem] font-black text-ink-2">
                  {e.allDay ? "All day" : formatTime(eventStart(e))}
                </span>
                <span className="min-w-0 flex-1 truncate text-[1.25rem] font-extrabold">
                  {e.emoji ? `${e.emoji} ` : e.calendar === "bookings" ? "🧹 " : ""}
                  {e.title}
                </span>
                {m && <Avatar member={m} size={2} />}
              </li>
            );
          })}
          {today.length === 0 && (
            <li className="rounded-[1.1rem] bg-white/55 px-4 py-2.5 text-[1.25rem] font-bold text-ink-2">A free day. Lovely! ☀️</li>
          )}
        </ul>
      </div>

      <ReflectionCard highlight={reflectionTime} />
    </section>
  );
}

function WhoButton({ member }: { member: Member }) {
  const navigate = useNavigate();
  const notes = useHub((s) => s.notes);
  const { chores } = useChoresFor(member.role === "child" ? member : undefined);
  const unread = unreadNotesFor(notes, member.id).length;
  const todo = chores.filter((c) => c.state === "todo").length;
  const badge = unread ? `✉️${unread > 1 ? unread : ""}` : todo || undefined;
  return (
    <button
      type="button"
      onClick={() => {
        sfx.pop();
        navigate(`/me/${member.id}`);
      }}
      className="tap rounded-full"
      aria-label={`${member.name}'s zone`}
    >
      <Avatar member={member} size={3.7} ring label badge={badge} />
    </button>
  );
}

function ReflectionCard({ highlight }: { highlight: boolean }) {
  const members = useHub((s) => s.members);
  const habits = useHub((s) => s.habits);
  const checkins = useHub((s) => s.checkins);
  const today = dateKey();
  const withHabit = members.filter((m) => activeHabit(habits, m.id));
  const done = withHabit.filter((m) => checkins.some((c) => c.memberId === m.id && c.date === today));
  return (
    <Link
      to="/reflect"
      onClick={() => sfx.pop()}
      className={cn(
        "tap relative mt-3 flex shrink-0 items-center gap-3 rounded-[1.5rem] px-4 py-3 text-ink",
        highlight ? "bg-white shadow-[var(--shadow-lift)]" : "bg-white/60",
      )}
    >
      <motion.span
        className="text-[2.6rem] leading-none"
        animate={highlight ? { rotate: [-8, 8, -8] } : undefined}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🍽️
      </motion.span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[1.7rem] font-black leading-none">
          {highlight ? "Reflection time!" : "Dinner reflection"}
        </span>
        <span className="block truncate text-[1.1rem] font-bold text-ink-2">
          {done.length} of {withHabit.length} checked in
        </span>
      </span>
      <span className={cn("grid size-[3.2rem] shrink-0 place-items-center rounded-full text-white", highlight ? "bg-coral" : "bg-ink/80")}>
        <ArrowRight className="size-6" strokeWidth={3} />
      </span>
    </Link>
  );
}

function Sun({ part }: { part: ReturnType<typeof dayPart> }) {
  const emoji = part === "night" ? "🌙" : part === "evening" ? "🌇" : part === "afternoon" ? "☁️" : "☀️";
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute -right-6 -top-6 text-[9rem] leading-none opacity-30"
      animate={{ rotate: [0, 8, 0], y: [0, 6, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
    >
      {emoji}
    </motion.div>
  );
}

function DinnerTile() {
  const tonight = useTonightsDinner();
  const hearts = useHub((s) => (tonight?.dinnerId ? s.mealHearts[tonight.dinnerId]?.length ?? 0 : 0));
  const img = recipeImage(tonight?.dinner);
  return (
    <Link
      to="/meals"
      onClick={() => sfx.tap()}
      className="tap group relative overflow-hidden rounded-[2rem] bg-peach-tint shadow-[var(--shadow-soft)]"
    >
      {img ? (
        <img src={img} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105" onError={(e) => (e.currentTarget.style.display = "none")} />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-[7rem] opacity-60">🍲</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
      <span className="absolute left-4 top-4 rounded-full bg-white/90 px-4 py-1 text-[1.15rem] font-black text-ink">🍽️ Tonight</span>
      {hearts > 0 && (
        <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[1.15rem] font-black text-coral-ink">❤️ {hearts}</span>
      )}
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <p className="line-clamp-2 font-display text-[2.2rem] font-black leading-[1]">
          {tonight?.dinner?.name ?? "Plan tonight's dinner"}
        </p>
        {tonight?.dinner?.time && <p className="mt-1 text-[1.2rem] font-bold opacity-85">⏱ {tonight.dinner.time}</p>}
      </div>
    </Link>
  );
}

function JarTile() {
  const jar = useFamilyJar();
  const pending = useHub((s) => s.claims.filter((c) => c.status === "pending").length);
  return (
    <Link to="/me" onClick={() => sfx.tap()} className="tap card flex items-center gap-3 overflow-hidden bg-sun-tint p-4">
      <MarbleJar count={jar.count} target={jar.target} size={11.5} pending={pending} />
      <div className="min-w-0 flex-1">
        <p className="text-[1.15rem] font-black uppercase tracking-[0.08em] text-[#8a6a10]">Family jar</p>
        <p className="font-display text-[3.4rem] font-black leading-none">
          {jar.count}
          <span className="text-[1.9rem] text-ink-3">/{jar.target}</span>
        </p>
        <p className="mb-2.5 truncate text-[1.25rem] font-extrabold text-ink-2">to {jar.reward} 🍿</p>
        <JarProgress count={jar.count} target={jar.target} />
        {pending > 0 && <p className="mt-2 text-[1.1rem] font-extrabold text-coral-ink">{pending} waiting for a grown-up</p>}
      </div>
    </Link>
  );
}

function ListTile() {
  const { items, source } = useShoppingList();
  const todo = items.filter((i) => !i.checked);
  return (
    <Link to="/list" onClick={() => sfx.tap()} className="tap card flex min-h-0 flex-col overflow-hidden bg-sage-tint p-5">
      <div className="flex items-start justify-between">
        <p className="text-[1.15rem] font-black uppercase tracking-[0.08em] text-sage-ink">Shopping list</p>
        <span className="text-[2.2rem] leading-none">🛒</span>
      </div>
      <p className="font-display text-[3rem] font-black leading-none">
        {todo.length} <span className="text-[1.6rem] text-ink-2">to buy</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2 overflow-hidden" style={{ maxHeight: "5.6rem" }}>
        {todo.slice(0, 6).map((i) => (
          <span key={i.id} className="rounded-full bg-white px-3 py-1 text-[1.15rem] font-extrabold">
            {groceryEmoji(i.name)} {i.name}
          </span>
        ))}
      </div>
      <p className="mt-auto pt-2 text-[1rem] font-bold text-sage-ink/80">{source === "signal" ? "● Synced with SIGNAL" : "Saved on this screen"}</p>
    </Link>
  );
}

function NotesTile() {
  const notes = useHub(useShallow((s) => s.notes.filter((n) => !n.doneAt)));
  const members = useHub((s) => s.members);
  return (
    <Link to="/notes" onClick={() => sfx.tap()} className="tap fridge relative overflow-hidden rounded-[2rem] p-5 shadow-[var(--shadow-soft)] ring-1 ring-black/5">
      <div className="flex items-start justify-between">
        <p className="text-[1.15rem] font-black uppercase tracking-[0.08em] text-lilac-ink">Fridge notes</p>
        <span className="rounded-full bg-lilac px-3 py-0.5 text-[1.1rem] font-black text-white">{notes.length}</span>
      </div>
      <div className="relative mt-2 h-[calc(100%-2.2rem)]">
        {notes.slice(0, 2).map((n, i) => {
          const c = noteColor(n.color);
          const from = members.find((m) => m.id === n.from);
          return (
            <motion.div
              key={n.id}
              className="absolute w-[62%] rounded-[0.6rem] p-3 shadow-[0_8px_16px_-8px_rgb(0_0_0/0.3)]"
              style={{ background: c.bg, color: c.ink, left: i ? "36%" : "2%", top: i ? "22%" : "4%", rotate: i ? 3 : -4 }}
              whileHover={{ rotate: 0 }}
            >
              <span className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-coral shadow ring-2 ring-white/70" />
              <p className="line-clamp-3 text-[1.15rem] font-extrabold leading-tight">
                {n.kind === "voice" ? "🎤 Voice note" : n.kind === "doodle" ? "🖍️ A drawing" : n.text}
              </p>
              {from && <p className="mt-1 text-[0.95rem] font-black opacity-70">– {from.name}</p>}
            </motion.div>
          );
        })}
        {notes.length === 0 && <p className="pt-4 text-[1.35rem] font-bold text-ink-2">Leave the first note!</p>}
      </div>
    </Link>
  );
}

function QuickAdd() {
  const navigate = useNavigate();
  const items = [
    { label: "Shopping", icon: ListPlus, to: "/list?add=1", bg: "var(--sage)" },
    { label: "Calendar", icon: CalendarPlus, to: "/calendar?add=1", bg: "var(--sky)" },
    { label: "Note", icon: StickyNote, to: "/notes?add=1", bg: "var(--lilac)" },
  ];
  return (
    <div className="col-span-2 grid grid-cols-3 gap-[1.3rem]">
      {items.map((i) => (
        <button
          key={i.label}
          type="button"
          onClick={() => {
            sfx.pop();
            navigate(i.to);
          }}
          className="tap flex h-[5.2rem] items-center justify-center gap-3 rounded-[1.6rem] text-[1.55rem] font-black text-white shadow-[var(--shadow-soft)]"
          style={{ background: i.bg }}
        >
          <i.icon className="size-8" strokeWidth={2.6} />+ {i.label}
        </button>
      ))}
    </div>
  );
}
