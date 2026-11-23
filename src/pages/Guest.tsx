import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { motion } from "motion/react";
import { Flame, Home, LogOut, MapPin, Refrigerator, Wifi } from "lucide-react";
import { useHub } from "@/lib/store";
import { clearGuestOnly } from "@/lib/guest";
import { useNow } from "@/lib/hooks";
import { formatDateLong, formatTime } from "@/lib/time";
import { describeWeather, useWeather } from "@/lib/integrations/weather";
import { PinPad } from "@/components/PinPad";
import { Sheet } from "@/components/ui";

/** What Airbnb guests see. No family data is read or shown here. */
export default function Guest({ guestOnly = false }: { guestOnly?: boolean }) {
  const s = useHub((x) => x.settings);
  const update = useHub((x) => x.updateSettings);
  const now = useNow();
  const weather = useWeather();
  const [wifiQr, setWifiQr] = useState<string>();
  const [guideQr, setGuideQr] = useState<string>();
  const [open, setOpen] = useState<null | keyof typeof s.houseGuide>(null);
  const [exiting, setExiting] = useState(false);
  const hold = useRef<number | undefined>(undefined);
  const w = weather.data ? describeWeather(weather.data.code, weather.data.isDay) : null;

  useEffect(() => {
    const esc = (v: string) => v.replace(/([\\;,:"])/g, "\\$1");
    if (s.wifiName)
      void QRCode.toDataURL(`WIFI:T:WPA;S:${esc(s.wifiName)};P:${esc(s.wifiPassword)};;`, { margin: 1, width: 360, color: { dark: "#23263b", light: "#ffffff" } }).then(setWifiQr);
    if (s.guidebookUrl) void QRCode.toDataURL(s.guidebookUrl, { margin: 1, width: 360, color: { dark: "#23263b", light: "#ffffff" } }).then(setGuideQr);
  }, [s.wifiName, s.wifiPassword, s.guidebookUrl]);

  const sections = [
    { key: "checkout" as const, title: "Checkout", icon: LogOut },
    { key: "heating" as const, title: "Heating", icon: Flame },
    { key: "appliances" as const, title: "Kitchen & appliances", icon: Refrigerator },
    { key: "local" as const, title: "Local tips", icon: MapPin },
  ];

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[linear-gradient(160deg,#f6f1e8_0%,#ece6da_100%)] p-[2.4rem] text-ink">
      <button
        type="button"
        aria-label="Owner menu (hold)"
        onPointerDown={() => (hold.current = window.setTimeout(() => setExiting(true), 1600))}
        onPointerUp={() => window.clearTimeout(hold.current)}
        onPointerLeave={() => window.clearTimeout(hold.current)}
        className="absolute left-0 top-0 size-[6rem] opacity-0"
      />
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="grid size-[4.4rem] place-items-center rounded-[1.4rem] bg-[#5f7a64] text-white">
            <Home className="size-8" />
          </div>
          <div>
            <p className="font-display text-[3.6rem] font-black leading-none">Welcome to our home</p>
            <p className="text-[1.4rem] font-bold text-ink-2">Make yourselves comfortable. We hope you love Taupō.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-[3.2rem] font-black leading-none">{formatTime(now)}</p>
          <p className="text-[1.3rem] font-bold text-ink-2">{formatDateLong(now)}</p>
          {w && weather.data && (
            <p className="mt-1 text-[1.4rem] font-extrabold">
              {w.emoji} {weather.data.temp}° · {w.label}
            </p>
          )}
        </div>
      </header>

      <div className="mt-8 grid min-h-0 flex-1 grid-cols-[1fr_1fr_1.3fr] gap-[1.4rem]">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center gap-3 rounded-[2rem] bg-white p-6 text-center shadow-[var(--shadow-soft)]">
          <Wifi className="size-10 text-[#5f7a64]" />
          <p className="font-display text-[2.4rem] font-black leading-none">Wi-Fi</p>
          {wifiQr ? <img src={wifiQr} alt="Scan to join the Wi-Fi" className="w-[13rem] rounded-xl" /> : <div className="grid h-[13rem] w-[13rem] place-items-center rounded-xl bg-paper text-[1.2rem] font-bold text-ink-3">Add Wi-Fi in settings</div>}
          {s.wifiName && <p className="text-[1.5rem] font-black">{s.wifiName}</p>}
          {s.wifiPassword && <p className="rounded-full bg-paper px-4 py-1 font-mono text-[1.4rem] font-bold">{s.wifiPassword}</p>}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="flex flex-col items-center justify-center gap-3 rounded-[2rem] bg-[#5f7a64] p-6 text-center text-white shadow-[var(--shadow-soft)]">
          <p className="text-[3rem] leading-none">📖</p>
          <p className="font-display text-[2.4rem] font-black leading-none">House guidebook</p>
          {guideQr ? <img src={guideQr} alt="Scan to open the guidebook" className="w-[13rem] rounded-xl" /> : <div className="grid h-[13rem] w-[13rem] place-items-center rounded-xl bg-white/15 text-[1.2rem] font-bold">Add the link in settings</div>}
          <p className="text-[1.3rem] font-bold opacity-85">Scan with your phone for everything about the house</p>
        </motion.div>
        <div className="grid grid-cols-2 gap-[1.4rem]">
          {sections.map((sec, i) => (
            <motion.button
              key={sec.key}
              type="button"
              onClick={() => setOpen(sec.key)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="tap flex flex-col items-start justify-between rounded-[2rem] bg-white p-5 text-left shadow-[var(--shadow-soft)]"
            >
              <sec.icon className="size-9 text-[#5f7a64]" />
              <span className="font-display text-[2rem] font-black leading-tight">{sec.title}</span>
            </motion.button>
          ))}
        </div>
      </div>
      <p className="mt-5 text-center text-[1.2rem] font-bold text-ink-3">Need anything? Message us through Airbnb and we'll get straight back to you.</p>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)} title={sections.find((x) => x.key === open)?.title ?? ""}>
        <p className="whitespace-pre-line text-[1.6rem] font-bold leading-relaxed">{open ? s.houseGuide[open] : ""}</p>
      </Sheet>
      <Sheet open={exiting} onOpenChange={setExiting} title="Owners only" className="w-[min(36rem,94vw)]">
        <PinPad
          reason="Enter the PIN to leave guest mode"
          onSuccess={() => {
            setExiting(false);
            if (guestOnly) {
              clearGuestOnly();
              window.location.reload();
            } else {
              update({ guestMode: false });
            }
          }}
        />
      </Sheet>
    </div>
  );
}
