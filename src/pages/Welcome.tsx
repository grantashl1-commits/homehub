import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { useHub } from "@/lib/store";
import { PALS } from "@/lib/pals";
import { newSalt, sfx, uid } from "@/lib/device";
import type { Member } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { BigButton, Field } from "@/components/ui";
import { makePinHash } from "@/components/PinPad";
import { PhotoAvatarButton } from "@/components/PhotoPicker";
import { cn } from "@/lib/utils";

/** First run: name the family, add everyone, choose a parent PIN. */
export default function Welcome() {
  const s = useHub((x) => x.settings);
  const members = useHub((x) => x.members);
  const { updateSettings, setMembers, updateMember } = useHub.getState();
  const [step, setStep] = useState(0);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");

  const finish = async () => {
    const salt = newSalt();
    updateSettings({ pinSalt: salt, pinHash: await makePinHash(pin, salt), setupDone: true });
    sfx.success();
  };

  return (
    <div className="paper-bg relative flex h-[100dvh] flex-col items-center justify-center overflow-hidden p-[2.4rem]">
      <div className="pointer-events-none absolute inset-x-0 top-[6%] flex justify-center gap-5 opacity-90">
        {PALS.map((p, i) => (
          <motion.div key={p.id} initial={{ y: -80, opacity: 0 }} animate={{ y: [0, -12, 0], opacity: 1 }} transition={{ y: { duration: 3, repeat: Infinity, delay: i * 0.2 }, opacity: { delay: i * 0.07 } }}>
            <Avatar palId={p.id} size={step === 0 ? 6 : 3.6} />
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="0" className="mt-[8rem] flex flex-col items-center gap-6 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <h1 className="font-display text-[6rem] font-black leading-[0.9]">Welcome to Home Hub</h1>
            <p className="max-w-[46rem] text-[1.8rem] font-bold text-ink-2">Made in Aotearoa for Kiwi whānau: jobs and jars, fridge notes, dinner, the calendar, school terms and our nightly wins.</p>
            <BigButton size="xl" icon={<ArrowRight className="size-10" strokeWidth={3} />} onClick={() => setStep(1)}>
              Let's set it up
            </BigButton>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="1" className="card mt-[6rem] w-[min(64rem,94vw)] p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
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
              <BigButton size="md" disabled={!members.length || members.some((m) => !m.name.trim())} onClick={() => setStep(2)}>
                Next
              </BigButton>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="2" className="card mt-[6rem] w-[min(44rem,94vw)] p-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <h2 className="mb-2 font-display text-[3.2rem] font-black leading-none">Grown-ups' PIN 🔒</h2>
            <p className="mb-5 text-[1.35rem] font-bold text-ink-2">4 to 6 numbers. It unlocks approvals, meal changes, money and settings.</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="PIN" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
              <Field label="Same again" type="password" inputMode="numeric" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} />
            </div>
            {pin2.length >= 4 && pin !== pin2 && <p className="mt-2 text-[1.2rem] font-bold text-coral-ink">Those don't match yet.</p>}
            <div className="mt-6 flex justify-between">
              <BigButton tone="white" size="md" onClick={() => setStep(1)}>
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
