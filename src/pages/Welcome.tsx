import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, LogIn, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useHub } from "@/lib/store";
import { PALS } from "@/lib/pals";
import { newSalt, sfx, uid } from "@/lib/device";
import type { Member } from "@/lib/types";
import { accountsConfigured, createFamily, joinFamily, resetPassword, signIn, signUp, useAccount } from "@/lib/account";
import { Avatar } from "@/components/Avatar";
import { BigButton, Field } from "@/components/ui";
import { makePinHash } from "@/components/PinPad";
import { PhotoAvatarButton } from "@/components/PhotoPicker";
import { cn } from "@/lib/utils";

type Step = "start" | "signin" | "signup" | "family" | "people" | "pin";

/**
 * First run: sign in (or create the family account), then name the family,
 * add everyone and choose a parent PIN. Signing in to a family that's already
 * set up skips straight to the hub, because its saved data loads.
 */
export default function Welcome() {
  const s = useHub((x) => x.settings);
  const members = useHub((x) => x.members);
  const { updateSettings, setMembers, updateMember } = useHub.getState();
  const account = useAccount();
  const [step, setStep] = useState<Step>("start");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");

  // Once signed in: no family yet → make or join one; a family that isn't
  // set up yet → carry on with the people step. (A set-up family loads and
  // the app leaves this screen by itself.)
  useEffect(() => {
    if (step !== "signin" && step !== "signup" && step !== "family") return;
    if (!account.userId) return;
    if (!account.household) {
      if (step !== "family") setStep("family");
      return;
    }
    if (account.sync === "saved" && !useHub.getState().settings.setupDone) setStep("people");
  }, [step, account.userId, account.household, account.sync]);

  const finish = async () => {
    const salt = newSalt();
    updateSettings({ pinSalt: salt, pinHash: await makePinHash(pin, salt), setupDone: true });
    sfx.success();
  };

  const card = "card mt-[6rem] p-8";
  const anim = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } };

  return (
    <div className="paper-bg relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden p-[2.4rem]">
      <div className="pointer-events-none absolute inset-x-0 top-[6%] flex justify-center gap-5 opacity-90">
        {PALS.map((p, i) => (
          <motion.div key={p.id} initial={{ y: -80, opacity: 0 }} animate={{ y: [0, -12, 0], opacity: 1 }} transition={{ y: { duration: 3, repeat: Infinity, delay: i * 0.2 }, opacity: { delay: i * 0.07 } }}>
            <Avatar palId={p.id} size={step === "start" ? 6 : 3.6} />
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === "start" && (
          <motion.div key="start" className="mt-[8rem] flex flex-col items-center gap-6 text-center" {...anim}>
            <h1 className="font-display text-[6rem] font-black leading-[0.9]">Welcome to Home Hub</h1>
            <p className="max-w-[46rem] text-[1.8rem] font-bold text-ink-2">Made in Aotearoa for Kiwi whānau: jobs and jars, fridge notes, dinner, the calendar, school terms and our nightly wins.</p>
            {accountsConfigured ? (
              <>
                <div className="flex flex-wrap justify-center gap-4">
                  <BigButton size="xl" icon={<LogIn className="size-10" strokeWidth={3} />} onClick={() => setStep("signin")}>
                    Sign in
                  </BigButton>
                  <BigButton size="xl" tone="white" icon={<Users className="size-10" strokeWidth={3} />} onClick={() => setStep("signup")}>
                    New family
                  </BigButton>
                </div>
                <button type="button" onClick={() => setStep("people")} className="tap text-[1.3rem] font-extrabold text-ink-3 underline underline-offset-4">
                  Just try it on this screen (nothing is saved to an account)
                </button>
              </>
            ) : (
              <BigButton size="xl" icon={<ArrowRight className="size-10" strokeWidth={3} />} onClick={() => setStep("people")}>
                Let's set it up
              </BigButton>
            )}
          </motion.div>
        )}

        {(step === "signin" || step === "signup") && (
          <motion.div key={step} className={cn(card, "w-[min(44rem,94vw)]")} {...anim}>
            <AuthForm mode={step} onBack={() => setStep("start")} onSwitch={() => setStep(step === "signin" ? "signup" : "signin")} />
          </motion.div>
        )}

        {step === "family" && (
          <motion.div key="family" className={cn(card, "w-[min(48rem,94vw)]")} {...anim}>
            <FamilyForm />
          </motion.div>
        )}

        {step === "people" && (
          <motion.div key="people" className={cn(card, "w-[min(64rem,94vw)]")} {...anim}>
            <h2 className="font-display text-[3.2rem] font-black leading-none">Who lives here?</h2>
            <p className="mb-5 mt-2 text-[1.3rem] font-bold text-ink-2">Pick a character for everyone, or tap the camera to use your own photo.</p>
            <Field label="Family name" value={s.familyName} onChange={(e) => updateSettings({ familyName: e.target.value })} placeholder="The Carlsons" />
            <div className="mt-5 flex max-h-[24rem] flex-col gap-3 overflow-y-auto pr-1">
              {members.map((m) => (
                <MemberRow key={m.id} member={m} onChange={(patch) => updateMember(m.id, patch)} onRemove={() => setMembers(members.filter((x) => x.id !== m.id))} />
              ))}
            </div>
            <div className="mt-5 flex justify-between">
              <BigButton tone="white" size="md" icon={<Plus className="size-6" />} onClick={() => setMembers([...members, { id: uid("m"), name: "", role: "child", palId: PALS[members.length % PALS.length].id }])}>
                Add someone
              </BigButton>
              <BigButton size="md" disabled={!members.length || members.some((m) => !m.name.trim())} onClick={() => setStep("pin")}>
                Next
              </BigButton>
            </div>
          </motion.div>
        )}

        {step === "pin" && (
          <motion.div key="pin" className={cn(card, "w-[min(44rem,94vw)]")} {...anim}>
            <h2 className="mb-2 font-display text-[3.2rem] font-black leading-none">Grown-ups' PIN 🔒</h2>
            <p className="mb-5 text-[1.35rem] font-bold text-ink-2">4 to 6 numbers. It unlocks approvals, meal changes, money and settings{account.household ? " on every screen signed in to your family" : ""}.</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="PIN" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
              <Field label="Same again" type="password" inputMode="numeric" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} />
            </div>
            {pin2.length >= 4 && pin !== pin2 && <p className="mt-2 text-[1.2rem] font-bold text-coral-ink">Those don't match yet.</p>}
            <div className="mt-6 flex justify-between">
              <BigButton tone="white" size="md" onClick={() => setStep("people")}>
                Back
              </BigButton>
              <BigButton size="md" disabled={pin.length < 4 || pin !== pin2} onClick={() => void finish()}>
                Finish 🎉
              </BigButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AuthForm({ mode, onBack, onSwitch }: { mode: "signin" | "signup"; onBack: () => void; onSwitch: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [checkEmail, setCheckEmail] = useState(false);
  const signedIn = useAccount((a) => !!a.userId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      if (mode === "signin") await signIn(email.trim(), password);
      else if (!(await signUp(email.trim(), password))) setCheckEmail(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (checkEmail) {
    return (
      <div className="text-center">
        <h2 className="mb-3 font-display text-[3rem] font-black leading-none">Check your email 📬</h2>
        <p className="text-[1.4rem] font-bold text-ink-2">Tap the link we sent to {email}, then come back here and sign in.</p>
        <BigButton className="mt-6" size="md" onClick={onSwitch}>
          Sign in
        </BigButton>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)}>
      <h2 className="mb-2 font-display text-[3.2rem] font-black leading-none">{mode === "signin" ? "Welcome back" : "Make your family account"}</h2>
      <p className="mb-5 text-[1.3rem] font-bold text-ink-2">
        {mode === "signin" ? "Sign in and your family, notes, habits and settings come back on this screen." : "A grown-up's email and a password. You'll use it to sign in on other screens and phones."}
      </p>
      <div className="flex flex-col gap-4">
        <Field label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Field label="Password" type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <p className="mt-3 text-[1.2rem] font-bold text-coral-ink">{error}</p>}
      {signedIn && <p className="mt-3 text-[1.2rem] font-bold text-ink-2">Loading your family…</p>}
      <div className="mt-6 flex items-center justify-between gap-3">
        <BigButton tone="white" size="md" onClick={onBack}>
          Back
        </BigButton>
        <BigButton size="md" type="submit" disabled={busy || !email || password.length < (mode === "signup" ? 8 : 1)}>
          {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </BigButton>
      </div>
      <div className="mt-5 flex justify-between text-[1.15rem] font-extrabold text-ink-3">
        <button type="button" className="tap underline underline-offset-4" onClick={onSwitch}>
          {mode === "signin" ? "New here? Make a family account" : "Already have one? Sign in"}
        </button>
        {mode === "signin" && (
          <button
            type="button"
            className="tap underline underline-offset-4"
            onClick={async () => {
              if (!email) return setError("Type your email first.");
              try {
                await resetPassword(email.trim());
                toast.success("Check your email for a reset link");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Couldn't send that");
              }
            }}
          >
            Forgot password?
          </button>
        )}
      </div>
    </form>
  );
}

function FamilyForm() {
  const familyName = useHub((x) => x.settings.familyName);
  const [name, setName] = useState(familyName === "Our Family" ? "" : familyName);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <h2 className="mb-2 font-display text-[3.2rem] font-black leading-none">Your family</h2>
      <p className="mb-5 text-[1.3rem] font-bold text-ink-2">Start a new family, or join one with the code from the grown-up who made it.</p>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Field label="Family name" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Carlsons" />
        </div>
        <BigButton
          size="md"
          disabled={busy || !name.trim()}
          onClick={() =>
            void run(async () => {
              useHub.getState().updateSettings({ familyName: name.trim() });
              await createFamily(name);
            })
          }
        >
          Start
        </BigButton>
      </div>
      <div className="my-6 h-px bg-line" />
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Field label="Join code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC234" className="tracking-[0.3em]" />
        </div>
        <BigButton size="md" tone="white" disabled={busy || code.trim().length < 6} onClick={() => void run(() => joinFamily(code))}>
          Join
        </BigButton>
      </div>
    </div>
  );
}

function MemberRow({ member, onChange, onRemove }: { member: Member; onChange: (p: Partial<Member>) => void; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-[1.5rem] bg-paper p-3">
      <PhotoAvatarButton member={member} size={4.4} onPhoto={(photo) => onChange({ photo })} />
      <input
        value={member.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Name"
        className="h-[4rem] w-[12rem] rounded-[1rem] border-2 border-line bg-white px-3 text-[1.5rem] font-black outline-none focus:border-sky"
      />
      <div className="flex rounded-full bg-white p-1 ring-1 ring-black/5">
        {(["parent", "child"] as const).map((r) => (
          <button key={r} type="button" onClick={() => onChange({ role: r })} className={cn("h-[3rem] rounded-full px-3 text-[1.1rem] font-black", member.role === r ? "bg-ink text-white" : "text-ink-2")}>
            {r === "parent" ? "Grown-up" : "Kid"}
          </button>
        ))}
      </div>
      <div className="flex flex-1 flex-wrap gap-1">
        {PALS.map((p) => (
          <button key={p.id} type="button" title={p.name} onClick={() => onChange({ palId: p.id, photo: undefined })} className={cn("rounded-full p-0.5", !member.photo && member.palId === p.id && "ring-[0.2rem] ring-ink")}>
            <Avatar palId={p.id} size={2.4} />
          </button>
        ))}
      </div>
      <button type="button" aria-label="Remove" onClick={onRemove} className="tap grid size-[3.2rem] place-items-center rounded-full bg-white text-ink-3">
        <Trash2 className="size-5" />
      </button>
    </div>
  );
}
