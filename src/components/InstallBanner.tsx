/**
 * "Add Home Hub to your home screen": a small card above the tab bar on phones
 * and tablets that aren't running the installed app yet. Android/Chrome get an
 * Install button (the browser's own prompt); iPhone/iPad get the Share → Add
 * to Home Screen steps. Hidden for two weeks when dismissed.
 */
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Share, X } from "lucide-react";
import { installApp, isIos, usePwa } from "@/lib/pwa";
import { sfx } from "@/lib/device";

const KEY = "homehub-install-dismissed";
const TWO_WEEKS = 14 * 86_400_000;

function dismissedRecently(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(KEY) ?? 0) < TWO_WEEKS;
  } catch {
    return false;
  }
}

export function InstallBanner() {
  const { promptEvent, installed } = usePwa();
  const [hidden, setHidden] = useState(dismissedRecently);
  const ios = isIos();
  const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const show = !installed && !hidden && touch && (!!promptEvent || ios);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* private mode */
    }
    setHidden(true);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="pointer-events-auto absolute inset-x-3 bottom-[calc(max(0.6rem,env(safe-area-inset-bottom))+6.2rem)] z-30 mx-auto flex max-w-[44rem] items-center gap-3 rounded-[1.6rem] bg-ink p-3 pl-4 text-white shadow-[var(--shadow-lift)] md:bottom-[calc(max(1.1rem,env(safe-area-inset-bottom))+7.4rem)]"
          role="dialog"
          aria-label="Install Home Hub"
        >
          <img src="/icon-192.png" alt="" className="size-[3.6rem] shrink-0 rounded-[0.9rem]" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="text-[1.3rem] font-black">Add Home Hub to your home screen</p>
            <p className="text-[1.05rem] font-bold opacity-80">
              {promptEvent ? "Opens like an app, full screen, and works offline." : (
                <>
                  Tap <Share className="inline size-4 -translate-y-px" /> Share, then <b>Add to Home Screen</b>.
                </>
              )}
            </p>
          </div>
          {promptEvent && (
            <button
              type="button"
              onClick={async () => {
                sfx.pop();
                if (!(await installApp())) dismiss();
              }}
              className="tap h-[3.8rem] shrink-0 rounded-full bg-white px-4 text-[1.2rem] font-black text-ink"
            >
              Install
            </button>
          )}
          <button type="button" aria-label="Not now" onClick={dismiss} className="tap grid size-[3.4rem] shrink-0 place-items-center rounded-full text-white/80">
            <X className="size-6" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
