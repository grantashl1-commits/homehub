import { useShallow } from "zustand/react/shallow";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarCheck2,
  Check,
  Image as ImageIcon,
  KeyRound,
  ListTodo,
  Lock,
  Plug,
  Plus,
  Settings as SettingsIcon,
  Star,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useHub, DEFAULT_MEMBERS } from "@/lib/store";
import { PALS } from "@/lib/pals";
import { newSalt, sfx, uid } from "@/lib/device";
import { saveMedia, resizeImage, deleteMedia, mediaUrl } from "@/lib/media";
import { DAY_PART_TIMES, formatDateShort, fromDateKey, relativeDayLabel, timeAgo } from "@/lib/time";
import type { Claim, KidPlan, Member } from "@/lib/types";
import { pointpalsAward, pointpalsConfigured, pointpalsSignIn, pointpalsSignOut, usePointPals } from "@/lib/integrations/pointpals";
import { signalConfigured, signalSignIn, signalSignOut, useSignal } from "@/lib/integrations/signal";
import { EXPENSE_CATEGORIES, notionAction, useNotion } from "@/lib/integrations/notion";
import { useCalendar } from "@/lib/integrations/calendar";
import { useSlideshow } from "@/lib/integrations/slideshow";
import { Avatar } from "@/components/Avatar";
import { PhotoAvatarButton, PhotoTile } from "@/components/PhotoPicker";
import { BigButton, ChoreIcon, EmptyState, Field, Toggle } from "@/components/ui";
import { PinPad, lockParent, makePinHash, useParentUnlocked } from "@/components/PinPad";
import { AudioPlayer } from "@/components/Voice";
import { celebrate } from "@/components/Celebrate";
import { cn } from "@/lib/utils";

const NO_KIDS: import("@/lib/integrations/pointpals").PPKid[] = [];

type Tab = "approvals" | "family" | "money" | "todos" | "photos" | "connections" | "settings";

export default function Parent() {
  const unlocked = useParentUnlocked();
  const navigate = useNavigate();
  if (!unlocked) {
    return (
      <div className="grid h-full place-items-center">
        <div className="card flex items-center gap-10 px-10 py-6">
          <div className="flex max-w-[18rem] flex-col gap-4">
            <span className="text-[4rem] leading-none">🔒</span>
            <h1 className="font-display text-[3rem] font-black leading-[1.05]">Grown-ups only</h1>
            <p className="text-[1.3rem] font-semibold text-ink-2">Approvals, money, connections and settings live in here.</p>
            <button type="button" onClick={() => navigate("/")} className="self-start text-[1.3rem] font-extrabold text-ink-2 underline">
              Back home
            </button>
          </div>
          <PinPad onSuccess={() => undefined} />
        </div>
      </div>
    );
  }
  return <ParentArea />;
}

