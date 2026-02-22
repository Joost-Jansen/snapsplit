import { supabase } from "./supabase";
import type {
  Group,
  GroupDetail,
  ReceiptScanResponse,
  ExpenseCreate,
  Expense,
  ExpenseDetail,
  Settlement,
  UserShare,
} from "../types";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "API request failed");
  }

  return res.json();
}

// ─── Groups ─────────────────────────────────────────────
export async function createGroup(name: string): Promise<Group> {
  return apiFetch<Group>("/api/groups", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function listGroups(): Promise<Group[]> {
  return apiFetch<Group[]>("/api/groups");
}

export async function getGroup(groupId: string): Promise<GroupDetail> {
  return apiFetch<GroupDetail>(`/api/groups/${groupId}`);
}

export async function addMember(
  groupId: string,
  userId: string,
  role: "admin" | "member" = "member"
): Promise<void> {
  await apiFetch(`/api/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId, role }),
  });
}

export async function removeMember(
  groupId: string,
  userId: string
): Promise<void> {
  await apiFetch(`/api/groups/${groupId}/members/${userId}`, {
    method: "DELETE",
  });
}

// ─── Receipt Scanning ───────────────────────────────────
export async function scanReceipt(
  imageUri: string
): Promise<ReceiptScanResponse> {
  const headers = await getAuthHeaders();
  delete (headers as any)["Content-Type"]; // Let FormData set it

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: "receipt.jpg",
    type: "image/jpeg",
  } as any);

  const res = await fetch(`${API_BASE}/api/receipt/scan`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Failed to scan receipt");
  }

  return res.json();
}

// ─── Expenses ───────────────────────────────────────────
export async function createExpense(
  expense: ExpenseCreate
): Promise<Expense> {
  return apiFetch<Expense>("/api/expenses", {
    method: "POST",
    body: JSON.stringify(expense),
  });
}

export async function getExpense(
  expenseId: string
): Promise<ExpenseDetail> {
  return apiFetch<ExpenseDetail>(`/api/expenses/${expenseId}`);
}

export async function getExpenseShares(
  expenseId: string
): Promise<UserShare[]> {
  return apiFetch<UserShare[]>(`/api/expenses/${expenseId}/shares`);
}

// ─── Settlements ────────────────────────────────────────
export async function getSettlements(
  expenseId: string
): Promise<Settlement[]> {
  return apiFetch<Settlement[]>(`/api/settlements/expense/${expenseId}`);
}

export async function markSettlementPaid(
  settlementId: string
): Promise<Settlement> {
  return apiFetch<Settlement>(`/api/settlements/${settlementId}/mark-paid`, {
    method: "POST",
  });
}
