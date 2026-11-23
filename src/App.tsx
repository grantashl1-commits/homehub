import { Suspense, lazy, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { useHub } from "@/lib/store";
import { startSignal } from "@/lib/integrations/signal";
import { startPointPals } from "@/lib/integrations/pointpals";
import { AppShell } from "@/components/AppShell";
import { CelebrationLayer } from "@/components/Celebrate";
import { ParentPinPrompt } from "@/components/PinPad";
import Home from "@/pages/Home";
import { KidZone, MePicker } from "@/pages/Me";
import ShoppingList from "@/pages/List";
import Meals from "@/pages/Meals";
import Calendar from "@/pages/Calendar";
import Notes from "@/pages/Notes";
import Reflect from "@/pages/Reflect";
import Habits from "@/pages/Habits";

// Rarely-used screens load on demand so the bench screen starts faster.
const Parent = lazy(() => import("@/pages/Parent"));
const Guest = lazy(() => import("@/pages/Guest"));
const Welcome = lazy(() => import("@/pages/Welcome"));

export default function App() {
  const setupDone = useHub((s) => s.settings.setupDone);
  const guestMode = useHub((s) => s.settings.guestMode);

  useEffect(() => {
    // Guests never get family data, so the connectors don't even start.
    if (guestMode) return;
    startSignal();
    startPointPals();
  }, [guestMode]);

  return (
    <Suspense fallback={<div className="paper-bg h-[100dvh]" />}>
      {guestMode ? (
        <Guest />
      ) : !setupDone ? (
        <Welcome />
      ) : (
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/me" element={<MePicker />} />
            <Route path="/me/:id" element={<KidZone />} />
            <Route path="/list" element={<ShoppingList />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/habits" element={<Habits />} />
            <Route path="/habits/:id" element={<Habits />} />
            <Route path="/reflect" element={<Reflect />} />
            <Route path="/parent" element={<Parent />} />
          </Route>
          <Route path="/kiosk" element={<Navigate to="/" replace />} />
          <Route path="/kids" element={<Navigate to="/me" replace />} />
          <Route path="/guest" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
      <ParentPinPrompt />
      <CelebrationLayer />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            fontSize: "1.35rem",
            fontWeight: 800,
            borderRadius: "1.2rem",
            padding: "1rem 1.4rem",
            fontFamily: "var(--font-sans)",
          },
        }}
      />
    </Suspense>
  );
}
