import { useMemo } from "react";
import { motion } from "motion/react";
import { PALS } from "@/lib/pals";

const MARBLE_COLOURS = PALS.map((p) => p.color);

/**
 * A glass jar that fills with marbles. Marbles pack in rows from the bottom;
 * the newest one drops in with a little bounce.
 */
export function MarbleJar({
  count,
  target,
  size = 12,
  pending = 0,
}: {
  count: number;
  target: number;
  size?: number;
  pending?: number;
}) {
  const capacity = 36;
  const shown = Math.min(capacity, Math.round((Math.min(count, target) / Math.max(1, target)) * capacity));
  const marbles = useMemo(() => {
    const out: { x: number; y: number; c: string }[] = [];
    const perRow = 6;
    const r = 7.2;
    for (let i = 0; i < shown; i++) {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const offset = row % 2 ? r : 0;
      out.push({
        x: 22 + offset + col * (r * 2 + 0.6) + ((i * 7) % 3) - 1,
        y: 148 - row * (r * 1.8) - ((i * 5) % 2),
        c: MARBLE_COLOURS[(i * 5) % MARBLE_COLOURS.length],
      });
    }
    return out;
  }, [shown]);

  return (
    <svg viewBox="0 0 120 170" style={{ width: `${size * 0.72}rem`, height: `${size}rem` }} aria-hidden>
      <defs>
        <linearGradient id="glass" x1="0" x2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.25" stopColor="#ffffff" stopOpacity="0.25" />
          <stop offset="0.75" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.6" />
        </linearGradient>
        <radialGradient id="shine" cx="0.35" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <clipPath id="jarInside">
          <path d="M18 40 Q14 44 14 52 L14 150 Q14 162 26 162 L94 162 Q106 162 106 150 L106 52 Q106 44 102 40 Z" />
        </clipPath>
      </defs>
      <rect x="26" y="14" width="68" height="16" rx="5" fill="#c99a5b" />
      <rect x="26" y="14" width="68" height="6" rx="3" fill="#ddb57c" />
      <path
        d="M30 30 L90 30 L90 36 Q104 40 106 52 L106 150 Q106 164 92 164 L28 164 Q14 164 14 150 L14 52 Q16 40 30 36 Z"
        fill="#e9f3f7"
        stroke="#b9cfd9"
        strokeWidth="2.5"
      />
      <g clipPath="url(#jarInside)">
        {marbles.map((m, i) => (
          <motion.g
            key={i}
            initial={i === marbles.length - 1 ? { y: -120, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
          >
            <circle cx={m.x} cy={m.y} r="7.2" fill={m.c} />
            <circle cx={m.x} cy={m.y} r="7.2" fill="url(#shine)" />
          </motion.g>
        ))}
        {pending > 0 && (
          <motion.circle
            cx="60"
            cy="70"
            r="7.2"
            fill="none"
            stroke="#ee7b5b"
            strokeWidth="2"
            strokeDasharray="3 3"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        )}
      </g>
      <path
        d="M30 30 L90 30 L90 36 Q104 40 106 52 L106 150 Q106 164 92 164 L28 164 Q14 164 14 150 L14 52 Q16 40 30 36 Z"
        fill="url(#glass)"
      />
      <path d="M22 56 Q20 100 24 140" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.8" fill="none" />
    </svg>
  );
}

export function JarProgress({ count, target }: { count: number; target: number }) {
  const pct = Math.min(100, Math.round((count / Math.max(1, target)) * 100));
  return (
    <div className="h-[1.1rem] w-full overflow-hidden rounded-full bg-black/5">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-sun via-peach to-coral"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}