function ParentArea() {
  const [tab, setTab] = useState<Tab>("approvals");
  const navigate = useNavigate();
  const pending = useHub((s) => s.claims.filter((c) => c.status === "pending").length + s.kidPlans.filter((p) => !p.addedToCalendar).length);
  const tabs: { id: Tab; label: string; icon: typeof Star; badge?: number }[] = [
    { id: "approvals", label: "Approvals", icon: Star, badge: pending },
    { id: "family", label: "Family", icon: Users },
    { id: "money", label: "Money", icon: Wallet },
    { id: "todos", label: "To-dos", icon: ListTodo },
    { id: "photos", label: "Photos", icon: ImageIcon },
    { id: "connections", label: "Connections", icon: Plug },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];
  return (
    <div className="grid h-full grid-cols-[15rem_minmax(0,1fr)] gap-[1.3rem]">
      <nav className="flex flex-col gap-1.5 rounded-[2rem] bg-white/80 p-2.5 ring-1 ring-black/5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              sfx.tap();
              setTab(t.id);
            }}
            className={cn(
              "tap relative flex min-h-[3.8rem] items-center gap-3 rounded-[1.3rem] px-4 text-[1.3rem] font-extrabold",
              tab === t.id ? "bg-ink text-white" : "text-ink-2 hover:bg-black/5",
            )}
          >
            <t.icon className="size-6" />
            {t.label}
            {!!t.badge && <span className="ml-auto rounded-full bg-coral px-2 text-[1rem] font-black text-white">{t.badge}</span>}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            lockParent();
            navigate("/");
          }}
          className="tap mt-auto flex min-h-[3.8rem] items-center gap-3 rounded-[1.3rem] bg-coral-tint px-4 text-[1.3rem] font-extrabold text-coral-ink"
        >
          <Lock className="size-6" /> Lock
        </button>
      </nav>
      <div className="card min-h-0 overflow-y-auto p-7 no-scrollbar">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {tab === "approvals" && <Approvals />}
            {tab === "family" && <Family />}
            {tab === "money" && <Money />}
            {tab === "todos" && <Todos />}
            {tab === "photos" && <Photos />}
            {tab === "connections" && <Connections />}
            {tab === "settings" && <SettingsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function H({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="font-display text-[2.8rem] font-black leading-none">{children}</h2>
      {right}
    </div>
  );
}

/* ── Approvals ─────────────────────────────────────────────────────────── */

function Approvals() {
  const claims = useHub(useShallow((s) => s.claims.filter((c) => c.status === "pending")));
  const plans = useHub(useShallow((s) => s.kidPlans.filter((p) => !p.addedToCalendar)));
  const members = useHub((s) => s.members);
  const [busy, setBusy] = useState<string>();

  const approve = async (c: Claim) => {
    const m = members.find((x) => x.id === c.memberId);
    setBusy(c.id);
    try {
      if (c.source === "pointpals" && m?.pointpalsKidId) {
        await pointpalsAward(m.pointpalsKidId, { name: c.choreName, icon: c.choreIcon, points: c.points });
      } else {
        useHub.getState().addLocalMarbles(c.memberId, c.points);
      }
      useHub.getState().resolveClaim(c.id, "approved");
      sfx.marble();
      celebrate({ title: `+${c.points} for ${m?.name ?? "them"}!`, subtitle: c.choreName, palId: m?.palId, photo: m?.photo });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PointPals didn't accept that");
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <div>
      <H
        right={
          claims.length > 1 && (
            <BigButton
              tone="sage"
              size="md"
              onClick={async () => {
                for (const c of claims) await approve(c);
              }}
            >
              Approve all
            </BigButton>
          )
        }
      >
        Jobs to approve
      </H>
      {claims.length === 0 ? (
        <EmptyState emoji="🌟" title="All caught up" body="When the kids tap “I did it!”, their jobs land here." />
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence>
            {claims.map((c) => {
              const m = members.find((x) => x.id === c.memberId);
              return (
                <motion.div key={c.id} layout exit={{ opacity: 0, x: 60 }} className="flex items-center gap-4 rounded-[1.6rem] bg-paper p-4">
                  {m && <Avatar member={m} size={4.4} />}
                  <ChoreIcon icon={c.choreIcon} size={4.4} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[1.5rem] font-extrabold">
                      {m?.name}: {c.choreName}
                    </p>
                    <p className="text-[1.15rem] font-bold text-ink-2">
                      +{c.points} · {timeAgo(c.at)} · {c.source === "pointpals" ? "goes to PointPals" : "hub marbles"}
                    </p>
                  </div>
                  <BigButton tone="white" size="md" onClick={() => useHub.getState().resolveClaim(c.id, "rejected")}>
                    Not yet
                  </BigButton>
                  <BigButton tone="sage" size="md" disabled={busy === c.id} icon={<Check className="size-6" strokeWidth={3} />} onClick={() => void approve(c)}>
                    Approve
                  </BigButton>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <div className="mt-8">
        <H>New for the calendar</H>
        {plans.length === 0 ? (
          <p className="text-[1.3rem] font-bold text-ink-3">Nothing new from the kids or snapped notices.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {plans.map((p) => (
              <KidPlanRow key={p.id} plan={p} members={members} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function googleTemplateUrl(p: KidPlan): string {
  const start = fromDateKey(p.date);
  const [h, m] = (p.time ?? `${DAY_PART_TIMES[p.part].hour}:00`).split(":").map(Number);
  start.setHours(h, m || 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60000);
  if (p.endTime) {
    const [eh, em] = p.endTime.split(":").map(Number);
    end.setTime(new Date(start).setHours(eh, em || 0, 0, 0));
  }
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `${p.emoji} ${p.title}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: p.createdBy === "snap" ? "Read off a notice by Home Hub" : "Added by the kids on Home Hub",
    ...(p.location ? { location: p.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

function KidPlanRow({ plan, members }: { plan: KidPlan; members: Member[] }) {
  const ms = members.filter((m) => plan.memberIds.includes(m.id));
  return (
    <div className="flex items-center gap-4 rounded-[1.6rem] bg-sky-tint p-4">
      <span className="text-[3rem] leading-none">{plan.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[1.45rem] font-extrabold">{plan.title}</p>
        <p className="text-[1.15rem] font-bold text-ink-2">
          {relativeDayLabel(fromDateKey(plan.date))} {plan.time ?? DAY_PART_TIMES[plan.part].label.toLowerCase()} · {formatDateShort(fromDateKey(plan.date))}
          {plan.location && ` · ${plan.location}`}
        </p>
        {plan.voiceMediaId && <AudioPlayer mediaId={plan.voiceMediaId} color="var(--sky)" className="mt-2" />}
      </div>
      <div className="flex -space-x-2">
        {ms.map((m) => (
          <Avatar key={m.id} member={m} size={3} />
        ))}
      </div>
      <a
        href={googleTemplateUrl(plan)}
        target="_blank"
        rel="noreferrer"
        onClick={() => useHub.getState().markPlanAdded(plan.id)}
        className="tap flex min-h-[4rem] items-center gap-2 rounded-[1.2rem] bg-sky px-5 text-[1.25rem] font-black text-white"
      >
        <CalendarCheck2 className="size-6" /> Add to Google
      </a>
      <button type="button" aria-label="Remove" onClick={() => useHub.getState().removeKidPlan(plan.id)} className="tap grid size-[4rem] place-items-center rounded-full bg-white">
        <Trash2 className="size-6" />
      </button>
    </div>
  );
}

/* ── Family ────────────────────────────────────────────────────────────── */

function Family() {
  const members = useHub((s) => s.members);
  const setMembers = useHub((s) => s.setMembers);
  const updateMember = useHub((s) => s.updateMember);
  const ppKids = usePointPals((s) => (s.userId ? s.kids : NO_KIDS));

  const importKids = () => {
    const parents = members.filter((m) => m.role === "parent");
    const kids: Member[] = ppKids.map((k, i) => ({
      id: members.find((m) => m.pointpalsKidId === k.id)?.id ?? uid("kid"),
      name: k.name,
      role: "child",
      palId: (PALS.find((p) => p.id === k.avatarKey)?.id ?? PALS[(i + 2) % PALS.length].id),
      pointpalsKidId: k.id,
    }));
    setMembers([...parents, ...kids]);
    toast.success(`Brought in ${kids.length} kids from PointPals`);
  };

  return (
    <div>
      <H
        right={
          <div className="flex gap-3">
            {ppKids.length > 0 && (
              <BigButton tone="sun" size="md" onClick={importKids}>
                Use PointPals kids
              </BigButton>
            )}
            <BigButton
              tone="ink"
              size="md"
              icon={<Plus className="size-6" />}
              onClick={() => setMembers([...members, { id: uid("m"), name: "New", role: "child", palId: PALS[members.length % PALS.length].id }])}
            >
              Add person
            </BigButton>
          </div>
        }
      >
        Our family
      </H>
      <div className="flex flex-col gap-4">
        {members.map((m) => (
          <div key={m.id} className="rounded-[1.8rem] bg-paper p-5">
            <div className="flex items-center gap-4">
              <PhotoAvatarButton member={m} size={5} onPhoto={(photo) => updateMember(m.id, { photo })} />
              <input
                value={m.name}
                onChange={(e) => updateMember(m.id, { name: e.target.value })}
                className="h-[4.2rem] w-[11rem] min-w-0 rounded-[1.2rem] border-2 border-line bg-white px-4 font-display text-[2rem] font-black outline-none focus:border-sky"
              />
              <div className="flex shrink-0 whitespace-nowrap rounded-full bg-white p-1 ring-1 ring-black/5">
                {(["parent", "child"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => updateMember(m.id, { role: r })}
                    className={cn("h-[3.2rem] rounded-full px-4 text-[1.2rem] font-black", m.role === r ? "bg-ink text-white" : "text-ink-2")}
                  >
                    {r === "parent" ? "Grown-up" : "Kid"}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-[1.15rem] font-extrabold text-ink-2">
                🎂
                <input
                  type="date"
                  value={m.birthday ? `2000-${m.birthday}` : ""}
                  onChange={(e) => updateMember(m.id, { birthday: e.target.value ? e.target.value.slice(5) : undefined })}
                  className="h-[3.6rem] rounded-[1rem] border-2 border-line bg-white px-2 text-[1.15rem] font-bold"
                  aria-label={`${m.name}'s birthday`}
                />
              </label>
              {m.role === "child" && ppKids.length > 0 && (
                <select
                  value={m.pointpalsKidId ?? ""}
                  onChange={(e) => updateMember(m.id, { pointpalsKidId: e.target.value || undefined })}
                  className="h-[3.6rem] rounded-[1rem] border-2 border-line bg-white px-3 text-[1.2rem] font-bold"
                >
                  <option value="">Not linked to PointPals</option>
                  {ppKids.map((k) => (
                    <option key={k.id} value={k.id}>
                      PointPals: {k.name}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                aria-label={`Remove ${m.name}`}
                onClick={() => members.length > 1 && setMembers(members.filter((x) => x.id !== m.id))}
                className="tap ml-auto grid size-[3.6rem] shrink-0 place-items-center rounded-full bg-white text-ink-3"
              >
                <Trash2 className="size-6" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <PhotoTile member={m} size={3.2} onPhoto={(photo) => updateMember(m.id, { photo })} />
              {PALS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => updateMember(m.id, { palId: p.id, photo: undefined })}
                  className={cn("tap rounded-full p-0.5", !m.photo && m.palId === p.id && "ring-[0.25rem] ring-ink")}
                  aria-label={p.name}
                  title={`${p.name} · ${p.value}`}
                >
                  <Avatar palId={p.id} size={3.2} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Money (Notion) ────────────────────────────────────────────────────── */

function Money() {
  const notion = useNotion(true);
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [paidBy, setPaidBy] = useState("Mum");
  const [saving, setSaving] = useState(false);
  const d = notion.data;

  const save = async () => {
    const n = Number(amount);
    if (!item.trim() || !Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    try {
      await notionAction({ action: "addExpense", item: item.trim(), amount: n, category, paidBy });
      setItem("");
      setAmount("");
      sfx.success();
      toast.success("Saved to Notion");
      notion.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save to Notion");
    } finally {
      setSaving(false);
    }
  };

  if (!d && notion.error) return <NotConnected what="Notion" error={notion.error} />;
  const max = Math.max(1, ...(d?.byCategory.map((c) => c.amount) ?? [1]));

  return (
    <div>
      <H right={d && <a href={d.homeHubUrl} target="_blank" rel="noreferrer" className="text-[1.2rem] font-extrabold text-sky-ink underline">Open in Notion</a>}>
        Money this month
      </H>
      {!d ? (
        <div className="skeleton h-[20rem] rounded-[1.6rem]" />
      ) : (
        <div className="grid grid-cols-2 gap-5">
          <div className="rounded-[1.8rem] bg-sun-tint p-5">
            <p className="text-[1.15rem] font-black uppercase tracking-[0.08em] text-[#7a5a0c]">Spent in {d.month}</p>
            <p className="font-display text-[4rem] font-black leading-none">${d.spentThisMonth.toLocaleString("en-NZ", { maximumFractionDigits: 0 })}</p>
            <div className="mt-4 flex flex-col gap-2">
              {d.byCategory.slice(0, 7).map((c) => (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="w-[9rem] truncate text-[1.15rem] font-bold">{c.category}</span>
                  <div className="h-[1.2rem] flex-1 overflow-hidden rounded-full bg-white">
                    <motion.div className="h-full rounded-full bg-coral" initial={{ width: 0 }} animate={{ width: `${(c.amount / max) * 100}%` }} />
                  </div>
                  <span className="w-[5.5rem] text-right text-[1.15rem] font-black">${Math.round(c.amount)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.8rem] bg-paper p-5">
            <p className="mb-3 text-[1.15rem] font-black uppercase tracking-[0.08em] text-ink-3">Bills due in 14 days</p>
            {d.billsDue.length === 0 && <p className="text-[1.3rem] font-bold text-ink-2">Nothing due. 🎉</p>}
            <div className="flex flex-col gap-2">
              {d.billsDue.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-[1.2rem] bg-white px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[1.3rem] font-extrabold">{b.bill}</p>
                    <p className="text-[1.1rem] font-bold text-ink-2">
                      {b.due ? relativeDayLabel(fromDateKey(b.due.slice(0, 10))) : "No date"}
                      {b.autoPay && " · auto-pay"}
                    </p>
                  </div>
                  {b.amount != null && <span className="text-[1.3rem] font-black">${b.amount}</span>}
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await notionAction({ action: "markBillPaid", id: b.id });
                        notion.refresh();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Couldn't update");
                      }
                    }}
                    className="tap rounded-full bg-sage px-3 py-1.5 text-[1.05rem] font-black text-white"
                  >
                    Paid
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-2 rounded-[1.8rem] bg-paper p-5">
            <p className="mb-3 text-[1.15rem] font-black uppercase tracking-[0.08em] text-ink-3">Quick add an expense</p>
            <div className="grid grid-cols-[2fr_1fr] gap-3">
              <Field label="What was it?" value={item} onChange={(e) => setItem(e.target.value)} placeholder="e.g. School shoes" />
              <Field label="Amount ($)" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="49.90" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXPENSE_CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)} className={cn("tap rounded-full px-4 py-1.5 text-[1.15rem] font-extrabold ring-1 ring-black/5", category === c ? "bg-ink text-white" : "bg-white")}>
                  {c}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-2">
                {["Mum", "Dad", "Joint"].map((p) => (
                  <button key={p} type="button" onClick={() => setPaidBy(p)} className={cn("tap rounded-full px-4 py-1.5 text-[1.15rem] font-extrabold ring-1 ring-black/5", paidBy === p ? "bg-coral text-white" : "bg-white")}>
                    Paid by {p}
                  </button>
                ))}
              </div>
              <BigButton size="md" disabled={saving} onClick={() => void save()}>
                Save to Notion
              </BigButton>
            </div>
          </div>
          {d.recentExpenses.length > 0 && (
            <div className="col-span-2">
              <p className="mb-2 text-[1.15rem] font-black uppercase tracking-[0.08em] text-ink-3">Recent</p>
              <div className="grid grid-cols-2 gap-2">
                {d.recentExpenses.slice(0, 6).map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-[1.1rem] bg-paper px-4 py-2 text-[1.2rem] font-bold">
                    <span className="truncate">{e.item}</span>
                    <span className="font-black">${e.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Todos() {
  const notion = useNotion(true);
  if (!notion.data && notion.error) return <NotConnected what="Notion" error={notion.error} />;
  const tasks = notion.data?.tasks ?? [];
  return (
    <div>
      <H>Life admin</H>
      {!notion.data ? (
        <div className="skeleton h-[16rem] rounded-[1.6rem]" />
      ) : tasks.length === 0 ? (
        <EmptyState emoji="✅" title="Nothing on the hub list" body="Tick “Show on hub” on a Life Admin task in Notion to see it here." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-4 rounded-[1.4rem] bg-paper px-5 py-3">
              <button
                type="button"
                aria-label={`Done: ${t.task}`}
                onClick={async () => {
                  try {
                    await notionAction({ action: "completeTask", id: t.id });
                    sfx.success();
                    notion.refresh();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Couldn't update Notion");
                  }
                }}
                className="tap grid size-[3.4rem] shrink-0 place-items-center rounded-full border-[0.22rem] border-ink/25 bg-white"
              >
                <Check className="size-6 opacity-0 hover:opacity-50" strokeWidth={4} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[1.45rem] font-extrabold">{t.task}</p>
                <p className="text-[1.1rem] font-bold text-ink-2">
                  {[t.owner, t.area, t.due ? relativeDayLabel(fromDateKey(t.due.slice(0, 10))) : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              {t.status && <span className="rounded-full bg-white px-3 py-1 text-[1.05rem] font-black">{t.status}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotConnected({ what, error }: { what: string; error: string }) {
  return (
    <div className="rounded-[1.8rem] bg-paper p-7">
      <p className="font-display text-[2.4rem] font-black">{what} isn't connected yet</p>
      <p className="mt-2 text-[1.3rem] font-bold text-ink-2">{error}</p>
      <ol className="mt-4 list-decimal space-y-1 pl-6 text-[1.25rem] font-bold text-ink-2">
        <li>Add NOTION_TOKEN and HUB_ACCESS_KEY to the Vercel project (see docs/SETUP.md).</li>
        <li>In Notion, connect the Home Hub integration to the “Home Hub” page.</li>
        <li>Enter the same hub access key in Parent → Connections on this screen.</li>
      </ol>
    </div>
  );
}

/* ── Photos ────────────────────────────────────────────────────────────── */

function Photos() {
  const photos = useHub((s) => s.photos);
  const { addPhoto, removePhoto } = useHub.getState();
  const slideshow = useSlideshow();
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <H
        right={
          <label className="tap flex min-h-[4rem] cursor-pointer items-center gap-2 rounded-[1.25rem] bg-coral px-6 text-[1.35rem] font-extrabold text-white shadow-[var(--shadow-glow)]">
            <Plus className="size-6" /> {busy ? "Adding…" : "Add photos & videos"}
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                setBusy(true);
                for (const f of files) {
                  const isVideo = f.type.startsWith("video");
                  const blob = isVideo ? f : await resizeImage(f);
                  addPhoto({ mediaId: await saveMedia(blob), kind: isVideo ? "video" : "image" });
                }
                setBusy(false);
                e.target.value = "";
                toast.success(`Added ${files.length} to the slideshow`);
              }}
            />
          </label>
        }
      >
        Slideshow
      </H>
      <p className="mb-4 text-[1.25rem] font-bold text-ink-2">
        These play when the screen has been idle for a while. Pick from this device's photos, or export the kids' videos from Canva as MP4 and add them here.
      </p>

      <div className="mb-5 flex items-center justify-between rounded-[1.25rem] bg-white/70 px-5 py-3 ring-1 ring-black/5">
        <p className="text-[1.25rem] font-extrabold">Google Drive folder</p>
        {slideshow.connected ? (
          <span className="rounded-full bg-sage/20 px-3 py-1 text-[1.05rem] font-black text-sage-ink">
            {slideshow.items.length} {slideshow.items.length === 1 ? "item" : "items"}
          </span>
        ) : (
          <span className="rounded-full bg-sun/30 px-3 py-1 text-[1.05rem] font-black text-ink-2">Not connected</span>
        )}
      </div>
      {slideshow.connected && slideshow.items.length === 0 ? (
        <p className="mb-4 text-[1.2rem] font-bold text-ink-2">
          The Drive folder is empty. Drop photos and videos into it and they'll show up here.
        </p>
      ) : (
        slideshow.items.length > 0 && (
          <div className="mb-6 grid grid-cols-5 gap-3">
            {slideshow.items.map((d) => (
              <div key={d.id} className="relative aspect-square overflow-hidden rounded-[1.2rem] bg-paper">
                {d.kind === "video" ? <video src={d.url} muted className="size-full object-cover" /> : <img src={d.url} alt="" className="size-full object-cover" />}
              </div>
            ))}
          </div>
        )
      )}
      {slideshow.error && <p className="mb-4 text-[1.2rem] font-bold text-rose">{slideshow.error}</p>}

      <p className="mb-2 mt-6 text-[1.15rem] font-extrabold uppercase tracking-wide text-ink-3">Added on this screen</p>
      {photos.length === 0 ? (
        <EmptyState emoji="🖼️" title="No local photos yet" />
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {photos.map((p) => (
            <Thumb key={p.id} mediaId={p.mediaId} kind={p.kind} onRemove={() => (removePhoto(p.id), void deleteMedia(p.mediaId))} />
          ))}
        </div>
      )}
    </div>
  );
}

function Thumb({ mediaId, kind, onRemove }: { mediaId: string; kind: "image" | "video"; onRemove: () => void }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => void mediaUrl(mediaId).then(setUrl), [mediaId]);
  return (
    <div className="relative aspect-square overflow-hidden rounded-[1.2rem] bg-paper">
      {url && (kind === "video" ? <video src={url} muted className="size-full object-cover" /> : <img src={url} alt="" className="size-full object-cover" />)}
      <button type="button" aria-label="Remove" onClick={onRemove} className="tap absolute right-2 top-2 grid size-[3rem] place-items-center rounded-full bg-white/90">
        <Trash2 className="size-5" />
      </button>
    </div>
  );
}

/* ── Connections ───────────────────────────────────────────────────────── */

function Connections() {
  const hubKey = useHub((s) => s.settings.hubKey);
  const updateSettings = useHub((s) => s.updateSettings);
  const [key, setKey] = useState(hubKey ?? "");
  const calendar = useCalendar();
  const signal = useSignal();
  const pp = usePointPals();

  return (
    <div className="flex flex-col gap-5">
      <H>Connections</H>

      <Panel icon="🔑" title="Hub access key" status={hubKey ? "Saved on this screen" : "Not set"} ok={!!hubKey}>
        <p className="mb-3 text-[1.2rem] font-bold text-ink-2">
          The same value as HUB_ACCESS_KEY in Vercel. It lets this screen read the family calendar and Notion through the hub's private functions.
        </p>
        <div className="flex gap-3">
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            type="password"
            placeholder="Paste the hub access key"
            className="h-[4.2rem] min-w-0 flex-1 rounded-[1.2rem] border-2 border-line bg-white px-4 text-[1.35rem] font-bold outline-none focus:border-sky"
          />
          <BigButton
            size="md"
            icon={<KeyRound className="size-6" />}
            onClick={() => {
              updateSettings({ hubKey: key.trim() || undefined });
              toast.success("Saved");
              window.setTimeout(() => calendar.refresh(), 100);
            }}
          >
            Save
          </BigButton>
        </div>
      </Panel>

      <Panel icon="📅" title="Google Calendar" status={calendar.connected ? "Connected" : calendar.error ?? "Waiting for the hub key"} ok={calendar.connected}>
        <p className="text-[1.2rem] font-bold text-ink-2">
          Reads the family calendar's private iCal link (FAMILY_ICAL_URL), plus BOOKINGS_ICAL_URL for Airbnb cleans and check-ins if you add it. The link only ever lives in Vercel.
        </p>
      </Panel>

      <SignInPanel
        icon="🌿"
        title="SIGNAL"
        configured={signalConfigured}
        email={signal.email}
        error={signal.error}
        hint="Sign in with your SIGNAL account. The shopping list and meal plan come from there."
        onSignIn={signalSignIn}
        onSignOut={signalSignOut}
      />

      <SignInPanel
        icon="⭐"
        title="PointPals"
        configured={pointpalsConfigured}
        email={pp.email}
        error={pp.error}
        hint={pp.household ? `Household: ${pp.household.name} · ${pp.kids.length} kids` : "Sign in as a parent. Kids' jobs and jars come from there."}
        onSignIn={pointpalsSignIn}
        onSignOut={pointpalsSignOut}
      />

      <Panel icon="📒" title="Notion" status="Uses the hub key" ok={!!hubKey}>
        <p className="text-[1.2rem] font-bold text-ink-2">Money and To-dos read the Home Hub page in Notion through the hub's private function (NOTION_TOKEN in Vercel).</p>
      </Panel>
    </div>
  );
}

function Panel({ icon, title, status, ok, children }: { icon: string; title: string; status: string; ok: boolean; children: ReactNode }) {
  return (
    <div className="rounded-[1.8rem] bg-paper p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="text-[2.4rem] leading-none">{icon}</span>
        <p className="font-display text-[2.2rem] font-black leading-none">{title}</p>
        <span className={cn("ml-auto rounded-full px-3 py-1 text-[1.1rem] font-black", ok ? "bg-sage-tint text-sage-ink" : "bg-white text-ink-2")}>
          {ok ? "● " : "○ "}
          {status}
        </span>
      </div>
      {children}
    </div>
  );
}

function SignInPanel({
  icon,
  title,
  configured,
  email,
  error,
  hint,
  onSignIn,
  onSignOut,
}: {
  icon: string;
  title: string;
  configured: boolean;
  email?: string;
  error?: string;
  hint: string;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [e, setE] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Panel icon={icon} title={title} status={!configured ? "Not set up in Vercel" : email ? `Signed in as ${email}` : "Not signed in"} ok={!!email}>
      <p className="mb-3 text-[1.2rem] font-bold text-ink-2">{hint}</p>
      {error && <p className="mb-3 text-[1.2rem] font-bold text-coral-ink">{error}</p>}
      {!configured ? (
        <p className="text-[1.2rem] font-bold text-ink-3">Add the {title} Supabase URL and publishable key to Vercel (docs/SETUP.md).</p>
      ) : email ? (
        <BigButton tone="white" size="md" onClick={() => void onSignOut()}>
          Sign out
        </BigButton>
      ) : (
        <form
          className="grid grid-cols-[1fr_1fr_auto] gap-3"
          onSubmit={async (ev) => {
            ev.preventDefault();
            setBusy(true);
            try {
              await onSignIn(e.trim(), p);
              setP("");
              toast.success(`${title} connected`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Couldn't sign in");
            } finally {
              setBusy(false);
            }
          }}
        >
          <input value={e} onChange={(x) => setE(x.target.value)} type="email" autoComplete="username" placeholder="Email" className="h-[4.2rem] rounded-[1.2rem] border-2 border-line bg-white px-4 text-[1.3rem] font-bold outline-none focus:border-sky" />
          <input value={p} onChange={(x) => setP(x.target.value)} type="password" autoComplete="current-password" placeholder="Password" className="h-[4.2rem] rounded-[1.2rem] border-2 border-line bg-white px-4 text-[1.3rem] font-bold outline-none focus:border-sky" />
          <button type="submit" disabled={busy} className="tap h-[4.2rem] rounded-[1.2rem] bg-ink px-6 text-[1.3rem] font-black text-white disabled:opacity-50">
            {busy ? "…" : "Connect"}
          </button>
        </form>
      )}
    </Panel>
  );
}

/* ── Settings ──────────────────────────────────────────────────────────── */

function SettingsTab() {
  const s = useHub((x) => x.settings);
  const update = useHub((x) => x.updateSettings);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");

  return (
    <div className="flex flex-col gap-5">
      <H>Settings</H>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Family name" value={s.familyName} onChange={(e) => update({ familyName: e.target.value })} />
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-3">
          <Field label="New PIN" inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} type="password" />
          <Field label="Again" inputMode="numeric" maxLength={6} value={pin2} onChange={(e) => setPin2(e.target.value.replace(/\D/g, ""))} type="password" />
          <BigButton
            size="md"
            disabled={pin.length < 4 || pin !== pin2}
            onClick={async () => {
              const salt = newSalt();
              update({ pinSalt: salt, pinHash: await makePinHash(pin, salt) });
              setPin("");
              setPin2("");
              toast.success("PIN changed");
            }}
          >
            Set
          </BigButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Toggle checked={s.showSamples} onChange={(v) => update({ showSamples: v })} label="Show sample data" hint="Sample events and meals until things are connected" />
        <Toggle checked={s.sounds} onChange={(v) => update({ sounds: v })} label="Sounds" hint="Little pops and chimes" />
        <Toggle checked={s.reducedMotion} onChange={(v) => update({ reducedMotion: v })} label="Calm mode" hint="Less movement and no confetti" />
        <Toggle checked={s.keepAwake} onChange={(v) => update({ keepAwake: v })} label="Keep the screen awake" hint="While Home Hub is open" />
        <Toggle checked={s.teReo} onChange={(v) => update({ teReo: v })} label="Te reo Māori" hint="Mōrena! Kia ora! Day names and praise in te reo" />
        <Toggle checked={s.nzDates} onChange={(v) => update({ nzDates: v })} label="NZ school terms & holidays" hint="Term dates, school holidays and public holidays" />
      </div>

      <div className="rounded-[1.8rem] bg-paper p-5">
        <p className="font-display text-[2rem] font-black">Bin night 🗑️</p>
        <p className="mb-3 text-[1.2rem] font-bold text-ink-2">Which morning does the truck come? The hub reminds everyone the evening before.</p>
        <div className="flex flex-wrap gap-2">
          {["Off", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => {
            const value = i === 0 ? null : i - 1;
            return (
              <button key={d} type="button" onClick={() => update({ binDay: value })} className={cn("tap h-[3.6rem] rounded-full px-5 text-[1.25rem] font-black ring-1 ring-black/5", s.binDay === value ? "bg-ink text-white" : "bg-white")}>
                {d}
              </button>
            );
          })}
        </div>
        {s.binDay !== null && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[1.2rem] font-extrabold text-ink-2">Recycling:</span>
            {([
              { v: "weekly", label: "Every week" },
              { v: "even", label: "Even weeks" },
              { v: "odd", label: "Odd weeks" },
              { v: null, label: "Don't remind" },
            ] as const).map((o) => (
              <button key={o.label} type="button" onClick={() => update({ recycling: o.v })} className={cn("tap h-[3.4rem] rounded-full px-4 text-[1.15rem] font-black ring-1 ring-black/5", s.recycling === o.v ? "bg-sage text-white" : "bg-white")}>
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Stepper label="Dim from" value={s.dimStart} suffix=":00" min={16} max={23} onChange={(v) => update({ dimStart: v })} />
        <Stepper label="Night clock from" value={s.nightStart} suffix=":00" min={18} max={23} onChange={(v) => update({ nightStart: v })} />
        <Stepper label="Morning at" value={s.nightEnd} suffix=":00" min={4} max={9} onChange={(v) => update({ nightEnd: v })} />
        <Stepper label="Slideshow after" value={s.screensaverMins} suffix=" min" min={1} max={30} onChange={(v) => update({ screensaverMins: v })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Family jar reward (when PointPals isn't connected)" value={s.familyJarReward} onChange={(e) => update({ familyJarReward: e.target.value })} />
        <Stepper label="Marbles needed" value={s.familyJarTarget} min={10} max={200} step={5} onChange={(v) => update({ familyJarTarget: v })} />
      </div>

      <div className="rounded-[1.8rem] bg-sage-tint p-5">
        <p className="font-display text-[2.2rem] font-black">Guest mode 🏡</p>
        <p className="mb-4 text-[1.2rem] font-bold text-ink-2">For when the house is let to Airbnb guests. Family things are hidden; leaving needs the PIN.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Wi-Fi name" value={s.wifiName} onChange={(e) => update({ wifiName: e.target.value })} />
          <Field label="Wi-Fi password" value={s.wifiPassword} onChange={(e) => update({ wifiPassword: e.target.value })} />
          <Field label="Digital guidebook link" value={s.guidebookUrl} onChange={(e) => update({ guidebookUrl: e.target.value })} placeholder="https://" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {(["checkout", "heating", "appliances", "local"] as const).map((k) => (
            <label key={k} className="block">
              <span className="mb-1 block text-[1.15rem] font-extrabold capitalize text-ink-2">{k === "local" ? "Local tips" : k}</span>
              <textarea
                value={s.houseGuide[k]}
                onChange={(e) => update({ houseGuide: { ...s.houseGuide, [k]: e.target.value } })}
                className="h-[6rem] w-full resize-none rounded-[1.2rem] border-2 border-line bg-white p-3 text-[1.2rem] font-bold outline-none focus:border-sky"
              />
            </label>
          ))}
        </div>
        <BigButton tone="sage" size="lg" className="mt-4" onClick={() => update({ guestMode: true })}>
          Turn on guest mode
        </BigButton>
      </div>

      <div className="rounded-[1.8rem] bg-coral-tint p-5">
        <p className="font-display text-[2rem] font-black">Start again</p>
        <p className="mb-3 text-[1.2rem] font-bold text-ink-2">Wipes this screen's notes, habits and settings. SIGNAL, PointPals, Google and Notion aren't touched.</p>
        <BigButton
          tone="coral"
          size="md"
          onClick={() => {
            if (window.confirm("Wipe everything saved on this screen?")) {
              useHub.getState().resetAll();
              useHub.getState().setMembers(DEFAULT_MEMBERS);
            }
          }}
        >
          Wipe this screen
        </BigButton>
      </div>
    </div>
  );
}

function Stepper({ label, value, onChange, min, max, step = 1, suffix = "" }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <div className="rounded-[1.4rem] bg-white p-3 ring-1 ring-black/5">
      <p className="mb-2 text-[1.1rem] font-extrabold text-ink-2">{label}</p>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onChange(Math.max(min, value - step))} className="tap grid size-[3.4rem] place-items-center rounded-full bg-paper text-[2rem] font-black">
          –
        </button>
        <span className="font-display text-[2rem] font-black">
          {value}
          {suffix}
        </span>
        <button type="button" onClick={() => onChange(Math.min(max, value + step))} className="tap grid size-[3.4rem] place-items-center rounded-full bg-paper text-[2rem] font-black">
          +
        </button>
      </div>
    </div>
  );
}

