/**
 * Parent → Connections: the family account (sign-in, sync, invites) and the
 * family's own private connections (calendar links, Notion, slideshow).
 */
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  accountsConfigured,
  createFamily,
  createInvite,
  joinFamily,
  signIn,
  signOut,
  signUp,
  switchFamily,
  useAccount,
} from "@/lib/account";
import { hubFetch } from "@/lib/integrations/hub-api";
import { connectGoogleTasks, disconnectGoogleTasks } from "@/lib/integrations/google-tasks";
import { BigButton } from "@/components/ui";
import { cn } from "@/lib/utils";

const input =
  "h-[4.2rem] min-w-0 rounded-[1.2rem] border-2 border-line bg-white px-4 text-[1.3rem] font-bold outline-none focus:border-sky";

function Box({ icon, title, status, ok, children }: { icon: string; title: string; status: string; ok: boolean; children: ReactNode }) {
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

const SYNC_LABEL = {
  off: "Not syncing",
  loading: "Loading…",
  saving: "Saving…",
  saved: "Saved",
  offline: "Offline: saved on this screen",
  error: "Couldn't save",
} as const;

export function FamilyAccountPanel() {
  const a = useAccount();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState<string>();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  if (!accountsConfigured) {
    return (
      <Box icon="👨‍👩‍👧" title="Family account" status="Not set up in Vercel" ok={false}>
        <p className="text-[1.2rem] font-bold text-ink-2">Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to Vercel to turn on family sign-in (docs/ACCOUNTS.md).</p>
      </Box>
    );
  }

  if (!a.userId) {
    return (
      <Box icon="👨‍👩‍👧" title="Family account" status="Not signed in" ok={false}>
        <p className="mb-3 text-[1.2rem] font-bold text-ink-2">
          Sign in to save this screen's family, notes, habits and settings, and share them with your other screens and phones. The first screen to sign in to a new family uploads what's here.
        </p>
        <form
          className="grid grid-cols-[1fr_1fr_auto] gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              if (mode === "signin") await signIn(email.trim(), password);
              else if (!(await signUp(email.trim(), password))) toast("Check your email for the link, then sign in here.");
            });
          }}
        >
          <input className={input} type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={input} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} placeholder={mode === "signin" ? "Password" : "New password (8+)"} value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="submit" disabled={busy || !email || !password} className="tap h-[4.2rem] rounded-[1.2rem] bg-ink px-6 text-[1.3rem] font-black text-white disabled:opacity-50">
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create"}
          </button>
        </form>
        <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="tap mt-3 text-[1.15rem] font-extrabold text-ink-3 underline underline-offset-4">
          {mode === "signin" ? "No account yet? Make one" : "Already have one? Sign in"}
        </button>
      </Box>
    );
  }

  if (!a.household) {
    return (
      <Box icon="👨‍👩‍👧" title="Family account" status={`Signed in as ${a.email}`} ok>
        <p className="mb-3 text-[1.2rem] font-bold text-ink-2">Start your family (this screen's data becomes the family's), or join one with a code.</p>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <input className={input} placeholder="Family name" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
          <BigButton size="md" disabled={busy || !familyName.trim()} onClick={() => void run(() => createFamily(familyName), "Family created")}>
            Start
          </BigButton>
          <input className={cn(input, "tracking-[0.3em]")} placeholder="Join code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <BigButton size="md" tone="white" disabled={busy || code.length < 6} onClick={() => void run(() => joinFamily(code), "Joined")}>
            Join
          </BigButton>
        </div>
        <BigButton className="mt-4" tone="white" size="md" onClick={() => void signOut()}>
          Sign out
        </BigButton>
      </Box>
    );
  }

  const synced = a.syncedAt ? ` · ${formatDistanceToNow(a.syncedAt, { addSuffix: true })}` : "";
  return (
    <Box icon="👨‍👩‍👧" title={a.household.name} status={SYNC_LABEL[a.sync] + (a.sync === "saved" ? synced : "")} ok={a.sync === "saved" || a.sync === "saving"}>
      <p className="mb-3 text-[1.2rem] font-bold text-ink-2">
        Signed in as {a.email} ({a.household.role === "owner" ? "owner" : "grown-up"}). The family, notes, habits, reflections, jars and settings save to your family account and show on every screen signed in to it.
        Voice notes, doodles and slideshow photos added on this screen stay on this screen for now.
      </p>
      {a.error && a.sync === "error" && <p className="mb-3 text-[1.2rem] font-bold text-coral-ink">{a.error}</p>}
      {a.households.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {a.households.map((h) => (
            <button key={h.id} type="button" onClick={() => void switchFamily(h.id)} className={cn("tap rounded-full px-4 py-2 text-[1.2rem] font-black", h.id === a.household?.id ? "bg-ink text-white" : "bg-white text-ink-2")}>
              {h.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {a.household.role === "owner" && (
          <BigButton size="md" onClick={() => void run(async () => setInvite(await createInvite()))}>
            Invite a grown-up
          </BigButton>
        )}
        {invite && (
          <span className="rounded-[1.2rem] bg-white px-5 py-2 font-display text-[2.4rem] font-black tracking-[0.3em]">{invite}</span>
        )}
        <BigButton tone="white" size="md" onClick={() => void signOut()}>
          Sign out
        </BigButton>
        <BigButton
          tone="white"
          size="md"
          onClick={() => {
            if (window.confirm("Sign out and clear this screen? Your family's data stays saved in the account.")) void signOut({ clearScreen: true });
          }}
        >
          Sign out and clear this screen
        </BigButton>
      </div>
      {invite && <p className="mt-2 text-[1.15rem] font-bold text-ink-3">They make their own account, then enter this code under "Join". It works once, for 7 days.</p>}
    </Box>
  );
}

/* ── The family's own connections ───────────────────────────────────── */

type SecretName =
  | "FAMILY_ICAL_URL"
  | "BOOKINGS_ICAL_URL"
  | "KIDS_ICAL_URL"
  | "NOTION_TOKEN"
  | "NOTION_DS_EXPENSES"
  | "NOTION_DS_BILLS"
  | "NOTION_DS_LIFE_ADMIN"
  | "SLIDESHOW_DRIVE_FOLDER_ID"
  | "GOOGLE_TASKS_REFRESH_TOKEN";

interface ConnectionsResponse {
  householdId: string | null;
  isHome: boolean;
  items: { name: SecretName; source: "family" | "vercel" | null }[];
  hub: { slideshowServiceAccount: string | null; snap: boolean };
}

const FIELDS: { name: SecretName; icon: string; title: string; placeholder: string; help: (r: ConnectionsResponse) => string }[] = [
  {
    name: "FAMILY_ICAL_URL",
    icon: "📅",
    title: "Family calendar",
    placeholder: "https://calendar.google.com/calendar/ical/…/basic.ics",
    help: () => "Google Calendar on a computer → ⚙ Settings → your family calendar → Integrate calendar → Secret address in iCal format.",
  },
  {
    name: "BOOKINGS_ICAL_URL",
    icon: "🏡",
    title: "Bookings calendar (optional)",
    placeholder: "Secret iCal address",
    help: () => "For holiday-home bookings and cleans. Same steps, on that calendar.",
  },
  {
    name: "KIDS_ICAL_URL",
    icon: "🎒",
    title: "Kids' calendar (optional)",
    placeholder: "Secret iCal address",
    help: () => "Same steps, on the kids' calendar.",
  },
  {
    name: "NOTION_TOKEN",
    icon: "📒",
    title: "Notion (money and to-dos)",
    placeholder: "ntn_…",
    help: () =>
      "Duplicate the Home Hub Notion template, make an internal integration at notion.so/profile/integrations, connect it to your Home Hub page (••• → Connections), then paste its secret. The hub finds your Expenses, Bills and Life Admin databases.",
  },
  {
    name: "SLIDESHOW_DRIVE_FOLDER_ID",
    icon: "🖼️",
    title: "Slideshow folder",
    placeholder: "Google Drive folder id",
    help: (r) =>
      `Make a Google Drive folder, share it as Viewer with ${r.hub.slideshowServiceAccount ?? "the hub's service account"}, and paste the id from its link (after /folders/).`,
  },
];

export function FamilyConnections({ onChanged }: { onChanged?: () => void }) {
  const household = useAccount((a) => a.household?.id);
  const [data, setData] = useState<ConnectionsResponse>();
  const [error, setError] = useState<string>();

  const load = useCallback(() => {
    if (!household) return;
    hubFetch<ConnectionsResponse>("/api/connections")
      .then((r) => {
        setData(r);
        setError(undefined);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [household]);

  useEffect(load, [load]);

  if (!household) return null;
  if (error) {
    return (
      <Box icon="🔌" title="Your connections" status="Can't load" ok={false}>
        <p className="text-[1.2rem] font-bold text-coral-ink">{error}</p>
      </Box>
    );
  }
  if (!data) return null;

  const source = (n: SecretName) => data.items.find((i) => i.name === n)?.source ?? null;
  const notionDbs = (["NOTION_DS_EXPENSES", "NOTION_DS_BILLS", "NOTION_DS_LIFE_ADMIN"] as const).filter((n) => source(n)).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="px-1 text-[1.2rem] font-bold text-ink-2">
        Your family's private links. They're encrypted on the hub's server and never sent back to a screen.
        {data.isHome && " Anything not saved here uses the hub's Vercel settings."}
      </p>
      <GoogleTasksRow connected={!!source("GOOGLE_TASKS_REFRESH_TOKEN")} onChanged={load} />
      {FIELDS.map((f) => (
        <SecretRow
          key={f.name}
          field={f}
          help={f.help(data)}
          source={source(f.name)}
          extra={f.name === "NOTION_TOKEN" && source("NOTION_TOKEN") === "family" ? `${notionDbs} of 3 databases found` : undefined}
          onSaved={() => {
            load();
            onChanged?.();
          }}
        />
      ))}
    </div>
  );
}

/** Google Tasks: a one-time "allow" in Google rather than a pasted link. */
function GoogleTasksRow({ connected, onChanged }: { connected: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  // Back from Google's consent screen: say how it went, then tidy the address.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const result = q.get("google");
    if (!result) return;
    if (result === "connected") toast.success("Google Tasks connected. Tasks will appear on the fridge.");
    else toast.error(result === "access_denied" ? "Google Tasks wasn't allowed." : "Couldn't connect Google Tasks. Try again.");
    q.delete("google");
    window.history.replaceState(null, "", `${window.location.pathname}${q.size ? `?${q}` : ""}`);
    onChanged();
  }, [onChanged]);

  return (
    <Box icon="✅" title="Google Tasks" status={connected ? "Connected" : "Not connected"} ok={connected}>
      <p className="mb-3 text-[1.2rem] font-bold text-ink-2">
        Tasks you make in Google Calendar (Create → Task) go on the fridge with their title, date and notes, and stay there until someone peels
        them off, which ticks them off in Google too. Google keeps tasks out of the calendar link, so this needs a one-time OK from your Google
        account.
      </p>
      <div className="flex flex-wrap gap-3">
        <BigButton
          size="md"
          tone={connected ? "white" : "sky"}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await connectGoogleTasks();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Couldn't start connecting");
              setBusy(false);
            }
          }}
        >
          {connected ? "Reconnect" : "Connect Google Tasks"}
        </BigButton>
        {connected && (
          <BigButton
            size="md"
            tone="white"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await disconnectGoogleTasks();
                toast("Google Tasks disconnected");
                onChanged();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Couldn't disconnect");
              } finally {
                setBusy(false);
              }
            }}
          >
            Disconnect
          </BigButton>
        )}
      </div>
    </Box>
  );
}

