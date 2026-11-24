import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, Mic, Pencil, Plus } from "lucide-react";
import { useHub } from "@/lib/store";
import { NOTE_COLORS, REACTIONS, STICKERS, noteColor } from "@/lib/catalog";
import { speak, sfx } from "@/lib/device";
import { dateKey, timeAgo } from "@/lib/time";
import { completeGoogleTask, dueLabel, useGoogleTasks, type GoogleTask } from "@/lib/integrations/google-tasks";
import { TaskCard } from "@/components/TaskCard";
import { toast } from "sonner";
import type { Member, NoteColor, NoteKind, PostIt } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { AudioPlayer, VoiceRecorder } from "@/components/Voice";
import { DoodleImage, DoodlePad } from "@/components/Doodle";
import { BigButton, EmptyState, ReadAloud, Sheet } from "@/components/ui";
import { celebrate } from "@/components/Celebrate";
import { cn } from "@/lib/utils";

export default function Notes() {
  const [params, setParams] = useSearchParams();
  const notes = useHub((s) => s.notes);
  const members = useHub((s) => s.members);
  const [filter, setFilter] = useState<string>("all");
  const [open, setOpen] = useState<PostIt | null>(null);
  const { tasks } = useGoogleTasks();
  const [openTask, setOpenTask] = useState<GoogleTask | null>(null);
  const [composing, setComposing] = useState(params.get("add") === "1");
  const [fromPreset] = useState(params.get("from") ?? undefined);

  useEffect(() => {
    if (params.get("add")) setParams({}, { replace: true });
  }, [params, setParams]);

  const visible = useMemo(
    () =>
      notes
        .filter((n) => !n.doneAt)
        .filter((n) => filter === "all" || n.to === filter || n.to === "everyone"),
    [notes, filter],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-6 max-md:mb-3 max-md:flex-col max-md:items-stretch max-md:gap-2">
        <h1 className="font-display text-[3.4rem] font-black leading-none">Fridge notes</h1>
        <div className="flex items-center gap-2 rounded-full bg-white/80 p-1.5 ring-1 ring-black/5 max-md:self-start max-md:overflow-x-auto no-scrollbar max-md:max-w-full">
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
            Everyone
          </FilterPill>
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-label={`Notes for ${m.name}`}
              onClick={() => {
                sfx.tap();
                setFilter(m.id);
              }}
              className={cn("tap rounded-full p-0.5", filter === m.id && "ring-[0.25rem] ring-ink")}
            >
              <Avatar member={m} size={3.2} />
            </button>
          ))}
        </div>
      </div>

      <div className="fridge relative min-h-0 flex-1 overflow-hidden rounded-[2.2rem] shadow-[inset_0_2px_10px_rgb(0_0_0/0.06)] ring-1 ring-black/5 max-md:min-h-[60vh] max-md:overflow-visible">
        <div className="absolute right-6 top-1/2 h-[40%] w-[1.1rem] -translate-y-1/2 rounded-full bg-gradient-to-b from-white to-[#ddd6cb] shadow-[0_2px_6px_rgb(0_0_0/0.15)] max-md:hidden" />
        <div className="h-full overflow-y-auto p-7 pr-14 no-scrollbar max-md:p-4 max-md:pb-24">
          {visible.length === 0 && tasks.length === 0 ? (
            <EmptyState emoji="🧲" title="The fridge is empty!" body="Leave a note for someone you love." />
          ) : (
            <div className="grid grid-cols-4 gap-6 max-md:grid-cols-2 max-md:gap-4">
              <AnimatePresence>
                {filter === "all" && tasks.map((t) => <TaskCard key={`gt-${t.id}`} task={t} onOpen={() => setOpenTask(t)} />)}
                {visible.map((n) => (
                  <NoteCard key={n.id} note={n} members={members} onOpen={() => setOpen(n)} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
        <motion.button
          type="button"
          onClick={() => {
            sfx.pop();
            setComposing(true);
          }}
          className="tap absolute bottom-6 right-8 flex h-[5.6rem] items-center gap-3 rounded-full bg-coral px-8 text-[1.7rem] font-black text-white shadow-[var(--shadow-glow)] max-md:fixed max-md:bottom-[calc(6.4rem+env(safe-area-inset-bottom))] max-md:right-4 max-md:z-20 max-md:h-[4.8rem] max-md:px-5 max-md:text-[1.35rem]"
          whileHover={{ scale: 1.04 }}
        >
          <Plus className="size-9 max-md:size-7" strokeWidth={3} /> <span className="max-md:hidden">Leave a note</span>
          <span className="md:hidden">Note</span>
        </motion.button>
      </div>

      <NoteViewer note={open} onClose={() => setOpen(null)} />
      <TaskViewer task={openTask} onClose={() => setOpenTask(null)} />
      <Composer open={composing} onOpenChange={setComposing} fromPreset={fromPreset} />
    </div>
  );
}

function TaskViewer({ task, onClose }: { task: GoogleTask | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  if (!task) return null;
  const due = dueLabel(task.due, dateKey());
  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()} title="To do">
      <div className="flex flex-col items-center gap-5">
        <div className="w-full max-w-[36rem] rounded-[0.8rem] bg-white p-7 pt-8 shadow-xl ring-1 ring-black/5">
          <div className="flex items-start gap-3">
            <p className="flex-1 font-display text-[3rem] font-black leading-[1.05]">{task.title}</p>
            <ReadAloud text={`${task.title}. ${due ?? ""}. ${task.notes ?? ""}`} />
          </div>
          {due && <p className="mt-2 text-[1.4rem] font-black text-sky-ink">📅 {due}</p>}
          {task.notes && <p className="mt-3 whitespace-pre-line text-[1.5rem] font-bold leading-snug text-ink-2">{task.notes}</p>}
          <p className="mt-4 text-[1.05rem] font-bold text-ink-3">From Google Tasks · {task.list}</p>
        </div>
        <BigButton
          tone="sage"
          size="md"
          disabled={busy}
          icon={<Check className="size-7" strokeWidth={3} />}
          onClick={async () => {
            setBusy(true);
            try {
              await completeGoogleTask(task);
              sfx.soft();
              celebrate({ title: "Done!", subtitle: task.title, emoji: "✅" });
              onClose();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Google didn't take that");
            } finally {
              setBusy(false);
            }
          }}
        >
          Done, peel it off
        </BigButton>
        <p className="text-[1.1rem] font-bold text-ink-3">This ticks it off in Google Tasks too.</p>
      </div>
    </Sheet>
  );
}

function FilterPill({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        sfx.tap();
        onClick();
      }}
      className={cn("tap h-[3.2rem] rounded-full px-5 text-[1.25rem] font-black", active ? "bg-ink text-white" : "text-ink-2")}
    >
      {children}
    </button>
  );
}

