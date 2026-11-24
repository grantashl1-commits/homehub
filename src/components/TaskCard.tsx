import { motion } from "motion/react";
import { sfx } from "@/lib/device";
import { dateKey } from "@/lib/time";
import { dueLabel, type GoogleTask } from "@/lib/integrations/google-tasks";
import { cn } from "@/lib/utils";

/** A Google task pinned to the fridge: a white to-do card with a blue magnet. */
export function TaskCard({ task, onOpen, small }: { task: GoogleTask; onOpen: () => void; small?: boolean }) {
  const due = dueLabel(task.due, dateKey());
  const overdue = !!task.due && task.due < dateKey();
  return (
    <motion.button
      type="button"
      layout
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        sfx.pop();
        onOpen();
      }}
      initial={{ opacity: 0, scale: 0.6, y: -60 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: -1.5 }}
      exit={{ opacity: 0, rotate: 20, y: 120, x: 80, transition: { duration: 0.45 } }}
      whileTap={{ scale: 0.96, rotate: 0 }}
      className={cn(
        "relative flex flex-col rounded-[0.5rem] bg-white text-left text-ink shadow-[0_14px_24px_-14px_rgb(0_0_0/0.45)] ring-1 ring-black/5",
        small ? "p-3 pt-4" : "aspect-square p-5 pt-9",
      )}
      style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent 0 1.9rem, rgb(100 163 216 / 0.18) 1.9rem 2rem)" }}
    >
      <span className={cn("absolute left-1/2 -translate-x-1/2 rounded-full bg-sky shadow-[0_3px_5px_rgb(0_0_0/0.25)]", small ? "-top-2 size-4" : "-top-3 size-[2.2rem]")} />
      <span className={cn("font-black uppercase tracking-[0.08em] text-sky-ink", small ? "text-[0.85rem]" : "text-[1rem]")}>☑️ To do</span>
      <p className={cn("font-display font-black leading-[1.05]", small ? "line-clamp-2 text-[1.15rem]" : "mt-1 line-clamp-3 text-[1.9rem] max-md:text-[1.6rem]")}>{task.title}</p>
      {!small && task.notes && <p className="mt-1 line-clamp-2 text-[1.15rem] font-bold text-ink-2">{task.notes}</p>}
      {due && (
        <span className={cn("mt-auto self-start rounded-full px-2.5 py-0.5 font-black", small ? "mt-1 text-[0.9rem]" : "text-[1.05rem]", overdue ? "bg-coral text-white" : "bg-sky-tint text-sky-ink")}>
          {due}
        </span>
      )}
    </motion.button>
  );
}

