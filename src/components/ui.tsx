import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { Volume2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { canSpeak, sfx, speak, stopSpeaking } from "@/lib/device";
import { iconUrl } from "@/lib/pals";

/* ── Buttons ───────────────────────────────────────────────────────────── */

type Tone = "coral" | "sage" | "sky" | "lilac" | "sun" | "rose" | "ink" | "white" | "ghost";
type Size = "md" | "lg" | "xl";

const TONES: Record<Tone, string> = {
  coral: "bg-coral text-white shadow-[var(--shadow-glow)]",
  sage: "bg-sage text-white shadow-[0_10px_30px_-10px_rgb(111_183_132/0.7)]",
  sky: "bg-sky text-white shadow-[0_10px_30px_-10px_rgb(100_163_216/0.7)]",
  lilac: "bg-lilac text-white shadow-[0_10px_30px_-10px_rgb(164_138_216/0.7)]",
  sun: "bg-sun text-ink shadow-[0_10px_30px_-10px_rgb(246_198_78/0.8)]",
  rose: "bg-rose text-white shadow-[0_10px_30px_-10px_rgb(236_142_168/0.7)]",
  ink: "bg-ink text-white",
  white: "bg-white text-ink border border-line shadow-[var(--shadow-soft)]",
  ghost: "bg-transparent text-ink-2 hover:bg-black/5",
};

const SIZES: Record<Size, string> = {
  md: "min-h-[4rem] px-6 text-[1.35rem] gap-2.5 rounded-[1.25rem]",
  lg: "min-h-[5rem] px-8 text-[1.6rem] gap-3 rounded-[1.5rem]",
  xl: "min-h-[6.5rem] px-10 text-[2.1rem] gap-4 rounded-[2rem]",
};

export interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  size?: Size;
  icon?: ReactNode;
  silent?: boolean;
}

export const BigButton = forwardRef<HTMLButtonElement, BigButtonProps>(function BigButton(
  { tone = "coral", size = "lg", icon, className, children, onClick, silent, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={(e) => {
        if (!silent) sfx.tap();
        onClick?.(e);
      }}
      className={cn(
        "tap inline-flex select-none items-center justify-center font-extrabold leading-tight disabled:opacity-50",
        TONES[tone],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  children,
  className,
  onClick,
  tone = "white",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  tone?: Tone;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        sfx.tap();
        onClick?.();
      }}
      className={cn("tap grid size-[4rem] place-items-center rounded-full", TONES[tone], className)}
    >
      {children}
    </button>
  );
}

/* ── Read it to me ─────────────────────────────────────────────────────── */

export function ReadAloud({ text, className, size = 3.6 }: { text: string; className?: string; size?: number }) {
  const [on, setOn] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  if (!canSpeak()) return null;
  return (
    <button
      type="button"
      aria-label="Read it to me"
      title="Read it to me"
      onClick={(e) => {
        e.stopPropagation();
        if (on) {
          stopSpeaking();
          setOn(false);
          return;
        }
        setOn(true);
        speak(text, { onEnd: () => setOn(false) });
      }}
      className={cn(
        "tap grid shrink-0 place-items-center rounded-full bg-white/90 text-sky-ink shadow-[var(--shadow-soft)] ring-1 ring-black/5",
        on && "bg-sky text-white",
        className,
      )}
      style={{ width: `${size}rem`, height: `${size}rem` }}
    >
      <Volume2 style={{ width: `${size * 0.5}rem`, height: `${size * 0.5}rem` }} strokeWidth={2.6} />
    </button>
  );
}

/* ── Sheets & dialogs ──────────────────────────────────────────────────── */

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
  className,
  wide,
  hideTitle,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
  wide?: boolean;
  hideTitle?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[rgb(35_38_59/0.45)] backdrop-blur-[3px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className={cn(
                  "fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(56rem,94vw)] flex-col overflow-hidden rounded-[2.25rem] bg-paper shadow-2xl outline-none",
                  wide && "w-[min(72rem,96vw)]",
                  className,
                )}
                initial={{ opacity: 0, y: "-44%", x: "-50%", scale: 0.94 }}
                animate={{ opacity: 1, y: "-50%", x: "-50%", scale: 1 }}
                exit={{ opacity: 0, y: "-46%", x: "-50%", scale: 0.96 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              >
                <div className={cn("flex items-center justify-between gap-4 px-8 pt-6 max-md:px-4 max-md:pt-4", hideTitle && "absolute right-0 top-0 z-10")}>
                  <Dialog.Title className={cn("font-display text-[2.6rem] font-black leading-none", hideTitle && "sr-only")}>
                    {title}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close"
                      className="tap grid size-[4rem] shrink-0 place-items-center rounded-full bg-white text-ink shadow-[var(--shadow-soft)]"
                    >
                      <X className="size-8" strokeWidth={3} />
                    </button>
                  </Dialog.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-8 pt-5 max-md:px-4 max-md:pb-6">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

/* ── Bits ──────────────────────────────────────────────────────────────── */

export function PageTitle({ children, emoji, right }: { children: ReactNode; emoji?: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-6">
      <h1 className="flex items-center gap-3 font-display text-[3.4rem] font-black leading-none">
        {emoji && <span className="text-[3rem]">{emoji}</span>}
        {children}
      </h1>
      {right}
    </div>
  );
}

export function Chip({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3.5 py-1 text-[1.15rem] font-extrabold text-ink-2 ring-1 ring-black/5",
        className,
      )}
      style={style}
    >
      {children}
    </span>
  );
}

export function SourceBadge({ source }: { source: "signal" | "pointpals" | "google" | "local" | "sample" | "notion" }) {
  const map = {
    signal: { label: "Synced with SIGNAL", dot: "#7c4dbd" },
    pointpals: { label: "Live from PointPals", dot: "#e0a21c" },
    google: { label: "Google Calendar", dot: "#3a8be0" },
    notion: { label: "From Notion", dot: "#23263b" },
    local: { label: "Saved on this screen", dot: "#8a8597" },
    sample: { label: "Sample data", dot: "#ee7b5b" },
  } as const;
  const m = map[source];
  return (
    <Chip>
      <span className="size-2.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </Chip>
  );
}

/** PointPals illustrated icon, or an emoji when the icon is plain text. */
export function ChoreIcon({ icon, size = 5, className }: { icon: string; size?: number; className?: string }) {
  const url = iconUrl(icon);
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        draggable={false}
        onError={() => setFailed(true)}
        className={cn("pointer-events-none object-contain", className)}
        style={{ width: `${size}rem`, height: `${size}rem` }}
      />
    );
  }
  const emoji = url ? "⭐" : icon;
  return (
    <span className={cn("grid place-items-center leading-none", className)} style={{ width: `${size}rem`, height: `${size}rem`, fontSize: `${size * 0.72}rem` }}>
      {emoji}
    </span>
  );
}

