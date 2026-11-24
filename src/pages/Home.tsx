import { useShallow } from "zustand/react/shallow";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Check, Images } from "lucide-react";
import { startSlideshow } from "@/components/AppShell";
import { useHub, unreadNotesFor, activeHabit } from "@/lib/store";
import { useChoresFor, useFamilyJar, useMarbles, useNow, useShoppingList, useTonightsDinner } from "@/lib/hooks";
import { dateKey, dayPart, formatTime, greeting } from "@/lib/time";
import { binReminder, countdowns, reoDay, reoGreeting, sleepsLabel } from "@/lib/nz";
import { eventMembers, eventStart, isTask, onDay, taskTitle, useCalendar } from "@/lib/integrations/calendar";
import { usePointPals } from "@/lib/integrations/pointpals";
import { notionAction, useNotion } from "@/lib/integrations/notion";
import { toast } from "sonner";
import { recipeImage } from "@/lib/integrations/signal";
import { describeWeather, useWeather } from "@/lib/integrations/weather";
import { groceryEmoji, noteColor } from "@/lib/catalog";
import { pal } from "@/lib/pals";
import type { CalendarEvent, Member } from "@/lib/types";
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
    // Bench and wall: hero down the left, four cards in a 2×2. Phones: one
    // column that scrolls, each card at a comfortable height.
    <div className="flex flex-col gap-[1.3rem] pb-4 md:grid md:h-full md:grid-cols-3 md:grid-rows-2 md:pb-0">
      <Hero />
      <DinnerTile />
      <JarTile />
      <ListTile />
      <NotesTile />
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
  const todayAll = events.filter((e) => onDay(e, now));
  const tasks = todayAll.filter(isTask);
  const today = todayAll.filter((e) => !isTask(e) && (e.allDay || eventStart(e) > new Date(now.getTime() - 60 * 60000)));
  const comingUp = upcoming(events, now).filter((e) => !isTask(e));
  const w = weather.data ? describeWeather(weather.data.code, weather.data.isDay) : null;
  const hour = now.getHours();
  const reflectionTime = hour >= 17 && hour < 21;
  const bins = binReminder(settings.binDay, settings.recycling, now);
  const next = countdowns(members, now, settings.nzDates).find((c) => c.sleeps > 0);
  const english = greeting(now);
  const summary = `${settings.teReo ? `${reoGreeting(now)}! ` : ""}${english}! ${
    w && weather.data ? `It's ${weather.data.temp} degrees and ${w.label.toLowerCase()} in Taupō. ` : ""
  }${today.length ? `Today we have ${today.length} thing${today.length > 1 ? "s" : ""} on.` : "Nothing on the calendar today."}${
    tasks.length ? ` And ${tasks.length} thing${tasks.length > 1 ? "s" : ""} to do: ${tasks.map(taskTitle).join(", ")}.` : ""
  }${next ? ` ${sleepsLabel(next.sleeps)} until ${next.label}!` : ""}`;

  return (
    <section
      className="relative flex flex-col overflow-hidden rounded-[2.2rem] p-[1.6rem] shadow-[var(--shadow-lift)] md:row-span-2 md:min-h-0"
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
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sfx.pop();
              startSlideshow();
            }}
            aria-label="Start the photo slideshow"
            title="Photo slideshow"
            className="tap grid size-[3.8rem] place-items-center rounded-full bg-white/85 text-ink shadow-[var(--shadow-soft)]"
          >
            <Images className="size-6" />
          </button>
          <ReadAloud text={summary} />
        </div>
      </div>

      <div className="relative mt-4">
        <p className="mb-2.5 text-[1.05rem] font-black uppercase tracking-[0.1em] opacity-60">Who's here?</p>
        <div className="flex flex-wrap gap-x-3.5 gap-y-2 pt-1">
          {members.slice(0, 6).map((m) => (
            <WhoButton key={m.id} member={m} />
          ))}
        </div>
      </div>

      <div className="no-scrollbar relative mt-4 flex flex-col gap-4 pb-2 md:min-h-0 md:flex-1 md:overflow-y-auto md:[mask-image:linear-gradient(to_bottom,black_88%,transparent)]">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[1.05rem] font-black uppercase tracking-[0.1em] opacity-60">Today</p>
            <Link to="/calendar" className="text-[1.1rem] font-extrabold underline-offset-4 opacity-70 hover:underline">
              See the week
            </Link>
          </div>
          <ul className="flex flex-col gap-1.5">
            {today.map((e) => (
              <EventRow key={e.id} e={e} members={members} />
            ))}
            {today.length === 0 && (
              <li className="rounded-[1.1rem] bg-white/55 px-4 py-2.5 text-[1.25rem] font-bold text-ink-2">A free day. Lovely! ☀️</li>
            )}
          </ul>
        </div>

        <TaskList tasks={tasks} bins={bins} />

        {comingUp.length > 0 && (
          <div>
            <p className="mb-1.5 text-[1.05rem] font-black uppercase tracking-[0.1em] opacity-60">Coming up</p>
            <ul className="flex flex-col gap-1.5">
              {comingUp.map((e) => (
                <EventRow key={e.id} e={e} members={members} day />
              ))}
            </ul>
          </div>
        )}

        {next && (
          <p className="text-[1.15rem] font-extrabold opacity-75">
            {next.emoji} {sleepsLabel(next.sleeps)} till {next.label}
          </p>
        )}
      </div>

      <ReflectionCard highlight={reflectionTime} />
    </section>
  );
}

/** The next few things after today, to fill the card on a quiet day. */
function upcoming(events: CalendarEvent[], now: Date): CalendarEvent[] {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 4);
  return events
    .filter((e) => e.calendar !== "bookings" && eventStart(e) >= start && eventStart(e) < end)
    .sort((a, b) => eventStart(a).getTime() - eventStart(b).getTime())
    .slice(0, 6);
}

function EventRow({ e, members, day }: { e: CalendarEvent; members: Member[]; day?: boolean }) {
  const who = eventMembers(e, members);
  const m = members.find((x) => x.id === who[0]);
  const colour = e.calendar === "bookings" ? "#8a8597" : e.calendar === "nz" ? "#2f6b42" : m ? pal(m.palId).shade : "#ee7b5b";
  const start = eventStart(e);
  const when = day
    ? `${start.toLocaleDateString("en-NZ", { weekday: "short" })}${e.allDay ? "" : ` ${formatTime(start)}`}`
    : e.allDay
      ? "All day"
      : formatTime(start);
  return (
    <li className="flex items-center gap-2.5 rounded-[1.1rem] bg-white/70 px-3 py-2 text-ink backdrop-blur">
      <span className="h-[2.2rem] w-[0.4rem] shrink-0 rounded-full" style={{ background: colour }} />
      <span className={cn("shrink-0 text-[1.1rem] font-black text-ink-2", day ? "w-[7.4rem]" : "w-[4.9rem]")}>{when}</span>
      <span className="min-w-0 flex-1 truncate text-[1.25rem] font-extrabold">
        {e.emoji ? `${e.emoji} ` : e.calendar === "bookings" ? "🧹 " : ""}
        {e.title}
      </span>
      {m && <Avatar member={m} size={2} />}
    </li>
  );
}

/** Today's to-dos from the calendar (plus bin night), ticked off on the screen. */
function TaskList({ tasks, bins }: { tasks: CalendarEvent[]; bins: ReturnType<typeof binReminder> }) {
  const done = useHub((s) => s.doneTasks);
  const toggleLocal = useHub((s) => s.toggleTask);
  const notion = useNotion(true);
  const today = dateKey();
  // Notion Life Admin: anything overdue, due today, or with no date.
  const notionTasks = (notion.data?.tasks ?? []).filter((t) => !t.due || t.due.slice(0, 10) <= today);
  const items: { id: string; label: string; notionId?: string; late?: boolean }[] = [
    ...(bins ? [{ id: `bins-${today}`, label: `🗑️ Bins out ${bins.when}${bins.recycling ? " + recycling ♻️" : ""}` }] : []),
    ...tasks.map((t) => ({ id: t.id, label: `${t.emoji ? `${t.emoji} ` : ""}${taskTitle(t)}` })),
    ...notionTasks.map((t) => ({ id: `notion-${t.id}`, notionId: t.id, label: `📋 ${t.task}`, late: !!t.due && t.due.slice(0, 10) < today })),
  ];
  const toggle = (id: string) => {
    const item = items.find((i) => i.id === id);
    toggleLocal(id);
    if (item?.notionId && !done[id]) {
      // Ticking a Notion task marks it Done in Notion too.
      notionAction({ action: "completeTask", id: item.notionId })
        .then(() => notion.refresh())
        .catch((e: unknown) => {
          toggleLocal(id);
          toast.error(e instanceof Error ? e.message : "Notion didn't take that");
        });
    }
  };
  if (!items.length) return null;
  const left = items.filter((i) => !done[i.id]).length;
  return (
    <div>
      <p className="mb-1.5 text-[1.05rem] font-black uppercase tracking-[0.1em] opacity-60">
        To do {left ? `· ${left} left` : "· all done! 🎉"}
      </p>
      <ul className="flex flex-col">
        {items.map((i) => {
          const on = !!done[i.id];
          return (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => {
                  if (!on) sfx.success();
                  else sfx.tap();
                  toggle(i.id);
                }}
                aria-pressed={on}
                className="tap flex min-h-[2.9rem] w-full items-center gap-2.5 text-left"
              >
                <span className={cn("grid size-[1.9rem] shrink-0 place-items-center rounded-full border-2", on ? "border-sage bg-sage text-white" : "border-current bg-white/70 opacity-70")}>
                  {on && <Check className="size-3.5" strokeWidth={3.5} />}
                </span>
                <span className={cn("min-w-0 flex-1 truncate text-[1.25rem] font-extrabold", on && "line-through opacity-50")}>{i.label}</span>
                {i.late && !on && <span className="shrink-0 rounded-full bg-coral px-2 text-[0.9rem] font-black text-white">overdue</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function WhoButton({ member }: { member: Member }) {
  const navigate = useNavigate();
  const notes = useHub((s) => s.notes);
  const { chores } = useChoresFor(member);
  const unread = unreadNotesFor(notes, member.id).length;
  const todo = chores.filter((c) => c.state === "todo").length;
  const waiting = [unread && `${unread} new note${unread > 1 ? "s" : ""}`, todo && `${todo} job${todo > 1 ? "s" : ""} to do`]
    .filter(Boolean)
    .join(", ");
  return (
    <button
      type="button"
      onClick={() => {
        sfx.pop();
        navigate(`/me/${member.id}`);
      }}
      className="tap relative rounded-full"
      aria-label={`${member.name}'s zone${waiting ? ` — ${waiting}` : ""}`}
      title={waiting || `${member.name}'s zone`}
    >
      <Avatar member={member} size={3.7} ring />
      <span className="mt-1 block max-w-[6.5rem] truncate rounded-full bg-white/80 px-2 text-center text-[1.1rem] font-extrabold text-ink">{member.name}</span>
      {/* ✉️ new notes for them, ⭐ PointPals jobs still to do. */}
      <span className="absolute -right-2.5 -top-2 flex flex-col items-end gap-0.5">
        {unread > 0 && (
          <span className="flex h-[1.8rem] items-center gap-0.5 rounded-full bg-coral px-1.5 text-[0.95rem] font-black text-white ring-2 ring-white">✉️{unread}</span>
        )}
        {todo > 0 && (
          <span className="flex h-[1.8rem] items-center gap-0.5 rounded-full bg-ink px-1.5 text-[0.95rem] font-black text-white ring-2 ring-white">⭐{todo}</span>
        )}
      </span>
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
        <span className="block truncate font-display text-[1.55rem] font-black leading-none">
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
      className="tap group relative min-h-[18rem] overflow-hidden rounded-[2rem] bg-peach-tint shadow-[var(--shadow-soft)] md:min-h-0"
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
  // Everyone with a jar: the kids, plus grown-ups PointPals counts as earners.
  const kids = useHub(useShallow((s) => s.members.filter((m) => m.role === "child" || !!m.pointpalsKidId)));
  return (
    <Link to="/me" onClick={() => sfx.tap()} className="tap card flex min-h-[20rem] flex-col gap-3 overflow-hidden bg-sun-tint p-4 md:min-h-0">
      <div className="flex items-center gap-3">
        <MarbleJar count={jar.count} target={jar.target} size={6.5} pending={pending} />
        <div className="min-w-0 flex-1">
          <p className="text-[1.05rem] font-black uppercase tracking-[0.08em] text-[#8a6a10]">Family jar</p>
          <p className="font-display text-[2.6rem] font-black leading-none">
            {jar.count}
            <span className="text-[1.5rem] text-ink-3">/{jar.target}</span>
          </p>
          <p className="mb-1.5 truncate text-[1.15rem] font-extrabold text-ink-2">to {jar.reward} 🍿</p>
          <JarProgress count={jar.count} target={jar.target} />
          {pending > 0 && <p className="mt-1 text-[1.05rem] font-extrabold text-coral-ink">{pending} waiting for a grown-up</p>}
        </div>
      </div>
      {kids.length > 0 && (
        <div className="grid min-h-0 flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(kids.length, 4)}, minmax(0, 1fr))` }}>
          {kids.slice(0, 4).map((k) => (
            <KidJar key={k.id} member={k} />
          ))}
        </div>
      )}
    </Link>
  );
}