function NoteCard({ note, members, onOpen }: { note: PostIt; members: Member[]; onOpen: () => void }) {
  const c = noteColor(note.color);
  const from = members.find((m) => m.id === note.from);
  const to = note.to === "everyone" ? undefined : members.find((m) => m.id === note.to);
  const reactionCount = Object.values(note.reactions).reduce((n, w) => n + w.length, 0);
  const unread = note.seenBy.length <= 1;
  return (
    <motion.button
      type="button"
      layout
      onClick={() => {
        sfx.pop();
        onOpen();
      }}
      initial={{ opacity: 0, scale: 0.6, rotate: note.rotation * 4, y: -60 }}
      animate={{ opacity: 1, scale: 1, rotate: note.rotation, y: 0 }}
      exit={{ opacity: 0, rotate: note.rotation + 25, y: 120, x: 80, transition: { duration: 0.45 } }}
      whileTap={{ scale: 0.96, rotate: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative flex aspect-square flex-col rounded-[0.5rem] p-5 pt-9 text-left shadow-[0_14px_24px_-14px_rgb(0_0_0/0.45),0_2px_0_rgb(0_0_0/0.04)]"
      style={{ background: `linear-gradient(170deg, ${c.bg} 0%, ${c.bg} 80%, ${c.edge} 100%)`, color: c.ink }}
    >
      <span
        className="absolute -top-3 left-1/2 size-[2.2rem] -translate-x-1/2 rounded-full shadow-[0_3px_5px_rgb(0_0_0/0.25)]"
        style={{ background: `radial-gradient(circle at 35% 30%, #fff 0 12%, ${c.edge} 13%, ${c.ink} 160%)` }}
      />
      {note.sticker && <span className="absolute right-3 top-2 text-[2.4rem] leading-none">{note.sticker}</span>}
      {unread && <span className="absolute left-3 top-2 rounded-full bg-coral px-2 text-[0.9rem] font-black leading-[1.5rem] text-white">NEW</span>}
      <div className="min-h-0 flex-1 overflow-hidden">
        {note.kind === "text" && <p className={cn("line-clamp-5 font-display text-[1.9rem] font-black leading-[1.05] max-md:text-[1.6rem]", note.sticker && "pr-6")}>{note.text}</p>}
        {note.kind === "voice" && (
          <div className="flex h-full flex-col justify-center gap-2">
            <p className="text-[1.25rem] font-black">🎤 Voice note</p>
            <AudioPlayer mediaId={note.mediaId} durationMs={note.durationMs} color={c.ink} />
          </div>
        )}
        {note.kind === "doodle" && note.mediaId && <DoodleImage mediaId={note.mediaId} className="size-full" />}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {from && <Avatar member={from} size={2.4} />}
          <span className="text-[1.1rem] font-black opacity-70">→</span>
          {to ? <Avatar member={to} size={2.4} /> : <span className="text-[1.1rem] font-black">Everyone</span>}
        </div>
        {reactionCount > 0 && <span className="text-[1.15rem] font-black">❤️ {reactionCount}</span>}
      </div>
    </motion.button>
  );
}

function NoteViewer({ note, onClose }: { note: PostIt | null; onClose: () => void }) {
  const members = useHub((s) => s.members);
  const { markNoteSeen, reactToNote, finishNote } = useHub.getState();
  const live = useHub((s) => s.notes.find((n) => n.id === note?.id));
  const [viewer, setViewer] = useState<string>();
  const n = live ?? note;

  useEffect(() => {
    if (!n) return;
    const target = n.to === "everyone" ? members.find((m) => m.id !== n.from)?.id : n.to;
    setViewer(target);
    if (target) markNoteSeen(n.id, target);
    if (n.kind === "text" && n.text) {
      const from = members.find((m) => m.id === n.from);
      speak(`A note from ${from?.name ?? "someone"}. ${n.text}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id]);

  if (!n) return null;
  const c = noteColor(n.color);
  const from = members.find((m) => m.id === n.from);
  const to = n.to === "everyone" ? undefined : members.find((m) => m.id === n.to);

  return (
    <Sheet open={!!note} onOpenChange={(o) => !o && onClose()} title={`From ${from?.name ?? "someone"}`}>
      <div className="flex flex-col items-center gap-5">
        <div className="relative w-full max-w-[36rem] rounded-[0.8rem] p-8 pt-10 shadow-xl" style={{ background: c.bg, color: c.ink, rotate: `${n.rotation / 2}deg` }}>
          <span className="absolute -top-4 left-1/2 size-[2.8rem] -translate-x-1/2 rounded-full shadow" style={{ background: c.edge }} />
          {n.sticker && <span className="absolute right-5 top-4 text-[3.2rem]">{n.sticker}</span>}
          <div className="mb-4 flex items-center gap-3">
            {from && <Avatar member={from} size={3.6} />}
            <span className="text-[1.5rem] font-black">→</span>
            {to ? <Avatar member={to} size={3.6} /> : <span className="text-[1.5rem] font-black">Everyone</span>}
            <span className="ml-auto text-[1.15rem] font-bold opacity-70">{timeAgo(n.createdAt)}</span>
          </div>
          {n.kind === "text" && (
            <div className="flex items-start gap-3">
              <p className="flex-1 font-display text-[3rem] font-black leading-[1.05]">{n.text}</p>
              <ReadAloud text={n.text ?? ""} />
            </div>
          )}
          {n.kind === "voice" && <AudioPlayer mediaId={n.mediaId} durationMs={n.durationMs} color={c.ink} big />}
          {n.kind === "doodle" && n.mediaId && <DoodleImage mediaId={n.mediaId} className="h-[22rem] w-full" />}
        </div>

        <div className="flex items-center gap-3">
          {REACTIONS.map((r) => {
            const who = n.reactions[r] ?? [];
            const mine = viewer ? who.includes(viewer) : false;
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  sfx.pop();
                  if (viewer) reactToNote(n.id, r, viewer);
                }}
                className={cn("tap flex h-[4.6rem] min-w-[4.6rem] items-center justify-center gap-1 rounded-full bg-white px-4 text-[2.2rem] shadow-[var(--shadow-soft)]", mine && "ring-[0.25rem] ring-coral")}
              >
                {r}
                {who.length > 0 && <span className="text-[1.2rem] font-black">{who.length}</span>}
              </button>
            );
          })}
          <BigButton
            tone="sage"
            size="md"
            icon={<Check className="size-7" strokeWidth={3} />}
            onClick={() => {
              finishNote(n.id);
              sfx.soft();
              onClose();
            }}
          >
            Done, peel it off
          </BigButton>
        </div>
        {viewer && (
          <div className="flex items-center gap-2 text-[1.15rem] font-bold text-ink-2">
            Reacting as
            {members
              .filter((m) => m.id !== n.from)
              .map((m) => (
                <button key={m.id} type="button" onClick={() => setViewer(m.id)} className={cn("rounded-full p-0.5", viewer === m.id && "ring-[0.2rem] ring-ink")}>
                  <Avatar member={m} size={2.4} />
                </button>
              ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}

type Step = "from" | "to" | "how" | "write" | "talk" | "draw" | "finish";

export function Composer({ open, onOpenChange, fromPreset }: { open: boolean; onOpenChange: (o: boolean) => void; fromPreset?: string }) {
  const members = useHub((s) => s.members);
  const addNote = useHub((s) => s.addNote);
  const [step, setStep] = useState<Step>(fromPreset ? "to" : "from");
  const [from, setFrom] = useState<string | undefined>(fromPreset);
  const [to, setTo] = useState<string>();
  const [kind, setKind] = useState<NoteKind>("text");
  const [text, setText] = useState("");
  const [mediaId, setMediaId] = useState<string>();
  const [durationMs, setDuration] = useState<number>();
  const [color, setColor] = useState<NoteColor>("sun");
  const [sticker, setSticker] = useState<string>();

  useEffect(() => {
    if (open) {
      setStep(fromPreset ? "to" : "from");
      setFrom(fromPreset);
      setTo(undefined);
      setText("");
      setMediaId(undefined);
      setSticker(undefined);
      setColor(NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)].id);
    }
  }, [open, fromPreset]);

  const fromMember = members.find((m) => m.id === from);
  const back: Partial<Record<Step, Step>> = { to: "from", how: "to", write: "how", talk: "how", draw: "how", finish: kind === "text" ? "write" : kind === "voice" ? "talk" : "draw" };

  const stick = () => {
    if (!from || !to) return;
    addNote({ from, to, kind, text: kind === "text" ? text.trim() : undefined, mediaId, durationMs, color, sticker });
    onOpenChange(false);
    celebrate({ title: "Stuck on the fridge!", palId: fromMember?.palId });
  };

  const c = noteColor(color);
  const titles: Record<Step, string> = {
    from: "Who's it from?",
    to: "Who's it for?",
    how: "How do you want to say it?",
    write: "Write your note",
    talk: "Say your note",
    draw: "Draw your note",
    finish: "Pick a colour and a sticker",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={titles[step]} wide>
      <div className="min-h-[26rem]">
        {back[step] && (
          <button type="button" onClick={() => setStep(back[step]!)} className="tap mb-4 flex items-center gap-2 text-[1.3rem] font-extrabold text-ink-2">
            <ArrowLeft className="size-6" /> Back
          </button>
        )}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
            {step === "from" && (
              <PeoplePicker members={members} onPick={(id) => (setFrom(id), setStep("to"))} />
            )}
            {step === "to" && (
              <PeoplePicker
                members={members.filter((m) => m.id !== from)}
                everyone
                onPick={(id) => (setTo(id), setStep("how"))}
              />
            )}
            {step === "how" && (
              <div className="grid grid-cols-3 gap-5">
                {(
                  [
                    { k: "text", label: "Write", icon: <Pencil className="size-[4.5rem]" strokeWidth={2.4} />, bg: "var(--sun-tint)", next: "write" },
                    { k: "voice", label: "Talk", icon: <Mic className="size-[4.5rem]" strokeWidth={2.4} />, bg: "var(--coral-tint)", next: "talk" },
                    { k: "doodle", label: "Draw", icon: <span className="text-[4.5rem] leading-none">🖍️</span>, bg: "var(--sky-tint)", next: "draw" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => {
                      sfx.pop();
                      setKind(o.k);
                      setStep(o.next);
                    }}
                    className="tap flex h-[17rem] flex-col items-center justify-center gap-4 rounded-[2rem] ring-1 ring-black/5"
                    style={{ background: o.bg }}
                  >
                    {o.icon}
                    <span className="font-display text-[3rem] font-black">{o.label}</span>
                  </button>
                ))}
              </div>
            )}
            {step === "write" && (
              <div className="flex flex-col gap-4">
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={160}
                  placeholder="Type your note…"
                  className="h-[16rem] w-full resize-none rounded-[1.2rem] p-6 font-display text-[2.6rem] font-black leading-tight outline-none ring-2 ring-black/5 focus:ring-sky"
                  style={{ background: c.bg, color: c.ink }}
                />
                <div className="flex justify-end">
                  <BigButton disabled={!text.trim()} onClick={() => setStep("finish")}>
                    Next
                  </BigButton>
                </div>
              </div>
            )}
            {step === "talk" && (
              <VoiceRecorder
                color={c.edge}
                onSaved={(id, ms) => {
                  setMediaId(id);
                  setDuration(ms);
                  setStep("finish");
                }}
              />
            )}
            {step === "draw" && (
              <DoodlePad
                paper={c.bg}
                onSaved={(id) => {
                  setMediaId(id);
                  setStep("finish");
                }}
              />
            )}
            {step === "finish" && (
              <div className="grid grid-cols-[1fr_1.2fr] items-center gap-8">
                <motion.div
                  className="relative mx-auto flex aspect-square w-full max-w-[20rem] flex-col rounded-[0.6rem] p-6 pt-8 shadow-xl"
                  style={{ background: c.bg, color: c.ink }}
                  animate={{ rotate: [-2, 2, -2] }}
                  transition={{ duration: 4, repeat: Infinity }}
                >
                  <span className="absolute -top-3 left-1/2 size-[2.4rem] -translate-x-1/2 rounded-full" style={{ background: c.edge }} />
                  {sticker && <span className="absolute right-3 top-2 text-[2.8rem]">{sticker}</span>}
                  {kind === "text" && <p className="font-display text-[2.2rem] font-black leading-tight">{text}</p>}
                  {kind === "voice" && <p className="text-[1.6rem] font-black">🎤 Voice note</p>}
                  {kind === "doodle" && mediaId && <DoodleImage mediaId={mediaId} className="min-h-0 flex-1" />}
                </motion.div>
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap gap-3">
                    {NOTE_COLORS.map((nc) => (
                      <button
                        key={nc.id}
                        type="button"
                        aria-label={nc.id}
                        onClick={() => (sfx.tap(), setColor(nc.id))}
                        className={cn("tap size-[4.4rem] rounded-[1rem] ring-[0.3rem] ring-transparent", color === nc.id && "ring-ink")}
                        style={{ background: nc.bg }}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-2.5">
                    {STICKERS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => (sfx.pop(), setSticker(sticker === s ? undefined : s))}
                        className={cn("tap grid aspect-square place-items-center rounded-[1rem] bg-white text-[2.4rem] ring-[0.25rem] ring-transparent", sticker === s && "ring-coral")}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <BigButton size="xl" onClick={stick}>
                    Stick it! 🧲
                  </BigButton>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Sheet>
  );
}

export function PeoplePicker({
  members,
  onPick,
  everyone,
  selected,
}: {
  members: Member[];
  onPick: (id: string) => void;
  everyone?: boolean;
  selected?: string[];
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-4">
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => {
            sfx.pop();
            onPick(m.id);
          }}
          className={cn(
            "tap flex flex-col items-center gap-2 rounded-[1.8rem] bg-white py-5 ring-1 ring-black/5",
            selected?.includes(m.id) && "ring-[0.35rem] ring-coral",
          )}
        >
          <Avatar member={m} size={8} />
          <span className="font-display text-[2.2rem] font-black">{m.name}</span>
        </button>
      ))}
      {everyone && (
        <button
          type="button"
          onClick={() => {
            sfx.pop();
            onPick("everyone");
          }}
          className="tap flex flex-col items-center justify-center gap-2 rounded-[1.8rem] bg-white py-5 ring-1 ring-black/5"
        >
          <span className="grid size-[8rem] place-items-center rounded-full bg-sun-tint text-[4.4rem]">👨‍👩‍👧‍👦</span>
          <span className="font-display text-[2rem] font-black">Everyone</span>
        </button>
      )}
    </div>
  );
}
