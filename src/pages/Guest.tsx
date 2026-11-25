import { useState } from "react";
import { motion } from "motion/react";
import { ExternalLink, Home, Lock, Wifi, X } from "lucide-react";
import { useHub } from "@/lib/store";
import { useNow } from "@/lib/hooks";
import { formatDateLong, formatTime } from "@/lib/time";
import { describeWeather, useWeather } from "@/lib/integrations/weather";
import { PinPad } from "@/components/PinPad";
import { Sheet } from "@/components/ui";
import { HouseGuide } from "@/components/HouseGuide";
import { DEFAULT_GUIDE } from "@/content/guides";

/**
 * What Airbnb guests see: the interactive house guide is the whole screen
 * (chapters, how-tos, places, check-out), like the One Eleven guest-info page,
 * with the clock, weather and the Wi-Fi from settings. No family data is read
 * or shown here. Owners leave with the PIN.
 */
export default function Guest() {
  const s = useHub((x) => x.settings);
  const update = useHub((x) => x.updateSettings);
  const now = useNow();
  const weather = useWeather();
  const [exiting, setExiting] = useState(false);
  const [reading, setReading] = useState(false);
  const w = weather.data ? describeWeather(weather.data.code, weather.data.isDay) : null;
  const hasPin = !!s.pinHash;

  /** Owners leave through the PIN. With no PIN set there is nothing to prove, so just leave. */
  const leaveGuestMode = () => {
    if (!hasPin) {
      update({ guestMode: false });
      return;
    }
    setExiting(true);
  };

  const owners = (
    <button
      type="button"
      onClick={leaveGuestMode}
      aria-label={hasPin ? "Owners: enter the PIN to leave guest mode" : "Leave guest mode"}
      className="tap flex h-[4.4rem] shrink-0 items-center gap-2 rounded-full bg-white/80 px-4 text-[1.1rem] font-black text-ink-3 ring-1 ring-black/5 max-md:size-[4.4rem] max-md:justify-center max-md:px-0"
    >
      <Lock className="size-5" />
      <span className="max-md:hidden">Owners</span>
    </button>
  );

  const clock = (
    <div className="shrink-0 text-right leading-none max-md:hidden">
      <p className="font-display text-[2.4rem] font-black">{formatTime(now)}</p>
      <p className="mt-1 text-[1.1rem] font-bold text-ink-2">
        {w && weather.data ? `${w.emoji} ${weather.data.temp}° · ` : ""}
        {formatDateLong(now)}
      </p>
    </div>
  );

  if (DEFAULT_GUIDE) {
    return (
      <>
        <HouseGuide
          guide={DEFAULT_GUIDE}
          embedded
          wifi={s.wifiName ? { name: s.wifiName, password: s.wifiPassword } : null}
          aside={
            <>
              {clock}
              {owners}
            </>
          }
        />
        <OwnersSheet open={exiting} onOpenChange={setExiting} onLeave={() => update({ guestMode: false })} />
      </>
    );
  }

  // No built-in guide for this house: a simple welcome with the linked guidebook.
  return (
    <div className="relative flex h-[100dvh] flex-col items-center justify-center gap-5 bg-[linear-gradient(160deg,#f6f1e8_0%,#ece6da_100%)] p-6 text-center text-ink">
      <div className="grid size-[5rem] place-items-center rounded-[1.4rem] bg-[#5f7a64] text-white">
        <Home className="size-9" />
      </div>
      <p className="font-display text-[3.6rem] font-black leading-none max-md:text-[2.8rem]">Welcome to our home</p>
      {s.wifiName && (
        <p className="flex items-center gap-2 text-[1.6rem] font-black">
          <Wifi className="size-6 text-[#5f7a64]" /> {s.wifiName} · <span className="font-mono">{s.wifiPassword}</span>
        </p>
      )}
      {s.guidebookUrl && (
        <button type="button" onClick={() => setReading(true)} className="tap rounded-full bg-[#5f7a64] px-8 py-4 text-[1.6rem] font-black text-white">
          📖 Open the house guide
        </button>
      )}
      <div className="absolute right-4 top-4">{owners}</div>
      {reading && s.guidebookUrl && <GuideReader url={s.guidebookUrl} onClose={() => setReading(false)} />}
      <OwnersSheet open={exiting} onOpenChange={setExiting} onLeave={() => update({ guestMode: false })} />
    </div>
  );
}

function OwnersSheet({ open, onOpenChange, onLeave }: { open: boolean; onOpenChange: (o: boolean) => void; onLeave: () => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Owners only" className="w-[min(36rem,94vw)]">
      <PinPad
        reason="Enter the PIN to leave guest mode"
        onSuccess={() => {
          onOpenChange(false);
          onLeave();
        }}
      />
    </Sheet>
  );
}

/**
 * The house guide, full screen on the hub. PDFs and web pages both work. If
 * the guide's website won't let itself be shown inside another page, guests
 * can still open it in a new tab or scan the QR code.
 */
function GuideReader({ url, onClose }: { url: string; onClose: () => void }) {
  const isPdf = /\.pdf($|[?#])/i.test(url);
  const src = isPdf && !url.includes("#") ? `${url}#view=FitH&toolbar=0` : url;
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-[#23263b]/95 p-[1.6rem]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-3 flex items-center gap-3 text-white">
        <p className="font-display text-[2.4rem] font-black leading-none">📖 House guidebook</p>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="tap ml-auto flex h-[4.8rem] items-center gap-2 rounded-full bg-white/15 px-6 text-[1.4rem] font-black"
        >
          <ExternalLink className="size-6" /> Open in a new tab
        </a>
        <button type="button" onClick={onClose} className="tap flex h-[4.8rem] items-center gap-2 rounded-full bg-white px-6 text-[1.4rem] font-black text-ink">
          <X className="size-6" /> Close
        </button>
      </div>
      <iframe title="House guidebook" src={src} className="min-h-0 flex-1 rounded-[1.6rem] bg-white" />
    </motion.div>
  );
}