/** Someone's own jar: their PointPals jar (e.g. 6/50) when they have one, otherwise their marbles. */
function KidJar({ member }: { member: Member }) {
  const marbles = useMarbles(member);
  const kid = usePointPals((s) => (s.userId && member.pointpalsKidId ? s.kids.find((k) => k.id === member.pointpalsKidId) : undefined));
  const personal = kid && kid.personalTarget > 0;
  const count = personal ? kid.personalPool : marbles;
  const target = personal ? kid.personalTarget : undefined;
  return (
    <div className="flex min-w-0 flex-col items-center justify-end rounded-[1.2rem] bg-white/60 px-1 py-2 text-center">
      <MarbleJar count={count} target={target ?? Math.max(count, 10)} size={4.6} />
      <p className="mt-1 w-full truncate text-[1.1rem] font-black">{member.name}</p>
      <p className="w-full truncate text-[1rem] font-extrabold text-ink-2">
        {target ? `${count}/${target}` : `${count} marble${count === 1 ? "" : "s"}`}
      </p>
      {personal && kid.personalReward && <p className="w-full truncate text-[0.9rem] font-bold text-ink-3">{kid.personalReward}</p>}
    </div>
  );
}

function ListTile() {
  const { items } = useShoppingList();
  const todo = items.filter((i) => !i.checked);
  return (
    <Link to="/list" onClick={() => sfx.tap()} className="tap card flex min-h-[14rem] flex-col overflow-hidden bg-sage-tint p-5 md:min-h-0">
      <div className="flex items-start justify-between">
        <p className="text-[1.15rem] font-black uppercase tracking-[0.08em] text-sage-ink">Shopping list</p>
        <span className="text-[2.2rem] leading-none">🛒</span>
      </div>
      <p className="font-display text-[3rem] font-black leading-none">
        {todo.length} <span className="text-[1.6rem] text-ink-2">to buy</span>
      </p>
      <div className="mt-3 flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-hidden">
        {todo.slice(0, 18).map((i) => (
          <span key={i.id} className="rounded-full bg-white px-3 py-1 text-[1.15rem] font-extrabold">
            {groceryEmoji(i.name)} {i.name}
          </span>
        ))}
      </div>
    </Link>
  );
}

