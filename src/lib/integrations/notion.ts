import { useRemote } from "../useRemote";
import { cacheKey, hubFetch } from "./hub-api";
import { useHubAccess } from "../account";

export interface NotionSummary {
  month: string;
  spentThisMonth: number;
  byCategory: { category: string; amount: number }[];
  recentExpenses: { id: string; item: string; amount: number; date: string | null; category: string | null }[];
  billsDue: { id: string; bill: string; amount: number | null; due: string | null; autoPay: boolean }[];
  tasks: { id: string; task: string; due: string | null; owner: string | null; area: string | null; status: string | null }[];
  homeHubUrl: string | null;
}

export const EXPENSE_CATEGORIES = [
  "Groceries",
  "Household",
  "Kids",
  "School",
  "Transport",
  "Utilities",
  "Insurance",
  "Health",
  "Eating out",
  "Fun and activities",
  "Gifts",
  "Subscriptions",
  "Home and garden",
  "Travel",
  "Other",
];

export function useNotion(enabled: boolean) {
  const access = useHubAccess();
  return useRemote<NotionSummary>(
    enabled && access ? cacheKey("notion-summary", access) : null,
    () => hubFetch<NotionSummary>("/api/notion"),
    { intervalMs: 10 * 60_000 },
  );
}

export function notionAction(body:
  | { action: "addExpense"; item: string; amount: number; category: string; paidBy: string }
  | { action: "completeTask"; id: string }
  | { action: "markBillPaid"; id: string }) {
  return hubFetch<{ ok: true }>("/api/notion", { method: "POST", body: JSON.stringify(body) });
}
