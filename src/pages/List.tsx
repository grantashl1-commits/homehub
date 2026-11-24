import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Mic, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useHub } from "@/lib/store";
import { useShoppingList } from "@/lib/hooks";
import { CATEGORIES, QUICK_GROCERIES, categoryMeta, groceryEmoji } from "@/lib/catalog";
import { canListen, listenOnce, sfx } from "@/lib/device";
import type { ListItem, Member } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { EmptyState, SourceBadge } from "@/components/ui";
import { requireParent } from "@/components/PinPad";
import { cn } from "@/lib/utils";

export default function ShoppingList() {
  const [params, setParams] = useSearchParams();
  const { items, source, add, toggle, remove, clearChecked } = useShoppingList();
  const members = useHub((s) => s.members);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [showTrolley, setShowTrolley] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (params.get("add")) {
      input.current?.focus();
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const todo = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);
  const grouped = useMemo(
    () =>
      CATEGORIES.map((c) => ({ ...c, items: todo.filter((i) => (i.category || "other") === c.id) })).filter((g) => g.items.length),
    [todo],
  );

  const addItem = async (name: string, category?: string) => {
    const clean = name.trim();
    if (!clean) return;
    sfx.pop();
    try {
      await add(clean, { category });
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add that");
    }
  };

  const safe = (fn: () => Promise<void> | void) => async () => {
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  return (
    <div className="grid h-full grid-cols-1 gap-[1.3rem] md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
      <section className="card flex min-h-0 flex-col p-6 max-md:p-4">
        <div className="mb-4 flex items-center justify-between gap-4 max-md:mb-2">
          <h1 className="font-display text-[3.2rem] font-black leading-none">Shopping list</h1>
          <SourceBadge source={source === "signal" ? "signal" : "local"} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 no-scrollbar max-md:overflow-visible">
          {todo.length === 0 && done.length === 0 && <EmptyState emoji="🧺" title="Nothing to buy!" body="Tap a picture to add something." />}
          {todo.length === 0 && done.length > 0 && <EmptyState emoji="🎉" title="All in the trolley!" />}
          <AnimatePresence initial={false}>
            {grouped.map((g) => (
              <motion.div key={g.id} layout className="mb-4">
                <p className="mb-2 flex items-center gap-2 text-[1.15rem] font-black uppercase tracking-[0.08em]" style={{ color: g.ink }}>
                  <span className="text-[1.5rem]">{g.emoji}</span> {g.label}
                </p>
                <div className="flex flex-col gap-2">
                  {g.items.map((i) => (
                    <Row key={i.id} item={i} by={members.find((m) => m.id === i.addedBy)} onToggle={safe(() => toggle(i.id))} onRemove={safe(() => remove(i.id))} />
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {done.length > 0 && (
            <div className="mt-2 rounded-[1.6rem] bg-paper p-3">
              <button
                type="button"
                onClick={() => setShowTrolley((v) => !v)}
                className="tap flex w-full items-center justify-between px-2 py-1 text-[1.35rem] font-black text-ink-2"
              >
                <span>🛒 In the trolley ({done.length})</span>
                <ChevronDown className={cn("size-7 transition-transform", showTrolley && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {showTrolley && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="mt-2 flex flex-col gap-2">
                      {done.map((i) => (
                        <Row key={i.id} item={i} onToggle={safe(() => toggle(i.id))} onRemove={safe(() => remove(i.id))} />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (await requireParent("Clear everything in the trolley?")) await safe(clearChecked)();
                      }}
                      className="tap mt-3 flex min-h-[3.8rem] w-full items-center justify-center gap-2 rounded-[1.2rem] bg-white text-[1.25rem] font-black text-coral-ink ring-1 ring-black/5"
                    >
                      <Trash2 className="size-6" /> Clear the trolley
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void addItem(text);
          }}
          className="flex gap-3"
        >
          <input
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add something…"
            className="h-[5rem] min-w-0 flex-1 rounded-[1.5rem] border-2 border-line bg-white px-5 text-[1.6rem] font-bold shadow-[var(--shadow-soft)] outline-none focus:border-sage"
          />
          {canListen() && (
            <button
              type="button"
              aria-label="Say it"
              onClick={async () => {
                setListening(true);
                sfx.pop();
                const said = await listenOnce().promise;
                setListening(false);
                if (said) void addItem(said.replace(/^./, (c) => c.toUpperCase()));
              }}
              className={cn("tap grid size-[5rem] shrink-0 place-items-center rounded-[1.5rem] text-white shadow-[var(--shadow-soft)]", listening ? "bg-coral" : "bg-ink")}
            >
              <motion.span animate={listening ? { scale: [1, 1.25, 1] } : {}} transition={{ repeat: Infinity, duration: 0.8 }}>
                <Mic className="size-8" />
              </motion.span>
            </button>
          )}
          <button type="submit" aria-label="Add" className="tap grid size-[5rem] shrink-0 place-items-center rounded-[1.5rem] bg-sage text-white shadow-[var(--shadow-soft)]">
            <Plus className="size-9" strokeWidth={3} />
          </button>
        </form>
        <div className="card min-h-0 flex-1 overflow-y-auto p-4 no-scrollbar">
          <p className="mb-3 px-1 text-[1.15rem] font-black uppercase tracking-[0.08em] text-ink-3">Tap to add</p>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-4">
            {QUICK_GROCERIES.map((g) => {
              const on = todo.some((i) => i.name.toLowerCase() === g.name.toLowerCase());
              return (
                <motion.button
                  key={g.name}
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => !on && void addItem(g.name, g.category)}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center gap-1 rounded-[1.4rem] ring-1 ring-black/5",
                    on && "opacity-50",
                  )}
                  style={{ background: categoryMeta(g.category).tint }}
                >
                  <span className="text-[3rem] leading-none">{g.emoji}</span>
                  <span className="text-[1.1rem] font-extrabold leading-tight">{g.name}</span>
                  {on && <Check className="absolute right-2 top-2 size-6 text-sage-ink" strokeWidth={3.5} />}
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function Row({ item, by, onToggle, onRemove }: { item: ListItem; by?: Member; onToggle: () => void; onRemove: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40, height: 0 }}
      className={cn("flex min-h-[5.2rem] items-center gap-4 rounded-[1.4rem] bg-paper px-4 ring-1 ring-black/5 max-md:gap-1 max-md:px-3", item.checked && "bg-white opacity-70")}
    >
      <button
        type="button"
        onClick={() => {
          sfx.tap();
          onToggle();
        }}
        aria-label={item.checked ? `Untick ${item.name}` : `Tick ${item.name}`}
        className="tap flex min-w-0 flex-1 items-center gap-4 py-2 text-left max-md:gap-2.5"
      >
        <span className={cn("grid size-[3.4rem] shrink-0 place-items-center rounded-full border-[0.22rem] transition-colors", item.checked ? "border-sage bg-sage text-white" : "border-ink/25 bg-white")}>
          {item.checked && <Check className="size-6" strokeWidth={4} />}
        </span>
        <span className="text-[2rem] leading-none">{groceryEmoji(item.name)}</span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-[1.6rem] font-extrabold", item.checked && "line-through decoration-[0.2rem]")}>{item.name}</span>
          {item.recipe && <span className="block truncate text-[1.1rem] font-bold text-ink-3">for {item.recipe}</span>}
        </span>
      </button>
      {by && <span className="max-md:hidden"><Avatar member={by} size={2.6} /></span>}
      <button type="button" aria-label={`Remove ${item.name}`} onClick={onRemove} className="tap grid size-[3.4rem] place-items-center rounded-full text-ink-3 hover:bg-black/5">
        <X className="size-6" />
      </button>
    </motion.div>
  );
}
