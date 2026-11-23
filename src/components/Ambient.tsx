import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useHub } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { formatDateLong, formatTime, relativeDayLabel } from "@/lib/time";
import { mediaUrl } from "@/lib/media";
import { eventStart, useCalendar } from "@/lib/integrations/calendar";
import { describeWeather, useWeather } from "@/lib/integrations/weather";
import { Avatar } from "./Avatar";

/** Family photos (added in Parent → Photos) with a clock, or a calm animated scene. */
export function Screensaver({ onWake }: { onWake: () => void }) {
  const photos = useHub((s) => s.photos);
  const members = useHub((s) => s.members);
  const now = useNow(15_000);
  const { events } = useCalendar();
  const next = events.find((e) => eventStart(e) > now);
  const [index, setIndex] = useState(0);
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!photos.length) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % photos.length), 9000);
    return () => window.clearInterval(t);
  }, [photos.length]);

  useEffect(() => {
    const p = photos[index % Math.max(1, photos.length)];
    if (p) void mediaUrl(p.mediaId).then(setUrl);
  }, [index, photos]);

  const photo = photos[index % Math.max(1, photos.length)];

  return (
    <motion.button
      type="button"
      aria-label="Wake up"
      onClick={onWake}
      className="fixed inset-0 z-[90] overflow-hidden bg-night text-left"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {photo && url ? (
        <AnimatePresence>
          {photo.kind === "video" ? (
            <motion.video
              key={photo.id}
              src={url}
              autoPlay
              muted
              playsInline
              loop
              className="absolute inset-0 size-full object-cover"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4 }}
            />
          ) : (
            <motion.img
              key={photo.id}
              src={url}
              alt=""
              className="absolute inset-0 size-full object-cover"
              initial={{ opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1.14 }}
              exit={{ opacity: 0 }}
              transition={{ opacity: { duration: 1.4 }, scale: { duration: 10, ease: "linear" } }}
            />
          )}
        </AnimatePresence>
      ) : (
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 60% at 20% 20%, #f6a96b 0%, transparent 60%), radial-gradient(60% 60% at 80% 30%, #a48ad8 0%, transparent 60%), radial-gradient(70% 70% at 50% 100%, #64a3d8 0%, transparent 60%), #2b2f4a",
            backgroundSize: "140% 140%",
          }}
          animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      {!photo && (
        <div className="absolute inset-x-0 top-[18%] flex justify-center gap-6">
          {members.map((m, i) => (
            <motion.div key={m.id} animate={{ y: [0, -14, 0] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.35 }}>
              <Avatar member={m} size={7} />
            </motion.div>
          ))}
        </div>
      )}
      <div className="absolute bottom-[3.5rem] left-[3.5rem] text-white">
        <p className="font-display text-[9rem] font-black leading-[0.9] drop-shadow-lg">{formatTime(now)}</p>
        <p className="mt-2 text-[2rem] font-bold opacity-90">{formatDateLong(now)}</p>
        {next && (
          <p className="mt-4 inline-flex items-center gap-3 rounded-full bg-white/20 px-6 py-2 text-[1.6rem] font-bold backdrop-blur">
            Next: {next.title} · {relativeDayLabel(eventStart(next))}
            {!next.allDay && ` ${formatTime(eventStart(next))}`}
          </p>
        )}
      </div>
      <p className="absolute bottom-[3.5rem] right-[3.5rem] text-[1.3rem] font-bold text-white/70">Tap anywhere to wake</p>
    </motion.button>
  );
}

export function NightClock({ onWake }: { onWake: () => void }) {
  const now = useNow(15_000);
  const weather = useWeather();
  const t = weather.data?.tomorrow;
  const w = t ? describeWeather(t.code) : null;
  return (
    <motion.button
      type="button"
      aria-label="Wake up"
      onClick={onWake}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-4 bg-[#0d1020] text-[#e9b98a]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2 }}
    >
      <motion.span
        className="text-[5rem] leading-none"
        animate={{ y: [0, -8, 0], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity }}
      >
        🌙
      </motion.span>
      <p className="font-display text-[11rem] font-black leading-none opacity-80">{formatTime(now)}</p>
      <p className="text-[1.8rem] font-bold opacity-60">Sleep tight</p>
      {w && t && (
        <p className="mt-6 text-[1.5rem] font-bold opacity-50">
          Tomorrow {w.emoji} {w.label.toLowerCase()}, {t.high}°
        </p>
      )}
    </motion.button>
  );
}