export function EmptyState({ emoji, title, body, action }: { emoji: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <motion.div
        className="text-[5rem] leading-none"
        animate={{ rotate: [-6, 6, -6] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {emoji}
      </motion.div>
      <p className="font-display text-[2.4rem] font-black leading-tight">{title}</p>
      {body && <p className="max-w-[34rem] text-[1.35rem] text-ink-2">{body}</p>}
      {action}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-full bg-white p-1.5 shadow-[var(--shadow-soft)] ring-1 ring-black/5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => {
            sfx.tap();
            onChange(o.value);
          }}
          className={cn(
            "relative flex min-h-[3.6rem] items-center gap-2 rounded-full px-6 text-[1.3rem] font-extrabold text-ink-2 transition-colors",
            value === o.value && "text-white",
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-${options.map((x) => x.value).join("-")}`}
              className="absolute inset-0 rounded-full bg-ink"
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            {o.icon}
            {o.label}
          </span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        sfx.tap();
        onChange(!checked);
      }}
      className="tap flex w-full items-center justify-between gap-6 rounded-[1.5rem] bg-white px-6 py-4 text-left ring-1 ring-black/5"
    >
      <span>
        <span className="block text-[1.4rem] font-extrabold">{label}</span>
        {hint && <span className="block text-[1.15rem] text-ink-2">{hint}</span>}
      </span>
      <span className={cn("relative h-[2.6rem] w-[4.6rem] shrink-0 rounded-full transition-colors", checked ? "bg-sage" : "bg-ink-3/40")}>
        <motion.span
          className="absolute top-[0.3rem] size-[2rem] rounded-full bg-white shadow"
          animate={{ left: checked ? "2.3rem" : "0.3rem" }}
          transition={{ type: "spring", stiffness: 600, damping: 35 }}
        />
      </span>
    </button>
  );
}

export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[1.2rem] font-extrabold text-ink-2">{label}</span>
      <input
        {...props}
        className={cn(
          "h-[4.2rem] w-full rounded-[1.25rem] border-2 border-line bg-white px-5 text-[1.45rem] font-bold outline-none transition-colors focus:border-sky",
          props.className,
        )}
      />
    </label>
  );
}
