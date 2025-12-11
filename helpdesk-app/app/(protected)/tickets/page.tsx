// app/(protected)/tickets/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getTickets, type TicketSummary } from "@/lib/api";

export default function TicketsPage() {
  const { token } = useAuth();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const authToken = token as string;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const list = await getTickets(authToken);
        if (!cancelled) {
          setTickets(list);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Could not load tickets.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="max-w-4xl mx-auto px-6 pt-10 text-slate-200">
        <p className="text-sm">You must be logged in to view tickets.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 pt-8 text-white">
      {/* Header + CTA */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Tickets
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Browse and manage all helpdesk tickets.
          </p>
        </div>

        <Link
          href="/tickets/new"
          className="inline-flex items-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          + New ticket
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-sm text-slate-400">Loading tickets…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-slate-400">
          No tickets yet. Click{" "}
          <span className="font-semibold">“New ticket”</span> to create
          your first one.
        </p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/tickets/${t.id}`}
              className="block rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 hover:border-emerald-500/70 hover:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold">
                    {t.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Status:{" "}
                    <span className="font-medium">{t.status}</span>
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    t.priority === "HIGH"
                      ? "bg-red-500/80 text-red-50"
                      : t.priority === "MEDIUM"
                      ? "bg-amber-500/80 text-slate-950"
                      : "bg-emerald-500/80 text-slate-950"
                  }`}
                >
                  {t.priority}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
