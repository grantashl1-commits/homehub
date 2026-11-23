import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { pal, palArt } from "@/lib/pals";
import type { Member } from "@/lib/types";

interface Props {
  member?: Member;
  palId?: string;
  size?: number;
  className?: string;
  ring?: boolean;
  badge?: number | string;
  /** Badge colour: coral for new notes, ink for jobs waiting. */
  tone?: "coral" | "ink";
  float?: boolean;
  label?: boolean;
  dim?: boolean;
  /** A photo to show instead of the character (defaults to the member's own). */
  photo?: string;
}

/** A PointPals character (or the person's own photo) in a soft coloured circle. Size is in rem. */
export function Avatar({ member, palId, size = 4, className, ring, badge, tone = "coral", float, label, dim, photo }: Props) {
  const p = pal(member?.palId ?? palId);
  const src = photo ?? member?.photo;
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <div
        className={cn(
          "relative grid place-items-center rounded-full",
          ring && "ring-[0.3rem] ring-white shadow-[var(--shadow-lift)]",
          dim && "opacity-40 grayscale",
        )}
        style={{
          width: `${size}rem`,
          height: `${size}rem`,
          background: `radial-gradient(circle at 35% 30%, #fff 0%, ${p.tint} 45%, ${p.color} 100%)`,
        }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute left-[7%] top-[7%] h-[86%] w-[86%] rounded-full object-cover"
          />
        ) : (
        <motion.div
          className="absolute inset-0 grid place-items-center"
          animate={float ? { y: [0, -size * 1.2, 0] } : undefined}
          transition={float ? { duration: 3.6, repeat: Infinity, ease: "easeInOut" } : undefined}
        >
          {failed ? (
            <PalFace color={p.color} shade={p.shade} size={size} />
          ) : (
            <img
              src={palArt(p.id)}
              alt=""
              draggable={false}
              onError={() => setFailed(true)}
              className="pointer-events-none h-[118%] w-[118%] max-w-none object-contain drop-shadow-[0_0.3rem_0.4rem_rgb(0_0_0/0.12)]"
              style={{ marginTop: "-6%" }}
            />
          )}
        </motion.div>
        )}
        {badge !== undefined && badge !== 0 && (
          <span
            className={cn(
              // Sits on the white ring at the top-right, not over the face.
              "absolute -right-[0.75rem] -top-[0.75rem] z-10 grid min-w-[1.55rem] place-items-center rounded-full px-[0.3rem] font-black leading-[1.55rem] text-white shadow-[0_2px_6px_rgb(0_0_0/0.18)] ring-[0.18rem] ring-white",
              tone === "ink" ? "bg-ink" : "bg-coral",
            )}
            style={{ fontSize: `${Math.min(1.05, Math.max(0.9, size * 0.2))}rem` }}
          >
            {badge}
          </span>
        )}
      </div>
      {label && (
        <span className="mt-1.5 max-w-[8rem] truncate text-[1.25rem] font-extrabold" style={{ color: p.ink }}>
          {member?.name ?? p.name}
        </span>
      )}
    </div>
  );
}

/** Friendly fallback face when the character art can't load. */
function PalFace({ color, shade, size }: { color: string; shade: string; size: number }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: `${size * 0.82}rem`, height: `${size * 0.82}rem` }} aria-hidden>
      <ellipse cx="50" cy="56" rx="38" ry="36" fill={color} />
      <ellipse cx="50" cy="60" rx="26" ry="22" fill="#fff" opacity="0.35" />
      <circle cx="26" cy="26" r="9" fill={color} />
      <circle cx="74" cy="26" r="9" fill={color} />
      <circle cx="38" cy="52" r="5" fill="#2b2b3a" />
      <circle cx="62" cy="52" r="5" fill="#2b2b3a" />
      <circle cx="39.5" cy="50.5" r="1.6" fill="#fff" />
      <circle cx="63.5" cy="50.5" r="1.6" fill="#fff" />
      <path d="M41 64 Q50 72 59 64" stroke="#2b2b3a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="30" cy="63" r="5" fill={shade} opacity="0.45" />
      <circle cx="70" cy="63" r="5" fill={shade} opacity="0.45" />
    </svg>
  );
}

export function AvatarStack({ members, size = 2.4 }: { members: Member[]; size?: number }) {
  return (
    <div className="flex items-center">
      {members.map((m, i) => (
        <div key={m.id} style={{ marginLeft: i ? `-${size * 0.3}rem` : 0, zIndex: members.length - i }}>
          <Avatar member={m} size={size} ring />
        </div>
      ))}
    </div>
  );
}
