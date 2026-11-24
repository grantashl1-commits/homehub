import { useShallow } from "zustand/react/shallow";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, Hourglass, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useHub, unreadNotesFor } from "@/lib/store";
import { useChoresFor, useFamilyJar, useMarbles, useMember, type ChoreView } from "@/lib/hooks";
import { pal } from "@/lib/pals";
import { sfx } from "@/lib/device";
import { greeting } from "@/lib/time";
import { countdowns, praise, sleepsLabel } from "@/lib/nz";
import type { Member } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { celebrate } from "@/components/Celebrate";
import { MarbleJar } from "@/components/MarbleJar";
import { BigButton, ChoreIcon, EmptyState, ReadAloud, Sheet } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useIsPhone } from "@/lib/useIsPhone";
import { pointpalsAward, usePointPals } from "@/lib/integrations/pointpals";
import { useParentUnlocked } from "@/components/PinPad";
import { HabitTracker } from "@/components/HabitTracker";

export function MePicker() {
  const members = useHub((s) => s.members);
  const ordered = [...members.filter((m) => m.role === "child"), ...members.filter((m) => m.role === "parent")];
  const jar = useFamilyJar();
  const phone = useIsPhone();
  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-end justify-between gap-3 max-md:mb-3 max-md:items-center">
        <h1 className="font-display text-[3.6rem] font-black leading-none">Who's this? 👋</h1>
        <div className="flex items-center gap-4 rounded-[1.6rem] bg-white px-5 py-3 shadow-[var(--shadow-soft)] max-md:gap-2 max-md:px-3 max-md:py-2">
          <MarbleJar count={jar.count} target={jar.target} size={phone ? 3.4 : 5} />
          <div>
            <p className="font-display text-[2rem] font-black leading-none">
              {jar.count}/{jar.target}
            </p>
            <p className="text-[1.15rem] font-bold text-ink-2">to {jar.reward}</p>
          </div>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-4 gap-[1.3rem] max-md:grid-cols-2 max-md:gap-3">
        {ordered.map((m, i) => (
          <PersonCard key={m.id} member={m} index={i} />
        ))}
      </div>
    </div>
  );
}

function PersonCard({ member, index }: { member: Member; index: number }) {
  const phone = useIsPhone();
  const p = pal(member.palId);
  const marbles = useMarbles(member);
  const notes = useHub((s) => s.notes);
  const { chores } = useChoresFor(member.role === "child" ? member : undefined);
  const todo = chores.filter((c) => c.state === "todo").length;
  const unread = unreadNotesFor(notes, member.id).length;
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
      <Link
        to={`/me/${member.id}`}
        onClick={() => sfx.pop()}
        className="tap relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[2.2rem] p-5 text-center shadow-[var(--shadow-soft)] max-md:gap-2 max-md:p-3"
        style={{ background: `linear-gradient(170deg, ${p.tint} 0%, #fff 70%)` }}
      >
        <div className="absolute inset-x-0 top-0 h-[55%] opacity-60" style={{ background: `radial-gradient(70% 90% at 50% 0%, ${p.color} 0%, transparent 70%)` }} />
        <Avatar member={member} size={phone ? 6.4 : 9.5} float />
        <p className="relative font-display text-[3rem] font-black leading-none max-md:text-[2.1rem]" style={{ color: p.ink }}>
          {member.name}
        </p>
        <div className="relative flex flex-wrap justify-center gap-2">
          {member.role === "child" && (
            <span className="rounded-full bg-white px-3.5 py-1 text-[1.2rem] font-black shadow-sm">🔮 {marbles}</span>
          )}
          {todo > 0 && <span className="rounded-full bg-white px-3.5 py-1 text-[1.2rem] font-black shadow-sm">⭐ {todo} jobs</span>}
          {unread > 0 && <span className="rounded-full bg-coral px-3.5 py-1 text-[1.2rem] font-black text-white shadow-sm">✉️ {unread}</span>}
        </div>
      </Link>
    </motion.div>
  );
}