function NotesTile() {
  const notes = useHub(useShallow((s) => s.notes.filter((n) => !n.doneAt)));
  const members = useHub((s) => s.members);
  const unread = useHub((s) => new Set(s.members.flatMap((m) => unreadNotesFor(s.notes, m.id).map((n) => n.id))).size);
  const shown = notes.slice(0, 4);
  return (
    <Link to="/notes" onClick={() => sfx.tap()} className="tap fridge relative flex min-h-[18rem] flex-col overflow-hidden rounded-[2rem] p-5 shadow-[var(--shadow-soft)] ring-1 ring-black/5 md:min-h-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[1.15rem] font-black uppercase tracking-[0.08em] text-lilac-ink">Fridge notes</p>
        <span className="rounded-full bg-lilac px-3 py-0.5 text-[1.1rem] font-black text-white">
          {notes.length} note{notes.length === 1 ? "" : "s"}
          {unread > 0 ? ` · ${unread} new` : ""}
        </span>
      </div>
      <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 content-start gap-3 overflow-hidden">
        {shown.map((n, i) => {
          const c = noteColor(n.color);
          const from = members.find((m) => m.id === n.from);
          return (
            <motion.div
              key={n.id}
              className={cn("relative rounded-[0.6rem] p-3 pt-4 shadow-[0_8px_16px_-8px_rgb(0_0_0/0.3)]", i >= 2 && "md:hidden")}
              style={{ background: c.bg, color: c.ink, rotate: [-3, 2.5, 2, -2][i % 4] }}
              whileHover={{ rotate: 0 }}
            >
              <span className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full bg-coral shadow ring-2 ring-white/70" />
              <p className="line-clamp-3 text-[1.1rem] font-extrabold leading-tight">
                {n.kind === "voice" ? "🎤 Voice note" : n.kind === "doodle" ? "🖍️ A drawing" : n.text}
              </p>
              {from && <p className="mt-1 text-[0.95rem] font-black opacity-70">– {from.name}</p>}
            </motion.div>
          );
        })}
        {notes.length === 0 && <p className="col-span-2 pt-4 text-[1.35rem] font-bold text-ink-2">Leave the first note!</p>}
      </div>
      {notes.length > 0 && (
        <p className="mt-2 text-right text-[1.1rem] font-black text-lilac-ink">
          View all {notes.length} →
        </p>
      )}
    </Link>
  );
}
