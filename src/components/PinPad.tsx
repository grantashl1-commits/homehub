import { useEffect, useState, type ReactNode } from "react";
import { motion, useAnimationControls } from "motion/react";
import { Delete, Lock } from "lucide-react";
import { create } from "zustand";
import { cn } from "@/lib/utils";
import { hashPin, sfx } from "@/lib/device";
import { useHub } from "@/lib/store";
import { Sheet } from "./ui";

/* Parent unlock lasts 2 minutes and is never persisted. */
const UNLOCK_MS = 2 * 60_000;
export const useParentLock = create<{ until: number; fails: number; lockedUntil: number }>(() => ({
  until: 0,
  fails: 0,
  lockedUntil: 0,
}));

export function isParentUnlocked(): boolean {
  return Date.now() < useParentLock.getState().until;
}

export function lockParent() {
  useParentLock.setState({ until: 0 });
}

export function extendParent() {
  if (isParentUnlocked()) useParentLock.setState({ until: Date.now() + UNLOCK_MS });
}

export function useParentUnlocked(): boolean {
  const until = useParentLock((s) => s.until);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!until) return;
    const t = window.setInterval(() => tick((n) => n + 1), 5000);
    return () => window.clearInterval(t);
  }, [until]);
  return Date.now() < until;
}

/** Ask for the parent PIN; resolves true when it's right. */
const usePrompt = create<{ open: boolean; reason?: string; resolve?: (ok: boolean) => void }>(() => ({ open: false }));

export function requireParent(reason?: string): Promise<boolean> {
  if (isParentUnlocked()) {
    extendParent();
    return Promise.resolve(true);
  }
  return new Promise((resolve) => usePrompt.setState({ open: true, reason, resolve }));
}

export function ParentPinPrompt() {
  const { open, reason, resolve } = usePrompt();
  const close = (ok: boolean) => {
    resolve?.(ok);
    usePrompt.setState({ open: false, resolve: undefined });
  };
  return (
    <Sheet open={open} onOpenChange={(o) => !o && close(false)} title="Grown-ups only" className="w-[min(36rem,94vw)]">
      <PinPad reason={reason} onSuccess={() => close(true)} />
    </Sheet>
  );
}

export function PinPad({ reason, onSuccess }: { reason?: string; onSuccess: () => void }) {
  const [digits, setDigits] = useState("");
  const [checking, setChecking] = useState(false);
  const controls = useAnimationControls();
  const { pinHash, pinSalt } = useHub((s) => s.settings);
  const lockedUntil = useParentLock((s) => s.lockedUntil);
  const locked = Date.now() < lockedUntil;

  const submit = async (value: string) => {
    if (!pinHash || !pinSalt) {
      useParentLock.setState({ until: Date.now() + UNLOCK_MS });
      onSuccess();
      return;
    }
    setChecking(true);
    const ok = (await makePinHash(value, pinSalt)) === pinHash;
    setChecking(false);
    if (ok) {
      sfx.success();
      useParentLock.setState({ until: Date.now() + UNLOCK_MS, fails: 0 });
      onSuccess();
    } else {
      sfx.error();
      const fails = useParentLock.getState().fails + 1;
      useParentLock.setState({ fails, lockedUntil: fails >= 5 ? Date.now() + 5 * 60_000 : 0 });
      void controls.start({ x: [0, -18, 18, -12, 12, -6, 0], transition: { duration: 0.45 } });
      setDigits("");
    }
  };

  const press = (d: string) => {
    if (locked || checking) return;
    sfx.tap();
    const next = (digits + d).slice(0, 6);
    setDigits(next);
    if (next.length >= 4 && pinHash && next.length === pinLength(pinHash)) void submit(next);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-3 text-[1.4rem] font-bold text-ink-2">
        <Lock className="size-6" />
        {locked ? "Too many tries. Wait 5 minutes." : reason ?? "Enter the parent PIN"}
      </div>
      <motion.div animate={controls} className="flex gap-3">
        {Array.from({ length: Math.max(4, digits.length) }).map((_, i) => (
          <span
            key={i}
            className={cn("size-[1.6rem] rounded-full border-[0.2rem] border-ink/30", i < digits.length && "border-coral bg-coral")}
          />
        ))}
      </motion.div>
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Key key={d} onClick={() => press(d)}>
            {d}
          </Key>
        ))}
        <Key onClick={() => digits.length >= 4 && void submit(digits)} className="bg-sage text-white text-[1.4rem]">
          OK
        </Key>
        <Key onClick={() => press("0")}>0</Key>
        <Key onClick={() => setDigits((d) => d.slice(0, -1))} className="bg-transparent shadow-none ring-0">
          <Delete className="size-9" />
        </Key>
      </div>
    </div>
  );
}

/** The PIN length is remembered alongside its hash ("6:abcd…") so it submits itself. */
function pinLength(hash: string): number {
  const m = /^(\d):/.exec(hash);
  return m ? Number(m[1]) : 0;
}

export async function makePinHash(pin: string, salt: string): Promise<string> {
  return `${pin.length}:${await hashPin(pin, salt)}`;
}

function Key({ children, onClick, className }: { children: ReactNode; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tap grid size-[5.6rem] max-md:size-[4.6rem] place-items-center rounded-[1.6rem] bg-white font-display text-[2.6rem] font-black shadow-[var(--shadow-soft)] ring-1 ring-black/5",
        className,
      )}
    >
      {children}
    </button>
  );
}
