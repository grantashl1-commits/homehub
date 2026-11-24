import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CalendarCheck2, Camera, Check, ImageIcon, Mic, Plus } from "lucide-react";
import { toast } from "sonner";
import { useHub } from "@/lib/store";
import { bookingKind, eventEnd, eventMembers, eventStart, onDay, useCalendar } from "@/lib/integrations/calendar";
import { KID_ACTIVITIES } from "@/lib/catalog";
import { pal } from "@/lib/pals";
import { DAY_PART_TIMES, addDays, dateKey, formatDayShort, formatTime, fromDateKey, relativeDayLabel, startOfWeek } from "@/lib/time";
import { googleTemplateUrl } from "@/lib/google-calendar";
import { useParentUnlocked } from "@/components/PinPad";
import { sfx } from "@/lib/device";
import { reoDay } from "@/lib/nz";
import { resizeImage } from "@/lib/media";
import { hubFetch } from "@/lib/integrations/hub-api";
import type { CalendarEvent, DayPart, KidPlan, Member } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { BigButton, Segmented, Sheet, SourceBadge } from "@/components/ui";
import { VoiceRecorder } from "@/components/Voice";
import { celebrate } from "@/components/Celebrate";
import { cn } from "@/lib/utils";

type View = "people" | "agenda";

export default function Calendar() {
  const [params, setParams] = useSearchParams();
  const members = useHub((s) => s.members);
  const kidPlans = useHub((s) => s.kidPlans);
  const { events, usingSamples, connected } = useCalendar();
  const [view, setView] = useState<View>("people");
  const [day, setDay] = useState(() => new Date());
  const [adding, setAdding] = useState<{ open: boolean; who?: string }>({ open: params.get("add") === "1", who: params.get("who") ?? undefined });
  const [snapping, setSnapping] = useState(false);
  const teReo = useHub((s) => s.settings.teReo);
  const dayNz = events.filter((e) => e.calendar === "nz" && onDay(e, day));

  useEffect(() => {
    if (params.get("add")) setParams({}, { replace: true });
  }, [params, setParams]);

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(), i)), []);
  const planMembers = (e: CalendarEvent) => kidPlans.find((p) => p.id === e.kidPlanId)?.memberIds;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-4 max-md:mb-3 max-md:flex-col max-md:items-stretch max-md:gap-2">
        <div className="max-md:flex max-md:items-center max-md:justify-between">
          <h1 className="font-display text-[3.4rem] font-black leading-none">Our calendar</h1>
          <div className="mt-1.5">
            <SourceBadge source={connected ? "google" : usingSamples ? "sample" : "local"} />
          </div>
        </div>
        <div className="flex items-center gap-3 max-md:gap-2 [&>button]:max-md:px-4">
          <Segmented<View>
            value={view}
            onChange={setView}
            options={[
              { value: "people", label: "People" },
              { value: "agenda", label: "Week" },
            ]}
          />
          <BigButton tone="white" size="md" aria-label="Snap a notice" icon={<Camera className="size-7" />} onClick={() => setSnapping(true)}>
            <span className="max-md:sr-only">Snap</span>
          </BigButton>
          <BigButton tone="sky" size="md" aria-label="Add an event" icon={<Plus className="size-7" strokeWidth={3} />} onClick={() => setAdding({ open: true })}>
            Add
          </BigButton>
        </div>
      </div>

      {view === "people" ? (
        <>
          <div className="mb-4 grid grid-cols-7 gap-2 rounded-[1.8rem] bg-white p-2 shadow-[var(--shadow-soft)] max-md:mb-3 max-md:gap-0.5 max-md:p-1">
            {week.map((d) => {
              const sel = dateKey(d) === dateKey(day);
              const isToday = dateKey(d) === dateKey();
              const count = events.filter((e) => onDay(e, d) && e.calendar !== "nz").length;
              const hol = events.find((e) => onDay(e, d) && e.calendar === "nz");
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    sfx.tap();
                    setDay(d);
                  }}
                  className={cn("tap relative flex flex-col items-center rounded-[1.3rem] py-2", sel ? "bg-sky text-white" : "hover:bg-sky-tint")}
                >
                  <span className={cn("text-[1.1rem] font-black uppercase", !sel && "text-ink-3")}>{formatDayShort(d)}</span>
                  <span className="font-display text-[2.4rem] font-black leading-none max-md:text-[1.9rem]">{d.getDate()}</span>
                  {teReo && <span className={cn("text-[0.95rem] font-extrabold max-md:hidden", sel ? "text-white/85" : "text-ink-3")}>{reoDay(d)}</span>}
                  <span className="mt-1 flex h-[0.7rem] gap-1">
                    {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                      <span key={i} className={cn("size-[0.6rem] rounded-full", sel ? "bg-white" : "bg-sky")} />
                    ))}
                  </span>
                  {isToday && !sel && <span className="absolute right-2 top-2 size-2.5 rounded-full bg-coral" />}
                  {hol && <span className="absolute left-2 top-1.5 text-[1.2rem]" title={hol.title}>{hol.emoji}</span>}
                </button>
              );
            })}
          </div>
          {dayNz.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {dayNz.map((e) => (
                <span key={e.id} className="rounded-full bg-sage-tint px-4 py-1.5 text-[1.25rem] font-black text-sage-ink">
                  {e.emoji} {e.title}
                </span>
              ))}
            </div>
          )}
          <PeopleColumns
            members={members}
            events={events.filter((e) => onDay(e, day))}
            planMembers={planMembers}
            onAdd={(who) => setAdding({ open: true, who })}
          />
        </>
      ) : (
        <Agenda events={events} members={members} planMembers={planMembers} />
      )}

      <SnapSheet open={snapping} onOpenChange={setSnapping} />
      <KidEventFlow open={adding.open} who={adding.who} onOpenChange={(o) => setAdding({ open: o })} defaultDay={day} />
    </div>
  );
}

