import { useEffect } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "motion/react";
import { create } from "zustand";
import { Avatar } from "./Avatar";
import { sfx } from "@/lib/device";
import { useHub } from "@/lib/store";

interface Party {
  id: number;
  title: string;
  subtitle?: string;
  palId?: string;
  photo?: string;
  emoji?: string;
}

const useParty = create<{ party: Party | null }>(() => ({ party: null }));

/** Fire a short reward moment: confetti, a bouncing pal and a message. */
export function celebrate(p: Omit<Party, "id">) {
  const { reducedMotion, sounds } = useHub.getState().settings;
  if (sounds) sfx.success();
  if (!reducedMotion) {
    const colors = ["#EE7B5B", "#F6C64E", "#6FB784", "#64A3D8", "#A48AD8", "#EC8EA8"];
    void confetti({ particleCount: 110, spread: 85, startVelocity: 48, origin: { y: 0.65 }, colors, scalar: 1.3 });
    window.setTimeout(
      () => void confetti({ particleCount: 60, spread: 120, startVelocity: 32, origin: { y: 0.55 }, colors, scalar: 1.1 }),
      220,
    );
  }
  useParty.setState({ party: { ...p, id: Date.now() } });
}

export function CelebrationLayer() {
  const party = useParty((s) => s.party);
  useEffect(() => {
    if (!party) return;
    const t = window.setTimeout(() => useParty.setState({ party: null }), 1700);
    return () => window.clearTimeout(t);
  }, [party]);

  return (
    <AnimatePresence>
      {party && (
        <motion.button
          key={party.id}
          type="button"
          aria-label="Close celebration"
          onClick={() => useParty.setState({ party: null })}
          className="fixed inset-0 z-[80] grid place-items-center bg-[rgb(255_250_240/0.55)] backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex flex-col items-center gap-3 rounded-[2.5rem] bg-white px-14 py-10 shadow-2xl"
            initial={{ scale: 0.6, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 18 }}
          >
            <motion.div animate={{ y: [0, -22, 0, -10, 0], rotate: [0, -6, 6, -3, 0] }} transition={{ duration: 0.9 }}>
              {party.palId ? (
                <Avatar palId={party.palId} photo={party.photo} size={9} />
              ) : (
                <span className="text-[7rem] leading-none">{party.emoji ?? "🎉"}</span>
              )}
            </motion.div>
            <p className="font-display text-[3.6rem] font-black leading-none text-ink">{party.title}</p>
            {party.subtitle && <p className="text-[1.6rem] font-bold text-ink-2">{party.subtitle}</p>}
          </motion.div>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
