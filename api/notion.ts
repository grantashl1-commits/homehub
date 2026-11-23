/**
 * /api/notion: the parent area's window into the "Home Hub" page in Notion.
 *   GET  → this month's spending by category, bills due in 14 days, life
 *          admin tasks marked "Show on hub".
 *   POST → { action: "addExpense" | "completeTask" | "markBillPaid", ... }
 * Needs NOTION_TOKEN (an internal integration connected to the Home Hub page)
 * and the x-hub-key header. Data source ids default to the databases created
 * for Home Hub and can be overridden with NOTION_DS_* env vars.
 */
import { addDaysToKey, json, nzToday, requireHubKey } from "./_shared.js";

const NOTION_VERSION = "2025-09-03";
const HOME_HUB_URL = "https://app.notion.com/p/4210d85f784c810eb340c4fdf00f06a3";
const DS = {
  expenses: process.env.NOTION_DS_EXPENSES ?? "4210d85f-784c-810e-9eaa-000b089bf237",
  bills: process.env.NOTION_DS_BILLS ?? "4210d85f-784c-8106-bdf7-000b91a2a8f7",
  lifeAdmin: process.env.NOTION_DS_LIFE_ADMIN ?? "4210d85f-784c-815e-b546-000bc203372a",
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type Page = { id: string; properties: Record<string, any> };

async function notion(path: string, init: { method?: string; body?: unknown } = {}): Promise<any> {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw Object.assign(new Error("NOTION_TOKEN isn't set on the Vercel project yet."), { status: 503 });
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method: init.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "notion-version": NOTION_VERSION,
      "content-type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const hint = res.status === 404 ? " Is the Home Hub integration connected to the Home Hub page?" : "";
    throw Object.assign(new Error(`${data?.message ?? `Notion said ${res.status}`}${hint}`), { status: 502 });
  }
  return data;
}

async function query(dataSource: string, body: Record<string, unknown>): Promise<Page[]> {
  const pages: Page[] = [];
  let cursor: string | undefined;
  do {
    const data = await notion(`data_sources/${dataSource}/query`, {
      method: "POST",
      body: { ...body, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) },
    });
    pages.push(...(data.results as Page[]));
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor && pages.length < 500);
  return pages;
}

const text = (p: any): string => (p?.title ?? p?.rich_text ?? []).map((t: any) => t.plain_text).join("").trim();
const num = (p: any): number | null => (typeof p?.number === "number" ? p.number : null);
const sel = (p: any): string | null => p?.select?.name ?? p?.status?.name ?? null;
const date = (p: any): string | null => p?.date?.start ?? null;
const box = (p: any): boolean => !!p?.checkbox;

async function summary() {
  const today = nzToday();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [expenses, bills, tasks] = await Promise.all([
    query(DS.expenses, {
      filter: { property: "Date", date: { on_or_after: monthStart } },
      sorts: [{ property: "Date", direction: "descending" }],
    }),
    query(DS.bills, {
      filter: {
        and: [
          { property: "Next due", date: { on_or_before: addDaysToKey(today, 14) } },
          { property: "Paid this cycle", checkbox: { equals: false } },
        ],
      },
      sorts: [{ property: "Next due", direction: "ascending" }],
    }),
    query(DS.lifeAdmin, {
      filter: {
        and: [
          { property: "Show on hub", checkbox: { equals: true } },
          { property: "Status", status: { does_not_equal: "Done" } },
        ],
      },
      sorts: [{ property: "Due", direction: "ascending" }],
    }),
  ]);

  const byCat = new Map<string, number>();
  let spent = 0;
  for (const e of expenses) {
    const amount = num(e.properties.Amount) ?? 0;
    spent += amount;
    const c = sel(e.properties.Category) ?? "Other";
    byCat.set(c, (byCat.get(c) ?? 0) + amount);
  }

  return {
    month: new Intl.DateTimeFormat("en-NZ", { month: "long", timeZone: "Pacific/Auckland" }).format(new Date()),
    spentThisMonth: Math.round(spent * 100) / 100,
    byCategory: [...byCat.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    recentExpenses: expenses.slice(0, 10).map((e) => ({
      id: e.id,
      item: text(e.properties.Item),
      amount: num(e.properties.Amount) ?? 0,
      date: date(e.properties.Date),
      category: sel(e.properties.Category),
    })),
    billsDue: bills.map((b) => ({
      id: b.id,
      bill: text(b.properties.Bill),
      amount: num(b.properties.Amount),
      due: date(b.properties["Next due"]),
      autoPay: box(b.properties["Auto-pay"]),
    })),
    tasks: tasks.map((t) => ({
      id: t.id,
      task: text(t.properties.Task),
      due: date(t.properties.Due),
      owner: sel(t.properties.Owner),
      area: sel(t.properties.Area),
      status: sel(t.properties.Status),
    })),
    homeHubUrl: HOME_HUB_URL,
  };
}

const CATEGORIES = new Set([
  "Groceries", "Household", "Kids", "School", "Transport", "Utilities", "Insurance", "Health",
  "Eating out", "Fun and activities", "Gifts", "Subscriptions", "Home and garden", "Travel", "Other",
]);
const PAYERS = new Set(["Mum", "Dad", "Joint"]);

function fail(e: unknown): Response {
  const status = (e as { status?: number }).status ?? 500;
  return json({ error: e instanceof Error ? e.message : "Notion request failed" }, status);
}

export async function GET(request: Request): Promise<Response> {
  const denied = requireHubKey(request);
  if (denied) return denied;
  try {
    return json(await summary());
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request: Request): Promise<Response> {
  const denied = requireHubKey(request);
  if (denied) return denied;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Expected JSON" }, 400);
  }
  try {
    switch (body?.action) {
      case "addExpense": {
        const item = String(body.item ?? "").slice(0, 200).trim();
        const amount = Number(body.amount);
        if (!item || !Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return json({ error: "Need an item and an amount" }, 400);
        const category = CATEGORIES.has(body.category) ? body.category : "Other";
        const paidBy = PAYERS.has(body.paidBy) ? body.paidBy : "Joint";
        await notion("pages", {
          method: "POST",
          body: {
            parent: { type: "data_source_id", data_source_id: DS.expenses },
            properties: {
              Item: { title: [{ text: { content: item } }] },
              Amount: { number: Math.round(amount * 100) / 100 },
              Date: { date: { start: nzToday() } },
              Category: { select: { name: category } },
              "Paid by": { select: { name: paidBy } },
              "Added via": { select: { name: "Hub" } },
            },
          },
        });
        return json({ ok: true });
      }
      case "completeTask": {
        const id = String(body.id ?? "");
        if (!/^[0-9a-f-]{32,36}$/i.test(id)) return json({ error: "Bad id" }, 400);
        await notion(`pages/${id}`, { method: "PATCH", body: { properties: { Status: { status: { name: "Done" } } } } });
        return json({ ok: true });
      }
      case "markBillPaid": {
        const id = String(body.id ?? "");
        if (!/^[0-9a-f-]{32,36}$/i.test(id)) return json({ error: "Bad id" }, 400);
        await notion(`pages/${id}`, { method: "PATCH", body: { properties: { "Paid this cycle": { checkbox: true } } } });
        return json({ ok: true });
      }
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (e) {
    return fail(e);
  }
}