function PeopleColumns({
  members,
  events,
  planMembers,
  onAdd,
}: {
  members: Member[];
  events: CalendarEvent[];
  planMembers: (e: CalendarEvent) => string[] | undefined;
  onAdd: (who?: string) => void;
}) {
  events = events.filter((e) => e.calendar !== "nz");
  const bookings = events.filter((e) => e.calendar === "bookings");
  const family = events.filter((e) => e.calendar !== "bookings" && eventMembers(e, members, planMembers(e)).length === 0);
  const cols: { key: string; member?: Member; title: string; events: CalendarEvent[]; tint: string; ink: string }[] = [
    ...members.map((m) => ({
      key: m.id,
      member: m,
      title: m.name,
      events: events.filter((e) => e.calendar !== "bookings" && eventMembers(e, members, planMembers(e)).includes(m.id)),
      tint: pal(m.palId).tint,
      ink: pal(m.palId).ink,
    })),
    { key: "family", title: "Family", events: family, tint: "var(--coral-tint)", ink: "var(--coral-ink)" },
  ];
  if (bookings.length) cols.push({ key: "bookings", title: "Airbnb", events: bookings, tint: "#ECEAF1", ink: "#4b4760" });

  return (
    // Phones: one person per screen-width column, swiped sideways and snapping into place.
    <div
      className="grid min-h-0 flex-1 gap-3 max-md:-mx-3 max-md:flex max-md:min-h-[60vh] max-md:snap-x max-md:snap-mandatory max-md:overflow-x-auto max-md:px-3 max-md:pb-2 no-scrollbar"
      style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}
    >
      {cols.map((c) => (
        <div key={c.key} className="flex min-h-0 flex-col rounded-[1.8rem] p-3 max-md:w-[78vw] max-md:shrink-0 max-md:snap-start" style={{ background: c.tint }}>
          <div className="mb-3 flex items-center gap-2.5 px-1">
            {c.member ? (
              <Avatar member={c.member} size={3.4} />
            ) : (
              <span className="grid size-[3.4rem] place-items-center rounded-full bg-white text-[1.9rem]">{c.key === "bookings" ? "🏡" : "👨‍👩‍👧‍👦"}</span>
            )}
            <span className="truncate font-display text-[1.9rem] font-black" style={{ color: c.ink }}>
              {c.title}
            </span>
          </div>
          {c.key !== "bookings" && (
            <button
              type="button"
              onClick={() => {
                sfx.tap();
                onAdd(c.member?.id);
              }}
              className="tap mb-3 grid h-[3.6rem] place-items-center rounded-[1.1rem] border-2 border-dashed border-black/15 bg-white/60 text-ink-2"
              aria-label={`Add something for ${c.title}`}
            >
              <Plus className="size-7" strokeWidth={3} />
            </button>
          )}
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto no-scrollbar">
            {c.events.map((e) => (
              <EventCard key={e.id} event={e} accent={c.member ? pal(c.member.palId).shade : c.key === "bookings" ? "#8a8597" : "var(--coral)"} />
            ))}
            {c.events.length === 0 && <p className="px-1 pt-2 text-center text-[1.15rem] font-bold opacity-50">Nothing on</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function EventCard({ event: e, accent }: { event: CalendarEvent; accent: string }) {
  const isBooking = e.calendar === "bookings";
  const kind = isBooking ? bookingKind(e) : null;
  const icon = e.emoji ?? (kind === "clean" ? "🧹" : kind === "checkin" ? "🔑" : kind === "checkout" ? "👋" : kind ? "🛏️" : null);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("relative overflow-hidden rounded-[1.1rem] bg-white p-3 shadow-sm", isBooking && "hatch")}
      style={{ borderLeft: `0.45rem solid ${accent}` }}
    >
      <p className="text-[1.05rem] font-black text-ink-3">
        {e.allDay ? "All day" : `${formatTime(eventStart(e))} – ${formatTime(eventEnd(e))}`}
      </p>
      <p className="text-[1.3rem] font-extrabold leading-tight">
        {icon && <span className="mr-1">{icon}</span>}
        {e.title}
      </p>
      {e.calendar === "hub" && <span className="mt-1 inline-block rounded-full bg-sun-tint px-2 text-[0.95rem] font-black">Added on the hub</span>}
    </motion.div>
  );
}

function Agenda({ events, members, planMembers }: { events: CalendarEvent[]; members: Member[]; planMembers: (e: CalendarEvent) => string[] | undefined }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  return (
    <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto pb-2 no-scrollbar">
      {days.map((d) => {
        const list = events.filter((e) => onDay(e, d));
        return (
          <div key={d.toISOString()} className="card p-4">
            <p className="mb-2 font-display text-[2rem] font-black leading-none">
              {relativeDayLabel(d)} <span className="text-[1.3rem] text-ink-3">{d.getDate()}</span>
            </p>
            <div className="flex flex-col gap-2">
              {list.map((e) => {
                const who = eventMembers(e, members, planMembers(e));
                const ms = members.filter((m) => who.includes(m.id));
                return (
                  <div key={e.id} className={cn("flex items-center gap-3 rounded-[1rem] bg-paper px-3 py-2", e.calendar === "bookings" && "hatch")}>
                    <span className="w-[5.2rem] shrink-0 text-[1.1rem] font-black text-ink-2">{e.allDay ? "All day" : formatTime(eventStart(e))}</span>
                    <span className="min-w-0 flex-1 truncate text-[1.3rem] font-extrabold">
                      {e.emoji ?? (e.calendar === "bookings" ? "🧹 " : "")}
                      {e.title}
                    </span>
                    <div className="flex -space-x-2">
                      {ms.map((m) => (
                        <Avatar key={m.id} member={m} size={2.2} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {list.length === 0 && <p className="text-[1.2rem] font-bold text-ink-3">Free day</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type Step = "what" | "custom" | "when" | "who" | "where" | "say" | "done";

/** Pictures for an event that isn't one of the tiles. */
const EVENT_EMOJI = ["📌", "🩺", "🦷", "✂️", "🚗", "✈️", "🎭", "🎬", "🎵", "🎨", "🏉", "🏀", "🎾", "🚴", "🥾", "⛺", "🎣", "🍽️", "☕", "🛒", "💼", "🐶", "⛪", "🎄", "💒", "🎓", "📚", "🔧"];

function KidEventFlow({ open, who, onOpenChange, defaultDay }: { open: boolean; who?: string; onOpenChange: (o: boolean) => void; defaultDay: Date }) {
  const members = useHub((s) => s.members);
  const addKidPlan = useHub((s) => s.addKidPlan);
  const grownUp = useParentUnlocked();
  const [step, setStep] = useState<Step>("what");
  const [what, setWhat] = useState<{ id: string; label: string; emoji: string } | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [customEmoji, setCustomEmoji] = useState("📌");
  const [date, setDate] = useState(dateKey(defaultDay));
  const [part, setPart] = useState<DayPart | null>(null);
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [people, setPeople] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState<KidPlan | null>(null);

  useEffect(() => {
    if (open) {
      setStep("what");
      setWhat(null);
      setCustomLabel("");
      setCustomEmoji("📌");
      setPart(null);
      setTime("");
      setEndTime("");
      setLocation("");
      setNotes("");
      setSaved(null);
      setDate(dateKey(defaultDay));
      setPeople(who ? [who] : []);
    }
  }, [open, who, defaultDay]);

  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  const inWeek = days.some((d) => dateKey(d) === date);
  const finish = (voiceMediaId?: string) => {
    if (!what) return;
    const hour = time ? Number(time.slice(0, 2)) : null;
    const dayPart: DayPart = part ?? (hour === null ? "morning" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening");
    const names = members.filter((m) => people.includes(m.id)).map((m) => m.name);
    const custom = what.id === "custom";
    const plan = {
      what: what.id,
      title: custom ? what.label : `${what.label}${names.length ? ` – ${names.join(" & ")}` : ""}`,
      emoji: what.emoji,
      date,
      part: dayPart,
      time: time || undefined,
      endTime: (time && endTime > time && endTime) || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      memberIds: people,
      voiceMediaId,
      createdBy: people[0] ?? "family",
    };
    addKidPlan(plan);
    const added = useHub.getState().kidPlans.at(-1) ?? null;
    setSaved(added);
    setStep("done");
    celebrate({ title: "It's on the calendar!", emoji: what.emoji });
  };

  const titles: Record<Step, string> = {
    what: "What is it?",
    custom: "What's it called?",
    when: "When is it?",
    who: "Who's going?",
    where: "Where is it?",
    say: "Want to say anything?",
    done: "Added! 🎉",
  };
  const back: Partial<Record<Step, Step>> = { custom: "what", when: what?.id === "custom" ? "custom" : "what", who: "when", where: "who", say: "where" };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={titles[step]} wide>
      {back[step] && (
        <button type="button" onClick={() => setStep(back[step]!)} className="tap mb-4 flex items-center gap-2 text-[1.3rem] font-extrabold text-ink-2">
          <ArrowLeft className="size-6" /> Back
        </button>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
          {step === "what" && (
            <div className="grid grid-cols-4 gap-4 max-md:grid-cols-3 max-md:gap-2.5">
              {KID_ACTIVITIES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    sfx.pop();
                    setWhat(a);
                    setStep("when");
                  }}
                  className="tap flex aspect-[1.1] flex-col items-center justify-center gap-2 rounded-[1.8rem] bg-sky-tint p-1 ring-1 ring-black/5 max-md:gap-1 max-md:rounded-[1.4rem]"
                >
                  <span className="text-[4.6rem] leading-none max-md:text-[3.4rem]">{a.emoji}</span>
                  <span className="text-center font-display text-[1.9rem] font-black leading-none max-md:text-[1.3rem]">{a.label}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  sfx.pop();
                  setStep("custom");
                }}
                className="tap flex aspect-[1.1] flex-col items-center justify-center gap-2 rounded-[1.8rem] border-2 border-dashed border-sky bg-white p-1 max-md:gap-1 max-md:rounded-[1.4rem]"
              >
                <span className="text-[4.6rem] leading-none max-md:text-[3.4rem]">✏️</span>
                <span className="text-center font-display text-[1.9rem] font-black leading-none max-md:text-[1.3rem]">Something else</span>
              </button>
            </div>
          )}
          {step === "custom" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-[5.6rem] shrink-0 place-items-center rounded-[1.6rem] bg-sky-tint text-[3.4rem]">{customEmoji}</span>
                <input
                  autoFocus
                  value={customLabel}
                  maxLength={60}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Dentist, Leo's guitar lesson"
                  className="h-[5rem] min-w-0 flex-1 rounded-[1.3rem] border-2 border-line bg-white px-4 text-[1.45rem] font-bold outline-none focus:border-sky"
                />
              </div>
              <p className="text-[1.05rem] font-black uppercase tracking-[0.08em] text-ink-3">Pick a picture</p>
              <div className="grid grid-cols-10 gap-2 max-md:grid-cols-7">
                {EVENT_EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    aria-pressed={customEmoji === e}
                    onClick={() => (sfx.tap(), setCustomEmoji(e))}
                    className={cn("tap grid aspect-square place-items-center rounded-[1.1rem] text-[2rem]", customEmoji === e ? "bg-sky-tint ring-[0.2rem] ring-sky" : "bg-white ring-1 ring-black/5")}
                  >
                    {e}
                  </button>
                ))}
              </div>
              <BigButton
                tone="sky"
                disabled={!customLabel.trim()}
                onClick={() => {
                  setWhat({ id: "custom", label: customLabel.trim(), emoji: customEmoji });
                  setStep("when");
                }}
              >
                Next
              </BigButton>
            </div>
          )}
          {step === "when" && (
            <div className="flex flex-col gap-5 max-md:gap-4">
              <div className="grid grid-cols-7 gap-2.5 max-md:gap-1">
                {days.map((d) => (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => (sfx.tap(), setDate(dateKey(d)))}
                    className={cn("tap flex flex-col items-center rounded-[1.4rem] py-3 ring-1 ring-black/5 max-md:rounded-[1rem] max-md:py-2", date === dateKey(d) ? "bg-sky text-white" : "bg-white")}
                  >
                    <span className="text-[1.15rem] font-black max-md:text-[0.95rem]">{relativeDayLabel(d) === "Today" ? "Today" : relativeDayLabel(d) === "Tomorrow" ? "Tmrw" : formatDayShort(d)}</span>
                    <span className="font-display text-[2.6rem] font-black leading-none max-md:text-[1.9rem]">{d.getDate()}</span>
                  </button>
                ))}
              </div>
              <label className={cn("flex items-center gap-3 rounded-[1.4rem] px-4 py-2 ring-1 ring-black/5", inWeek ? "bg-white" : "bg-sky text-white")}>
                <span className="text-[1.25rem] font-black">📅 Another date</span>
                <input
                  type="date"
                  value={date}
                  min={dateKey(new Date())}
                  onChange={(e) => e.target.value && setDate(e.target.value)}
                  className="h-[3.8rem] min-w-0 flex-1 rounded-[1rem] bg-white px-3 text-[1.3rem] font-bold text-ink outline-none"
                />
              </label>
              <div className="grid grid-cols-3 gap-4 max-md:gap-2.5">
                {(Object.keys(DAY_PART_TIMES) as DayPart[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      sfx.pop();
                      setPart(p);
                      setTime("");
                      setEndTime("");
                      setStep("who");
                    }}
                    className={cn("tap flex h-[10rem] flex-col items-center justify-center gap-1 rounded-[1.8rem] ring-1 ring-black/5 max-md:h-[7.6rem] max-md:rounded-[1.4rem]", part === p && !time ? "bg-sun" : "bg-sun-tint")}
                  >
                    <span className="text-[3.6rem] leading-none max-md:text-[2.8rem]">{DAY_PART_TIMES[p].emoji}</span>
                    <span className="font-display text-[2rem] font-black max-md:text-[1.4rem]">{DAY_PART_TIMES[p].label}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3 rounded-[1.6rem] bg-white p-3 ring-1 ring-black/5">
                <span className="text-[1.25rem] font-black">⏰ Or a set time</span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input type="time" value={time} onChange={(e) => (setTime(e.target.value), setPart(null))} aria-label="Starts" className="h-[4rem] min-w-0 flex-1 rounded-[1rem] border-2 border-line bg-white px-2 text-[1.3rem] font-bold outline-none focus:border-sky" />
                  <span className="font-black text-ink-3">to</span>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} aria-label="Ends" className="h-[4rem] min-w-0 flex-1 rounded-[1rem] border-2 border-line bg-white px-2 text-[1.3rem] font-bold outline-none focus:border-sky" />
                </div>
                <BigButton tone="sky" size="md" disabled={!time} onClick={() => setStep("who")}>
                  Next
                </BigButton>
              </div>
            </div>
          )}
          {step === "who" && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-4 gap-4 max-md:gap-2">
                {members.map((m) => {
                  const on = people.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        sfx.pop();
                        setPeople((p) => (on ? p.filter((x) => x !== m.id) : [...p, m.id]));
                      }}
                      className={cn("tap flex flex-col items-center gap-2 rounded-[1.8rem] bg-white py-4 ring-1 ring-black/5 max-md:rounded-[1.4rem] max-md:py-2.5", on && "ring-[0.35rem] ring-sky")}
                    >
                      <Avatar member={m} size={6} />
                      <span className="font-display text-[1.9rem] font-black max-md:text-[1.3rem]">{m.name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <BigButton tone="sky" disabled={!people.length} onClick={() => setStep("where")}>
                  Next
                </BigButton>
              </div>
            </div>
          )}
          {step === "where" && (
            <div className="flex flex-col gap-4">
              <input
                autoFocus
                value={location}
                maxLength={120}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="📍 Place or address (optional)"
                className="h-[5rem] rounded-[1.3rem] border-2 border-line bg-white px-4 text-[1.45rem] font-bold outline-none focus:border-sky"
              />
              <textarea
                value={notes}
                maxLength={300}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="📝 Anything to bring or remember? (optional)"
                className="h-[8rem] resize-none rounded-[1.3rem] border-2 border-line bg-white p-4 text-[1.35rem] font-bold outline-none focus:border-sky"
              />
              <div className="flex justify-end">
                {/* Grown-ups go straight to saving; kids can leave a voice message for Mum and Dad. */}
                <BigButton tone="sky" onClick={() => (grownUp ? finish() : setStep("say"))}>
                  {grownUp ? "Add it ✓" : location.trim() || notes.trim() ? "Next" : "Skip"}
                </BigButton>
              </div>
            </div>
          )}
          {step === "say" && (
            <div className="flex flex-col items-center gap-4">
              <p className="flex items-center gap-2 text-center text-[1.4rem] font-bold text-ink-2">
                <Mic className="size-6 shrink-0" /> Tell Mum and Dad about it (you can skip this)
              </p>
              <VoiceRecorder color="var(--sky)" onSaved={(id) => finish(id)} />
              <BigButton tone="white" onClick={() => finish()}>
                Skip, just add it ✓
              </BigButton>
            </div>
          )}
          {step === "done" && saved && (
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="text-[5rem] leading-none">{saved.emoji}</span>
              <p className="font-display text-[2.2rem] font-black leading-tight">{saved.title}</p>
              <p className="text-[1.3rem] font-bold text-ink-2">
                {relativeDayLabel(fromDateKey(saved.date))} · {saved.time ? `${saved.time}${saved.endTime ? `–${saved.endTime}` : ""}` : DAY_PART_TIMES[saved.part].label}
                {saved.location && ` · 📍 ${saved.location}`}
              </p>
              {grownUp ? (
                <>
                  <a
                    href={googleTemplateUrl(saved)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      useHub.getState().markPlanAdded(saved.id);
                      onOpenChange(false);
                    }}
                    className="tap flex min-h-[5.4rem] w-full items-center justify-center gap-3 rounded-[1.6rem] bg-sky px-6 text-[1.5rem] font-black text-white shadow-[var(--shadow-soft)]"
                  >
                    <CalendarCheck2 className="size-7" /> Add to Google Calendar
                  </a>
                  <p className="text-[1.1rem] font-bold text-ink-3">Opens Google with the time, place and notes filled in. Tap Save there.</p>
                </>
              ) : (
                <p className="text-[1.3rem] font-bold text-ink-2">It's on the hub now. Mum or Dad will pop it in Google Calendar.</p>
              )}
              <BigButton tone="white" onClick={() => onOpenChange(false)}>
                Done
              </BigButton>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </Sheet>
  );
}

interface SnapEvent {
  title: string;
  date: string;
  start: string | null;
  end: string | null;
  location: string | null;
  notes: string | null;
}

function blobToBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(b);
  });
}

/** Photograph a school newsletter or invite; Claude reads the dates off it. */
function SnapSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const members = useHub((s) => s.members);
  const addKidPlan = useHub((s) => s.addKidPlan);
  const [state, setState] = useState<"idle" | "reading" | "results">("idle");
  const [preview, setPreview] = useState<string>();
  const [found, setFound] = useState<(SnapEvent & { keep: boolean; who: string[] })[]>([]);

  useEffect(() => {
    if (!open) {
      setState("idle");
      setFound([]);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const read = async (file: File) => {
    setState("reading");
    const small = await resizeImage(file, 1600);
    setPreview(URL.createObjectURL(small));
    try {
      const res = await hubFetch<{ events: SnapEvent[] }>("/api/snap", {
        method: "POST",
        body: JSON.stringify({ image: await blobToBase64(small), mediaType: "image/jpeg", today: dateKey() }),
      });
      setFound(res.events.map((e) => ({ ...e, keep: true, who: [] })));
      setState("results");
      if (!res.events.length) toast("No dates found on that one. Try a closer photo.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read that photo");
      setState("idle");
    }
  };

  const save = () => {
    const keep = found.filter((f) => f.keep);
    for (const f of keep) {
      const hour = f.start ? Number(f.start.slice(0, 2)) : 9;
      addKidPlan({
        what: "snap",
        title: f.title,
        emoji: "📌",
        date: f.date,
        part: hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening",
        time: f.start ?? undefined,
        endTime: f.end ?? undefined,
        location: f.location ?? undefined,
        memberIds: f.who,
        createdBy: "snap",
      });
    }
    onOpenChange(false);
    celebrate({ title: `${keep.length} added!`, subtitle: "Send them to Google from Parent → Approvals", emoji: "📌" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Snap a notice 📸" wide>
      {state === "idle" && (
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <p className="max-w-[40rem] text-[1.45rem] font-bold text-ink-2">
            Take a photo of a school newsletter, party invite or sports draw. Home Hub reads the dates and adds them for you.
          </p>
          <div className="flex w-full max-w-[44rem] flex-col gap-3">
            <label className="tap flex min-h-[5.6rem] cursor-pointer items-center justify-center gap-3 rounded-[1.8rem] bg-coral px-6 text-[1.7rem] font-black text-white shadow-[var(--shadow-glow)]">
              <Camera className="size-8" /> Take a photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && void read(e.target.files[0])} />
            </label>
            {/* No capture attribute, so phones offer the photo library and files (screenshots, emailed notices). */}
            <label className="tap flex min-h-[5.6rem] cursor-pointer items-center justify-center gap-3 rounded-[1.8rem] bg-white px-6 text-[1.7rem] font-black text-ink shadow-[var(--shadow-soft)] ring-1 ring-black/5">
              <ImageIcon className="size-8 text-coral" /> Choose from photos
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && void read(e.target.files[0])} />
            </label>
          </div>
        </div>
      )}
      {state === "reading" && (
        <div className="flex flex-col items-center gap-4 py-6">
          {preview && <img src={preview} alt="" className="max-h-[20rem] rounded-[1.4rem] shadow-lg" />}
          <motion.p className="font-display text-[2.4rem] font-black" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}>
            Reading the dates…
          </motion.p>
        </div>
      )}
      {state === "results" && (
        <div className="flex flex-col gap-3">
          {found.map((f, i) => (
            <div key={i} className={cn("flex flex-col gap-2 rounded-[1.6rem] bg-white p-4 ring-1 ring-black/5", !f.keep && "opacity-45")}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={f.keep ? "Skip this one" : "Keep this one"}
                  onClick={() => setFound((all) => all.map((x, j) => (j === i ? { ...x, keep: !x.keep } : x)))}
                  className={cn("grid size-[3.2rem] shrink-0 place-items-center rounded-full border-[0.22rem]", f.keep ? "border-sage bg-sage text-white" : "border-ink/25")}
                >
                  {f.keep && <Check className="size-6" strokeWidth={4} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[1.5rem] font-extrabold">{f.title}</p>
                  <p className="text-[1.15rem] font-bold text-ink-2">
                    {relativeDayLabel(new Date(`${f.date}T12:00:00`))} · {f.date.split("-").reverse().join("/")}
                    {f.start && ` · ${f.start}${f.end ? `–${f.end}` : ""}`}
                    {f.location && ` · ${f.location}`}
                  </p>
                  {f.notes && <p className="text-[1.1rem] font-bold text-coral-ink">📝 {f.notes}</p>}
                </div>
              </div>
              <div className="flex gap-2 pl-[4.2rem]">
                {members.map((m) => {
                  const on = f.who.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setFound((all) => all.map((x, j) => (j === i ? { ...x, who: on ? x.who.filter((w) => w !== m.id) : [...x.who, m.id] } : x)))}
                      className={cn("rounded-full p-0.5", on && "ring-[0.22rem] ring-sky")}
                      aria-label={m.name}
                    >
                      <Avatar member={m} size={2.6} dim={!on} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="mt-2 flex justify-end gap-3">
            <BigButton tone="white" size="md" onClick={() => setState("idle")}>
              Another photo
            </BigButton>
            <BigButton tone="sky" size="md" disabled={!found.some((f) => f.keep)} onClick={save}>
              Add {found.filter((f) => f.keep).length} to the calendar
            </BigButton>
          </div>
        </div>
      )}
    </Sheet>
  );
}