export function KidZone() {
  const { id } = useParams();
  const member = useMember(id);
  const navigate = useNavigate();
  const ppSignedIn = usePointPals((s) => !!s.userId);
  if (!member) return <EmptyState emoji="🤔" title="Who's that?" action={<BigButton onClick={() => navigate("/me")}>Pick someone</BigButton>} />;
  // Kids, and anyone PointPals counts as an earner (Mum and Dad can earn too).
  const isKid = member.role === "child" || !!(ppSignedIn && member.pointpalsKidId);

  return (
    <div className="grid h-full grid-cols-[minmax(0,0.85fr)_minmax(0,2fr)] gap-[1.3rem] max-md:flex max-md:h-auto max-md:flex-col max-md:gap-3">
      <ProfileCard member={member} />
      {/* Short landscape screens (an 11" tablet in Chrome) scroll this side rather than squash the jobs. */}
      <div className="flex min-h-0 flex-col gap-[1.3rem] no-scrollbar max-md:gap-3 md:overflow-y-auto">
        <HabitTracker member={member} />
        <div className="card flex min-h-0 flex-1 flex-col p-6 max-md:flex-none max-md:p-3.5 md:min-h-[19rem] md:p-5">
          {isKid ? <Jobs member={member} /> : <MyNotes member={member} />}
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ member }: { member: Member }) {
  const phone = useIsPhone();
  const p = pal(member.palId);
  const marbles = useMarbles(member);
  const members = useHub((s) => s.members);
  const bday = countdowns(members, new Date(), false).find((c) => c.memberId === member.id);
  const hello = `${greeting()}, ${member.name}! ${p.quote}`;

  return (
    <section
      className="relative flex flex-col items-center overflow-hidden rounded-[2.2rem] p-6 text-center shadow-[var(--shadow-lift)] max-md:rounded-[1.8rem] max-md:p-3.5"
      style={{ background: `linear-gradient(170deg, ${p.color} 0%, ${p.tint} 55%, #fff 100%)` }}
    >
      {/* Phones: a row with the photo beside the hello, so the jobs sit higher up. */}
      <div className="flex flex-col items-center max-md:w-full max-md:flex-row max-md:gap-3 max-md:text-left">
        <div className="relative mt-1 max-md:mt-0 max-md:shrink-0">
          <Avatar member={member} size={phone ? 6.4 : 10} float={!phone} />
        </div>
        <h1 className="mt-2 font-display text-[3.4rem] font-black leading-none max-md:mt-0 max-md:min-w-0 max-md:flex-1" style={{ color: p.ink }}>
          Hi {member.name}!
        </h1>
      </div>
      {bday && bday.sleeps <= 60 && (
        <p className="mt-2 rounded-full bg-white/85 px-4 py-1 text-[1.2rem] font-black text-ink">
          🎂 {bday.sleeps === 0 ? "Happy birthday!" : `${sleepsLabel(bday.sleeps)} till your birthday!`}
        </p>
      )}
      <div className="relative mt-3 flex w-full items-center gap-2 rounded-[1.4rem] bg-white/85 p-3 text-left text-[1.25rem] font-bold text-ink-2 shadow-sm max-md:mt-2.5 max-md:py-2">
        <span className="min-w-0 flex-1">“{p.quote}”</span>
        <ReadAloud text={hello} size={3.2} />
      </div>

      {(member.role === "child" || !!member.pointpalsKidId) && (
        <div className="mt-4 w-full rounded-[1.4rem] bg-white/85 p-4 text-left max-md:mt-2.5 max-md:p-3">
          <p className="text-[1.1rem] font-black uppercase tracking-[0.08em] text-ink-3">My marbles</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-display text-[3rem] font-black leading-none">{marbles}</span>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: Math.min(marbles, 12) }).map((_, i) => (
                <span key={i} className="size-[1.2rem] rounded-full shadow-inner" style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${p.color} 55%, ${p.shade})` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      <MyReflections member={member} />

    </section>
  );
}

const NO_REFLECTIONS: import("@/lib/types").FamilyReflection[] = [];

/** What this person shared at dinnertime, from the recorded chats. */
function MyReflections({ member }: { member: Member }) {
  const [open, setOpen] = useState(false);
  const mine = useHub(useShallow((s) => (s.reflections ?? NO_REFLECTIONS).filter((r) => r.people[member.id])));
  const p = pal(member.palId);
  if (!mine.length) return <div className="mt-auto" />;
  return (
    <>
      <button
        type="button"
        onClick={() => {
          sfx.tap();
          setOpen(true);
        }}
        className="tap mt-auto flex w-full items-center gap-3 rounded-[1.4rem] bg-white/85 p-3 text-left shadow-sm"
      >
        <span className="text-[2.6rem] leading-none">🍽️</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[1.05rem] font-black uppercase tracking-[0.08em] text-ink-3">My reflections</span>
          <span className="block truncate text-[1.25rem] font-extrabold">{mine[0].people[member.id]}</span>
        </span>
        <span className="rounded-full px-2.5 py-0.5 text-[1.05rem] font-black text-white" style={{ background: p.shade }}>
          {mine.length}
        </span>
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={`${member.name}'s reflections`}>
        <ul className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
          {mine.map((r) => (
            <li key={r.id} className="rounded-[1.4rem] p-4" style={{ background: p.tint }}>
              <div className="flex items-start gap-3">
                <p className="min-w-0 flex-1 text-[1.1rem] font-black uppercase tracking-[0.08em] text-ink-3">
                  {new Date(r.at).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <ReadAloud text={r.people[member.id]} size={3} />
              </div>
              <p className="mt-1 text-[1.35rem] font-bold leading-snug text-ink">{r.people[member.id]}</p>
              {r.summary && <p className="mt-2 text-[1.15rem] font-semibold leading-snug text-ink-2">Family: {r.summary}</p>}
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}

function Jobs({ member }: { member: Member }) {
  const { chores, source } = useChoresFor(member);
  const addClaim = useHub((s) => s.addClaim);
  const todo = chores.filter((c) => c.state !== "done").length;

  const parent = useParentUnlocked();
  const claim = async (c: ChoreView) => {
    // A 0-point chore is recognition only (PointPals calls it a habit): no
    // marble, so no grown-up approval needed. It's logged as done straight away.
    if (c.points === 0) {
      try {
        if (source === "pointpals" && member.pointpalsKidId) {
          await pointpalsAward(member.pointpalsKidId, { name: c.name, icon: c.icon, points: 0 });
        } else {
          addClaim({ memberId: member.id, choreId: c.id, choreName: c.name, choreIcon: c.icon, points: 0, source });
          const made = useHub.getState().claims.at(-1);
          if (made) useHub.getState().resolveClaim(made.id, "approved");
        }
        sfx.success();
        const teReo = useHub.getState().settings.teReo;
        celebrate({ title: teReo ? `${praise()} You did it!` : "You did it! 🌟", subtitle: c.name, palId: member.palId, photo: member.photo });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "PointPals didn't accept that");
      }
      return;
    }
    // A grown-up with the parent area unlocked gives the points straight away,
    // in PointPals itself when it's connected. Otherwise it waits for approval.
    if (parent) {
      try {
        if (source === "pointpals" && member.pointpalsKidId) {
          await pointpalsAward(member.pointpalsKidId, { name: c.name, icon: c.icon, points: c.points });
        } else {
          useHub.getState().addLocalMarbles(member.id, c.points);
        }
        sfx.marble();
        celebrate({ title: `+${c.points} for ${member.name}!`, subtitle: c.name, palId: member.palId, photo: member.photo });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "PointPals didn't accept that");
      }
      return;
    }
    sfx.marble();
    addClaim({
      memberId: member.id,
      choreId: c.id,
      choreName: c.name,
      choreIcon: c.icon,
      points: c.points,
      source,
    });
    const teReo = useHub.getState().settings.teReo;
    celebrate({ title: teReo ? `${praise()} You did it!` : "You did it!", subtitle: "Mum or Dad will pop your marble in the jar", palId: member.palId, photo: member.photo });
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-2 max-md:mb-3">
        <h2 className="font-display text-[2.6rem] font-black leading-none max-md:text-[2rem]">My jobs today</h2>
        <span className="shrink-0 whitespace-nowrap rounded-full bg-sun-tint px-4 py-1 text-[1.25rem] font-black text-[#7a5a0c] max-md:px-3 max-md:text-[1.1rem]">
          {todo ? `${todo} to go` : "All done! 🌟"}
        </span>
      </div>
      {chores.length === 0 ? (
        <EmptyState emoji="🌈" title="No jobs today" body="Ask a grown-up to add some in PointPals." />
      ) : (
        <div
          className={cn(
            "grid min-h-0 flex-1 overflow-y-auto pb-1 no-scrollbar [mask-image:linear-gradient(to_bottom,black_94%,transparent)]",
            chores.length > 9
              ? "gap-3 auto-rows-[minmax(9.5rem,auto)] grid-cols-[repeat(auto-fill,minmax(10rem,1fr))]"
              : "gap-4 auto-rows-[minmax(12.5rem,auto)] grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))]",
            "max-md:grid-cols-2 max-md:gap-2.5 max-md:overflow-visible",
          )}
        >
          {chores.map((c) => (
            <JobCard key={c.id} chore={c} member={member} onDone={() => claim(c)} dense={chores.length > 9} />
          ))}
        </div>
      )}
    </>
  );
}

function JobCard({ chore, member, onDone, dense }: { chore: ChoreView; member: Member; onDone: () => void; dense?: boolean }) {
  const giving = useParentUnlocked();
  const phone = useIsPhone();
  const p = pal(member.palId);
  return (
    <motion.div
      layout
      className={cn(
        dense ? "relative flex min-h-[9.5rem] flex-col items-center justify-between gap-1 rounded-[1.5rem] p-3 text-center ring-1 ring-black/5 max-md:min-h-0 max-md:rounded-[1.5rem] max-md:p-3" : "relative flex min-h-[12.5rem] flex-col items-center justify-between gap-2 rounded-[1.8rem] p-4 text-center ring-1 ring-black/5 max-md:min-h-0 max-md:rounded-[1.5rem] max-md:p-3",
        chore.state === "done" && "bg-sage-tint",
        chore.state === "pending" && "bg-lilac-tint",
      )}
      style={chore.state === "todo" ? { background: p.tint } : undefined}
    >
      {chore.points > 0 && <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-0.5 text-[1.1rem] font-black shadow-sm">+{chore.points}</span>}
      <ChoreIcon icon={chore.icon} size={phone ? 4.4 : dense ? 3.6 : 5.4} />
      <p className={dense ? "text-[1.15rem] font-extrabold leading-tight max-md:text-[1.3rem]" : "text-[1.35rem] font-extrabold leading-tight max-md:text-[1.3rem]"}>{chore.name}</p>
      <AnimatePresence mode="wait" initial={false}>
        {chore.state === "todo" && (
          <motion.button
            key="todo"
            type="button"
            onClick={onDone}
            className={cn("tap flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-[1.2rem] bg-sage px-2 font-black text-white shadow-[0_8px_20px_-10px_rgb(111_183_132/0.9)] max-md:gap-1 max-md:text-[1.2rem]", dense ? "min-h-[3rem] text-[1.15rem]" : "min-h-[3.8rem] text-[1.35rem]")}
            exit={{ rotateX: 90, opacity: 0 }}
          >
            <Sparkles className="size-6 shrink-0 max-md:size-5" /> {giving && chore.points > 0 ? `Give +${chore.points}` : "I did it!"}
          </motion.button>
        )}
        {chore.state === "pending" && (
          <motion.div
            key="pending"
            className="flex min-h-[3.8rem] w-full items-center justify-center gap-2 rounded-[1.2rem] bg-white/80 px-1 text-[1.15rem] font-black leading-tight text-lilac-ink max-md:text-[1rem]"
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
          >
            <Hourglass className="size-5" /> Waiting for a grown-up
          </motion.div>
        )}
        {chore.state === "done" && (
          <motion.div
            key="done"
            className="flex min-h-[3.8rem] w-full items-center justify-center gap-2 rounded-[1.2rem] bg-white/80 text-[1.3rem] font-black text-sage-ink"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Check className="size-6" strokeWidth={3.5} /> Done!
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MyNotes({ member }: { member: Member }) {
  const notes = useHub(useShallow((s) => s.notes.filter((n) => !n.doneAt && (n.to === member.id || n.to === "everyone"))));
  const claims = useHub(useShallow((s) => s.claims.filter((c) => c.status === "pending")));
  return (
    <>
      <h2 className="mb-4 font-display text-[2.6rem] font-black leading-none max-md:mb-3 max-md:text-[2rem]">For {member.name}</h2>
      <div className="grid grid-cols-2 gap-4 max-md:gap-2.5">
        <Link to="/notes" className="tap rounded-[1.6rem] bg-lilac-tint p-5">
          <p className="text-[3rem] leading-none">💌</p>
          <p className="mt-2 font-display text-[2.4rem] font-black leading-none">{notes.length} notes</p>
          <p className="text-[1.2rem] font-bold text-ink-2">on the fridge for you</p>
        </Link>
        <Link to="/parent" className="tap rounded-[1.6rem] bg-sun-tint p-5">
          <p className="text-[3rem] leading-none">⭐</p>
          <p className="mt-2 font-display text-[2.4rem] font-black leading-none">{claims.length} jobs</p>
          <p className="text-[1.2rem] font-bold text-ink-2">waiting for approval</p>
        </Link>
      </div>
    </>
  );
}