function SecretRow({
  field,
  help,
  source,
  extra,
  onSaved,
}: {
  field: (typeof FIELDS)[number];
  help: string;
  source: "family" | "vercel" | null;
  extra?: string;
  onSaved: () => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const status = source === "family" ? "Saved" : source === "vercel" ? "Using Vercel" : "Not set";

  const call = async (method: "PUT" | "DELETE") => {
    setBusy(true);
    try {
      const r = await hubFetch<{ ok: true; notionFound?: string[] }>("/api/connections", {
        method,
        body: JSON.stringify(method === "PUT" ? { name: field.name, value } : { name: field.name }),
      });
      setValue("");
      if (r.notionFound && r.notionFound.length < 3) toast.warning(`Saved, but found ${r.notionFound.length} of the 3 Notion databases. Is the integration connected to your Home Hub page?`);
      else toast.success(method === "PUT" ? "Saved" : "Removed");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box icon={field.icon} title={field.title} status={extra ? `${status} · ${extra}` : status} ok={!!source}>
      <p className="mb-3 text-[1.15rem] font-bold text-ink-2">{help}</p>
      <div className="flex gap-3">
        <input className={cn(input, "flex-1")} type="password" autoComplete="off" placeholder={source ? "Paste a new one to replace it" : field.placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
        <BigButton size="md" disabled={busy || !value.trim()} onClick={() => void call("PUT")}>
          Save
        </BigButton>
        {source === "family" && (
          <BigButton size="md" tone="white" disabled={busy} onClick={() => void call("DELETE")}>
            Remove
          </BigButton>
        )}
      </div>
    </Box>
  );
}
