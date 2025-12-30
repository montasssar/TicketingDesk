// src/lib/api.ts

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/* =========
 *  TYPES
 * ========= */

export type UserRole = "employee" | "agent" | "admin";

export interface ApiUser {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
}

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";

export type AgentSummary = ApiUser;

export interface TicketSummary {
  id: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
}

export interface PaginationMeta {
  total: number;
  page: number;
  lastPage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface TicketFilterOptions {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  search?: string;
}

export interface TicketComment {
  id: number;
  body: string;
  createdAt: string;
  author: ApiUser;
}

export interface TicketDetail extends TicketSummary {
  description: string;
  creator: ApiUser;
  assignee: ApiUser | null;
  comments: TicketComment[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketHistoryEntry {
  id: number;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  changer: {
    id: number;
    name: string | null;
    email: string;
  };
}

export interface TicketsSummaryStats {
  myTicketsCount: number;
  teamQueueCount: number;
  totalTicketsCount: number;
  // Legacy fields (optional if you want to keep them)
  total?: number;
  open?: number;
  inProgress?: number;
  resolved?: number;
  closed?: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: ApiUser;
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  priority: TicketPriority;
  assigneeId?: number | null;
}

export interface UpdateStatusPayload {
  status: TicketStatus;
}

export interface UpdatePriorityPayload {
  priority: TicketPriority;
}

export interface AssignTicketPayload {
  assigneeId: number | null;
}

export interface AddCommentPayload {
  body: string;
}

/* =========
 *  HELPERS
 * ========= */

function authHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

type ErrorPayload = {
  message?: string | string[];
};

async function handleJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const defaultMessage = res.statusText || "Request failed";

  if (!res.ok) {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:unauthorized"));
      }
    }

    if (!text) {
      throw new Error(defaultMessage);
    }

    try {
      const data = JSON.parse(text) as ErrorPayload;
      const rawMessage = data.message;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join(", ")
        : rawMessage ?? defaultMessage;

      throw new Error(message);
    } catch {
      // If JSON.parse or shape fails, just throw raw text
      throw new Error(text || defaultMessage);
    }
  }

  if (!text) {
    // Empty body but successful status
    return {} as T;
  }

  return JSON.parse(text) as T;
}

/* =========
 *  AUTH
 * ========= */

export async function loginRequest(
  payload: LoginPayload,
): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  return handleJson<LoginResponse>(res);
}

export async function getProfile(token: string): Promise<ApiUser> {
  const res = await fetch(`${API_URL}/auth/profile`, {
    headers: authHeaders(token),
    cache: "no-store",
  });

  return handleJson<ApiUser>(res);
}

/* =========
 *  USERS (for agent dropdown)
 * ========= */

export async function getAgents(token: string): Promise<AgentSummary[]> {
  const res = await fetch(`${API_URL}/users/agents`, {
    headers: authHeaders(token),
    cache: "no-store",
  });

  return handleJson<AgentSummary[]>(res);
}

/* =========
 *  TICKETS
 * ========= */

export async function getTickets(
  token: string,
  options?: TicketFilterOptions,
): Promise<PaginatedResponse<TicketSummary>> {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", options.page.toString());
  if (options?.limit) params.set("limit", options.limit.toString());
  if (options?.status) params.set("status", options.status);
  if (options?.priority) params.set("priority", options.priority);
  if (options?.search) params.set("search", options.search);

  const res = await fetch(`${API_URL}/tickets?${params.toString()}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });

  // Backend returns { data: [], meta: {} }
  return handleJson<PaginatedResponse<TicketSummary>>(res);
}

export async function getTicketById(
  token: string,
  ticketId: number,
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/tickets/${ticketId}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });

  return handleJson<TicketDetail>(res);
}

export async function createTicket(
  token: string,
  payload: CreateTicketPayload,
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/tickets`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  return handleJson<TicketDetail>(res);
}

export async function assignTicket(
  token: string,
  ticketId: number,
  payload: AssignTicketPayload,
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/tickets/${ticketId}/assign`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  return handleJson<TicketDetail>(res);
}

export async function updateTicketStatus(
  token: string,
  ticketId: number,
  payload: UpdateStatusPayload,
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  return handleJson<TicketDetail>(res);
}

export async function updateTicketPriority(
  token: string,
  ticketId: number,
  payload: UpdatePriorityPayload,
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/tickets/${ticketId}/priority`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  return handleJson<TicketDetail>(res);
}

export async function addTicketComment(
  token: string,
  ticketId: number,
  payload: AddCommentPayload,
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  return handleJson<TicketDetail>(res);
}

export async function getTicketsSummary(
  token: string,
): Promise<TicketsSummaryStats> {
  const res = await fetch(`${API_URL}/tickets/summary`, {
    headers: authHeaders(token),
    cache: "no-store",
  });

  return handleJson<TicketsSummaryStats>(res);
}

export async function getTicketHistory(
  token: string,
  ticketId: number,
): Promise<TicketHistoryEntry[]> {
  const res = await fetch(`${API_URL}/tickets/${ticketId}/history`, {
    headers: authHeaders(token),
    cache: "no-store",
  });

  return handleJson<TicketHistoryEntry[]>(res);
}
