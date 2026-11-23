import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Clock, Heart, Plus, Repeat, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { useHub } from "@/lib/store";
import { useRecipes, useShoppingList, useWeekMeals, type DayMeal } from "@/lib/hooks";
import { ingredientName, recipeImage, signalSetDinner, useSignal } from "@/lib/integrations/signal";
import { addDays, dateKey, formatDateShort, formatDay, formatDayShort, startOfWeek } from "@/lib/time";
import { sfx } from "@/lib/device";
import type { Recipe } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { BigButton, ReadAloud, Sheet, SourceBadge } from "@/components/ui";
import { requireParent } from "@/components/PinPad";
import { cn } from "@/lib/utils";

const NONE: string[] = [];

export default function Meals() {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => addDays(startOfWeek(), weekOffset * 7), [weekOffset]);
  const { days, source } = useWeekMeals(weekStart);
  const today = dateKey();
  const [open, setOpen] = useState<DayMeal | null>(null);
  const feature = days.find((d) => d.key === today) ?? days[0];
  const rest = days.filter((d) => d !== feature);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="font-display text-[3.4rem] font-black leading-none">What's for dinner 🍽️</h1>
        <div className="flex items-center gap-3">
          <SourceBadge source={source === "signal" ? "signal" : source === "sample" ? "sample" : "local"} />
          <div className="flex items-center gap-1 rounded-full bg-white p-1.5 shadow-[var(--shadow-soft)]">
            <button type="button" aria-label="Last week" onClick={() => setWeekOffset((w) => w - 1)} className="tap grid size-[3.4rem] place-items-center rounded-full hover:bg-black/5">
              <ChevronLeft className="size-7" />
            </button>
            <span className="min-w-[11rem] text-center text-[1.3rem] font-black">
              {weekOffset === 0 ? "This week" : `${formatDateShort(weekStart)} – ${formatDateShort(addDays(weekStart, 6))}`}
            </span>
            <button type="button" aria-label="Next week" onClick={() => setWeekOffset((w) => w + 1)} className="tap grid size-[3.4rem] place-items-center rounded-full hover:bg-black/5">
              <ChevronRight className="size-7" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)] gap-[1.3rem]">
        {feature && <FeatureCard day={feature} isToday={feature.key === today} onOpen={() => setOpen(feature)} />}
        <div className="grid min-h-0 grid-cols-3 grid-rows-2 gap-[1.3rem]">
          {rest.map((d, i) => (
            <DayCard key={d.key} day={d} index={i} onOpen={() => setOpen(d)} />
          ))}
        </div>
      </div>
      <RecipeSheet day={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function Photo({ recipe, className }: { recipe?: Recipe; className?: string }) {
  const src = recipeImage(recipe);
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className={cn("grid place-items-center bg-gradient-to-br from-peach-tint to-sun-tint text-[5rem]", className)}>🍲</div>;
  }
  return <img src={src} alt="" onError={() => setFailed(true)} className={cn("object-cover", className)} draggable={false} />;
}

function Hearts({ day }: { day: DayMeal }) {
  const members = useHub((s) => s.members);
  const hearts = useHub((s) => (day.dinnerId ? s.mealHearts[day.dinnerId] ?? NONE : NONE));
  if (!hearts.length) return null;
  return (
    <span className="flex items-center gap-1 rounded-full bg-white/90 py-0.5 pl-2 pr-1 text-[1.1rem] font-black text-coral-ink">
      ❤️
      {members
        .filter((m) => hearts.includes(m.id))
        .map((m) => (
          <Avatar key={m.id} member={m} size={1.8} />
        ))}
    </span>
  );
}

