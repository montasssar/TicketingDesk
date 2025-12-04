// app/(protected)/tickets/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getTickets,
  createTicket,
  type TicketSummary,
  type TicketPriority,
  type CreateTicketPayload,
} from "@/lib/api";

export default function TicketsPage() {
  const { token } = useAuth();

  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tickets
  useEffect(() => {
    if (!token) return;

    const authToken = token as string;

    let cancelled = false;

    async function loadTickets() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTickets(authToken);
        if (!cancelled) {
          setTickets(data);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Failed to load tickets.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTickets();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Create ticket
  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;

    const authToken = token as string;

    try {
      setCreating(true);
      setError(null);

      const payload: CreateTicketPayload = {
        title: title.trim(),
        description: description.trim(),
        priority,
      };

      if (!payload.title) {
        throw new Error("Title is required.");
      }

      if (!payload.description) {
        throw new Error("Description is required.");
      }

      if (payload.description.length < 5) {
        throw new Error("Description must be at least 5 characters.");
      }

      const newTicket = await createTicket(authToken, payload);

      setTickets((prev) => [newTicket, ...prev]);
      setTitle("");
      setDescription("");
      setPriority("MEDIUM");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Could not create ticket.",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="text-sm text-slate-400">
          View and create helpdesk tickets.
        </p>
      </header>

      {/* CREATE TICKET */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-slate-200">
          Create a new ticket
        </h2>

        <form onSubmit={handleCreate} className="space-y-3">
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            placeholder="Short title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
            placeholder="Describe the issue..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-slate-300">
              Priority:
              <select
                className="ml-2 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-emerald-400"
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as TicketPriority)
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>

            <div className="ml-auto flex items-center gap-2">
              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={creating}
                className="inline-flex items-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create ticket"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* TICKET LIST */}
      <section className="space-y-3">
        {loading && (
          <p className="text-sm text-slate-300">Loading tickets…</p>
        )}

        {!loading && tickets.length === 0 && (
          <p className="text-sm text-slate-400">
            No tickets yet. Use the form above to create one.
          </p>
        )}

        <ul className="space-y-2">
          {tickets.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm"
            >
              <div>
                <Link
                  href={`/tickets/${t.id}`}
                  className="font-medium text-slate-100 hover:underline"
                >
                  {t.title}
                </Link>

                <p className="text-xs text-slate-400">
                  Status: {t.status} · Priority: {t.priority}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
