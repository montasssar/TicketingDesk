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

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: ApiUser;
}

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";

export interface TicketSummary {
  id: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
}

export interface TicketComment {
  id: number;
  body: string;
  createdAt: string;
  author: {
    id: number;
    email: string;
    name: string | null;
    role: UserRole;
  };
}

export interface TicketDetail extends TicketSummary {
  description: string;
  creator: {
    id: number;
    email: string;
    name: string | null;
    role: UserRole;
  };
  assignee: {
    id: number;
    email: string;
    name: string | null;
    role: UserRole;
  } | null;
  comments: TicketComment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  priority: TicketPriority;
  assigneeId?: number | null;
}

export interface AddCommentPayload {
  body: string;
}

export interface TicketsSummaryStats {
  myTicketsCount: number;
  teamQueueCount: number;
  totalTicketsCount: number;
}

/* =========
 *  HELPERS
 * ========= */

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    try {
      const parsed = JSON.parse(text) as { message?: unknown };
      const msg =
        typeof parsed.message === "string"
          ? parsed.message
          : JSON.stringify(parsed);
      throw new Error(msg);
    } catch {
      // not JSON
      throw new Error(text);
    }
  }

  try {
    const data = (await res.json()) as T;
    return data;
  } catch {
    const text = await res.text();
    throw new Error(text);
  }
}

function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/* =========
 *  AUTH
 * ========= */

export async function loginRequest(
  payload: LoginPayload,
): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return handleJson<LoginResponse>(res);
}

export async function getProfile(token: string): Promise<ApiUser> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return handleJson<ApiUser>(res);
}

/* =========
 *  TICKETS
 * ========= */

export async function getTickets(
  token: string,
): Promise<TicketSummary[]> {
  const res = await fetch(`${API_URL}/tickets`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleJson<TicketSummary[]>(res);
}

export async function createTicket(
  token: string,
  payload: CreateTicketPayload,
): Promise<TicketSummary> {
  const res = await fetch(`${API_URL}/tickets`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });

  // backend responds with the created ticket (with relations),
  // but we only need the summary fields here
  return handleJson<TicketSummary>(res);
}

export async function getTicketById(
  token: string,
  id: number,
): Promise<TicketDetail> {
  const res = await fetch(`${API_URL}/tickets/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
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

  // returns updated ticket with comments
  return handleJson<TicketDetail>(res);
}

export async function getTicketsSummary(
  token: string,
): Promise<TicketsSummaryStats> {
  const res = await fetch(`${API_URL}/tickets/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  return handleJson<TicketsSummaryStats>(res);
}
