import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, Home, Lock, LockOpen, ShoppingBasket, Smile, StickyNote, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHub } from "@/lib/store";
import { useNow, useShoppingList } from "@/lib/hooks";
import { formatDateLong, formatTime } from "@/lib/time";
import { describeWeather, useWeather } from "@/lib/integrations/weather";
import { requestWakeLock, setSoundsEnabled, sfx } from "@/lib/device";
import { lockParent, requireParent, useParentUnlocked } from "./PinPad";
import { Screensaver, NightClock } from "./Ambient";

const DOCK = [
  { to: "/", label: "Home", icon: Home, color: "var(--coral)", end: true },
  { to: "/me", label: "Me", icon: Smile, color: "#e0a21c" },
  { to: "/list", label: "List", icon: ShoppingBasket, color: "var(--sage)" },
  { to: "/meals", label: "Meals", icon: UtensilsCrossed, color: "var(--peach)" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, color: "var(--sky)" },
  { to: "/notes", label: "Notes", icon: StickyNote, color: "var(--lilac)" },
] as const;

export function AppShell() {
  const { pathname } = useLocation();
  const fullBleed = pathname.startsWith("/reflect");
  useAmbientBehaviour();

  return (
    <div className="paper-bg relative flex h-[100dvh] flex-col overflow-hidden">
      {!fullBleed && <TopBar />}
      {/* Phones scroll the page; the bench and wall screens fit everything on one screen. */}
      <main className={cn("relative min-h-0 flex-1 max-md:overflow-y-auto", !fullBleed && "px-[2.2rem] pb-[8.4rem] max-md:px-3 max-md:pb-[7.4rem]")}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname.split("/")[1] ?? ""}
            className="h-full max-md:h-auto max-md:min-h-full"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      {!fullBleed && <Dock />}
      <AmbientLayers />
    </div>
  );
}

function TopBar() {
  const now = useNow();
  const familyName = useHub((s) => s.settings.familyName);
  const weather = useWeather();
  const unlocked = useParentUnlocked();
  const navigate = useNavigate();
  const w = weather.data ? describeWeather(weather.data.code, weather.data.isDay) : null;

  return (
    <header className="flex h-[5.4rem] shrink-0 items-center justify-between gap-2 px-[2.2rem] pt-[env(safe-area-inset-top)] max-md:h-[4.6rem] max-md:px-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-[3.4rem] shrink-0 place-items-center rounded-[1.1rem] bg-coral text-white shadow-[var(--shadow-glow)]">
          <Home className="size-7" strokeWidth={2.6} />
        </div>
        <div className="min-w-0 leading-none">
          <p className="truncate font-display text-[2.1rem] font-black max-md:text-[1.7rem]">{familyName}</p>
          <p className="text-[1.05rem] font-bold uppercase tracking-[0.12em] text-ink-3">Home Hub</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 max-md:gap-1.5">
        {w && weather.data && (
          <div className="flex items-center gap-2 rounded-full bg-white/80 py-1.5 pl-2.5 pr-5 ring-1 ring-black/5 max-md:pr-3">
            <span className="text-[2rem] leading-none">{w.emoji}</span>
            <span className="text-[1.45rem] font-extrabold">{weather.data.temp}°</span>
            <span className="text-[1.2rem] font-bold text-ink-2 max-md:hidden">Taupō</span>
          </div>
        )}
        <div className="rounded-full bg-white/80 px-5 py-1.5 text-right ring-1 ring-black/5 max-md:px-3">
          <span className="font-display text-[1.9rem] font-black leading-none max-md:text-[1.5rem]">{formatTime(now)}</span>
          <span className="ml-3 text-[1.2rem] font-bold text-ink-2 max-md:hidden">{formatDateLong(now)}</span>
        </div>
        <button
          type="button"
          aria-label={unlocked ? "Lock parent area" : "Parent area"}
          onClick={async () => {
            sfx.tap();
            if (unlocked) {
              navigate("/parent");
              return;
            }
            if (await requireParent("Enter the parent PIN")) navigate("/parent");
          }}
          onDoubleClick={() => unlocked && lockParent()}
          className={cn(
            "tap grid size-[3.6rem] place-items-center rounded-full ring-1 ring-black/5",
            unlocked ? "bg-sage text-white" : "bg-white/80 text-ink-2",
          )}
        >
          {unlocked ? <LockOpen className="size-6" /> : <Lock className="size-6" />}
        </button>
      </div>
    </header>
  );
}