function FeatureCard({ day, isToday, onOpen }: { day: DayMeal; isToday: boolean; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={() => {
        sfx.pop();
        onOpen();
      }}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="tap relative overflow-hidden rounded-[2.2rem] bg-peach-tint text-left shadow-[var(--shadow-lift)]"
    >
      <Photo recipe={day.dinner} className="absolute inset-0 size-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <div className="absolute left-5 top-5 flex gap-2">
        <span className="rounded-full bg-coral px-4 py-1 text-[1.3rem] font-black text-white shadow">{isToday ? "Tonight" : formatDay(day.date)}</span>
        <Hearts day={day} />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-6 text-white">
        <p className="font-display text-[3.4rem] font-black leading-[0.95]">{day.dinner?.name ?? "Nothing planned yet"}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[1.2rem] font-extrabold">
          {day.dinner?.time && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
              <Clock className="size-5" /> {day.dinner.time}
            </span>
          )}
          {day.dinner?.serves && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 backdrop-blur">
              <Users className="size-5" /> Serves {day.dinner.serves}
            </span>
          )}
          <span className="rounded-full bg-white px-4 py-1 text-ink">See the recipe →</span>
        </div>
      </div>
    </motion.button>
  );
}

function DayCard({ day, index, onOpen }: { day: DayMeal; index: number; onOpen: () => void }) {
  const past = day.date < new Date(new Date().setHours(0, 0, 0, 0));
  return (
    <motion.button
      type="button"
      onClick={() => {
        sfx.tap();
        onOpen();
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn("tap card flex min-h-0 flex-col overflow-hidden text-left", past && "opacity-55")}
    >
      <div className="relative min-h-0 flex-1">
        <Photo recipe={day.dinner} className="absolute inset-0 size-full" />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-0.5 text-[1.15rem] font-black shadow-sm">{formatDayShort(day.date)}</span>
        <span className="absolute right-3 top-3">
          <Hearts day={day} />
        </span>
      </div>
      <div className="shrink-0 px-4 py-3">
        <p className="line-clamp-2 text-[1.3rem] font-extrabold leading-tight">{day.dinner?.name ?? "Not planned"}</p>
      </div>
    </motion.button>
  );
}

function RecipeSheet({ day, onClose }: { day: DayMeal | null; onClose: () => void }) {
  const members = useHub((s) => s.members);
  const hearts = useHub((s) => (day?.dinnerId ? s.mealHearts[day.dinnerId] ?? NONE : NONE));
  const toggleHeart = useHub((s) => s.toggleMealHeart);
  const { add, items } = useShoppingList();
  const [swapping, setSwapping] = useState(false);
  const r = day?.dinner;
  const onList = (name: string) => items.some((i) => !i.checked && i.name.toLowerCase() === name.toLowerCase());

  const addOne = async (line: string) => {
    const name = ingredientName(line);
    if (!name || onList(name)) return;
    sfx.pop();
    try {
      await add(name, { recipe: r?.name });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add that");
    }
  };

  const addAll = async () => {
    if (!r) return;
    const names = [...new Set(r.ingredients.map(ingredientName).filter(Boolean))].filter((n) => !onList(n));
    try {
      for (const n of names) await add(n, { recipe: r.name });
      sfx.success();
      toast.success(`Added ${names.length} things to the list`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add everything");
    }
  };

  return (
    <Sheet open={!!day} onOpenChange={(o) => !o && onClose()} title={r?.name ?? "Plan this dinner"} wide>
      {day && (
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6">
          <div className="flex flex-col gap-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.8rem]">
              <Photo recipe={r} className="absolute inset-0 size-full" />
              <span className="absolute left-4 top-4 rounded-full bg-white px-4 py-1 text-[1.2rem] font-black">{formatDay(day.date)}</span>
            </div>
            <div className="rounded-[1.6rem] bg-white p-4">
              <p className="mb-2 flex items-center gap-2 text-[1.2rem] font-black text-ink-2">
                <Heart className="size-5" /> Who wants this again?
              </p>
              <div className="flex gap-2">
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (!day.dinnerId) return;
                      sfx.pop();
                      toggleHeart(day.dinnerId, m.id);
                    }}
                    className={cn("tap relative rounded-full p-0.5", hearts.includes(m.id) && "ring-[0.25rem] ring-coral")}
                  >
                    <Avatar member={m} size={3.8} />
                    {hearts.includes(m.id) && <span className="absolute -bottom-1 -right-1 text-[1.4rem]">❤️</span>}
                  </button>
                ))}
              </div>
            </div>
            <BigButton
              tone="white"
              size="md"
              icon={<Repeat className="size-6" />}
              onClick={async () => {
                if (await requireParent("Change the meal plan")) setSwapping(true);
              }}
            >
              {r ? "Swap this dinner" : "Choose a dinner"}
            </BigButton>
          </div>
          <div className="flex min-h-0 flex-col">
            {r ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[1.3rem] font-black uppercase tracking-[0.08em] text-ink-3">Ingredients</p>
                  <ReadAloud text={`${r.name}. You need: ${r.ingredients.map(ingredientName).join(", ")}`} size={3.2} />
                </div>
                <ul className="flex max-h-[28rem] flex-col gap-2 overflow-y-auto pr-1">
                  {r.ingredients.map((line, i) => {
                    const name = ingredientName(line);
                    const on = onList(name);
                    return (
                      <li key={i} className="flex items-center gap-3 rounded-[1.2rem] bg-white px-4 py-2.5">
                        <span className="min-w-0 flex-1 text-[1.3rem] font-bold">{line}</span>
                        <button
                          type="button"
                          aria-label={`Add ${name}`}
                          disabled={on}
                          onClick={() => void addOne(line)}
                          className={cn("tap grid size-[3.2rem] shrink-0 place-items-center rounded-full", on ? "bg-sage-tint text-sage-ink" : "bg-sage text-white")}
                        >
                          {on ? "✓" : <Plus className="size-6" strokeWidth={3} />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <BigButton tone="sage" size="lg" className="mt-4" icon={<Plus className="size-7" strokeWidth={3} />} onClick={() => void addAll()}>
                  Add what we need to the list
                </BigButton>
              </>
            ) : (
              <p className="text-[1.5rem] font-bold text-ink-2">No dinner planned for this day yet.</p>
            )}
          </div>
        </div>
      )}
      {day && <SwapSheet open={swapping} onOpenChange={setSwapping} date={day.key} />}
    </Sheet>
  );
}

function SwapSheet({ open, onOpenChange, date }: { open: boolean; onOpenChange: (o: boolean) => void; date: string }) {
  const recipes = useRecipes();
  const signalUser = useSignal((s) => s.userId);
  const setLocalDinner = useHub((s) => s.setLocalDinner);
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!recipes) return [];
    const all = [...recipes.values()].filter((r) => r.category === "meal" && r.image);
    const t = q.trim().toLowerCase();
    return (t ? all.filter((r) => r.name.toLowerCase().includes(t)) : all).slice(0, 24);
  }, [recipes, q]);

  const choose = async (r: Recipe) => {
    try {
      if (signalUser) await signalSetDinner(date, r.id);
      else setLocalDinner(date, r.id);
      sfx.success();
      toast.success(`${r.name} it is!`);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't change the plan");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Pick a dinner" wide>
      <div className="relative mb-4">
        <Search className="absolute left-5 top-1/2 size-7 -translate-y-1/2 text-ink-3" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search SIGNAL recipes… e.g. chicken, tacos, curry"
          className="h-[4.6rem] w-full rounded-[1.4rem] border-2 border-line bg-white pl-16 pr-5 text-[1.5rem] font-bold outline-none focus:border-sky"
        />
      </div>
      <div className="grid grid-cols-4 gap-3">
        {results.map((r) => (
          <button key={r.id} type="button" onClick={() => void choose(r)} className="tap overflow-hidden rounded-[1.4rem] bg-white text-left ring-1 ring-black/5">
            <Photo recipe={r} className="aspect-[4/3] w-full" />
            <p className="line-clamp-2 px-3 py-2 text-[1.15rem] font-extrabold leading-tight">{r.name}</p>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