function Dock() {
  const notes = useHub((s) => s.notes);
  const { items } = useShoppingList();
  // Notes on the fridge, the same number the home card shows.
  const onFridge = notes.filter((n) => !n.doneAt).length;
  const listCount = items.filter((i) => !i.checked).length;
  const badges: Record<string, number> = { "/notes": onFridge, "/list": listCount };

  return (
    <nav className="pointer-events-none absolute inset-x-0 bottom-[max(1.1rem,env(safe-area-inset-bottom))] z-30 flex justify-center max-md:bottom-[max(0.6rem,env(safe-area-inset-bottom))] max-md:px-2">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-[2.4rem] bg-white/90 p-2 shadow-[var(--shadow-lift)] ring-1 ring-black/5 backdrop-blur-xl max-md:w-full max-md:justify-between max-md:gap-0.5 max-md:p-1.5">
        {DOCK.map((d) => (
          <NavLink
            key={d.to}
            to={d.to}
            end={"end" in d ? d.end : false}
            onClick={() => sfx.tap()}
            className="relative max-md:flex-1"
          >
            {({ isActive }) => (
              <div className="tap relative flex h-[5.6rem] w-[7.4rem] flex-col items-center justify-center gap-0.5 rounded-[1.8rem] max-md:h-[4.8rem] max-md:w-full">
                {isActive && (
                  <motion.span
                    layoutId="dock-active"
                    className="absolute inset-0 rounded-[1.8rem]"
                    style={{ background: d.color }}
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                  />
                )}
                <d.icon
                  className="relative size-[2.3rem]"
                  strokeWidth={2.5}
                  style={{ color: isActive ? "#fff" : d.color }}
                />
                <span className={cn("relative text-[1.15rem] font-black max-md:text-[0.9rem]", isActive ? "text-white" : "text-ink-2")}>{d.label}</span>
                {!!badges[d.to] && (
                  <span className="absolute right-2 top-1 grid max-md:right-0.5 min-w-[1.7rem] place-items-center rounded-full bg-coral px-1.5 text-[0.95rem] font-black leading-[1.7rem] text-white ring-2 ring-white">
                    {badges[d.to]}
                  </span>
                )}
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

/* ── Idle, night, screensaver, wake lock ───────────────────────────────── */

const useAmbient = { lastTouch: Date.now() };

function useAmbientBehaviour() {
  const settings = useHub((s) => s.settings);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => setSoundsEnabled(settings.sounds), [settings.sounds]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", settings.reducedMotion);
  }, [settings.reducedMotion]);

  useEffect(() => {
    const touch = () => (useAmbient.lastTouch = Date.now());
    window.addEventListener("pointerdown", touch, { passive: true });
    window.addEventListener("keydown", touch);
    const t = window.setInterval(() => {
      const idle = Date.now() - useAmbient.lastTouch;
      const path = pathRef.current;
      const busy = path.startsWith("/reflect");
      if (!busy && path !== "/" && idle > settings.idleHomeMins * 60_000) navigate("/");
    }, 5000);
    return () => {
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      window.clearInterval(t);
    };
  }, [navigate, settings.idleHomeMins]);

  useEffect(() => {
    if (!settings.keepAwake) return;
    let sentinel: Awaited<ReturnType<typeof requestWakeLock>> = null;
    const grab = async () => {
      if (document.visibilityState === "visible") sentinel = await requestWakeLock();
    };
    void grab();
    document.addEventListener("visibilitychange", grab);
    return () => {
      document.removeEventListener("visibilitychange", grab);
      void sentinel?.release();
    };
  }, [settings.keepAwake]);
}

function AmbientLayers() {
  const settings = useHub((s) => s.settings);
  const now = useNow(10_000);
  const { pathname } = useLocation();
  const [mode, setMode] = useState<"none" | "screensaver" | "night">("none");
  const navigate = useNavigate();

  const hour = now.getHours();
  const isNight =
    settings.nightStart > settings.nightEnd
      ? hour >= settings.nightStart || hour < settings.nightEnd
      : hour >= settings.nightStart && hour < settings.nightEnd;
  const isDim = !isNight && hour >= settings.dimStart && hour < settings.nightStart;

  useEffect(() => {
    const idle = Date.now() - useAmbient.lastTouch;
    if (pathname.startsWith("/reflect")) return setMode("none");
    if (isNight && idle > 30_000) setMode("night");
    else if (!isNight && idle > settings.screensaverMins * 60_000) setMode("screensaver");
  }, [now, isNight, settings.screensaverMins, pathname]);

  useEffect(() => {
    document.documentElement.style.filter = isDim ? "brightness(0.9) sepia(0.12)" : "";
  }, [isDim]);

  const wake = () => {
    useAmbient.lastTouch = Date.now();
    setMode("none");
    navigate("/");
  };

  return (
    <AnimatePresence>
      {mode === "screensaver" && <Screensaver key="ss" onWake={wake} />}
      {mode === "night" && <NightClock key="night" onWake={wake} />}
    </AnimatePresence>
  );
}
