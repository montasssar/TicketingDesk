// app/(protected)/tickets/page.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getTickets, type TicketSummary } from "@/lib/api";
import { useTickets } from "@/hooks/useTickets";

export default function TicketsPage() {
  const { token } = useAuth();
  const { tickets, loading, error, filters, setFilter } = useTickets({ limit: 5 });

  if (!token) {
    // Ideally this is handled by middleware, but for TS correctness or fast-refresh fallback:
    return null;
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

      {/* Filters */}
      <div className="mb-6 grid gap-4 rounded-lg bg-slate-900/50 p-4 sm:grid-cols-4">
        <input
          type="text"
          placeholder="Search tickets..."
          value={filters.search}
          onChange={(e) => setFilter.search(e.target.value)}
          className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        />

        <select
          value={filters.status}
          onChange={(e) => setFilter.status(e.target.value)}
          className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>

        <select
          value={filters.priority}
          onChange={(e) => setFilter.priority(e.target.value)}
          className="rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-sm text-slate-400">Loading tickets…</p>
      ) : error ? (
        <p className="text-sm text-red-400">{error}</p>
      ) : tickets.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-slate-400">No tickets found matching your filters.</p>
        </div>
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
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${t.priority === "HIGH"
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

      {/* Pagination */}
      {!loading && tickets.length > 0 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            disabled={filters.page <= 1}
            onClick={() => setFilter.page(p => p - 1)}
            className="rounded px-3 py-1 text-sm font-medium text-slate-300 hover:text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {filters.page} of {filters.totalPages}
          </span>
          <button
            disabled={filters.page >= filters.totalPages}
            onClick={() => setFilter.page(p => p + 1)}
            className="rounded px-3 py-1 text-sm font-medium text-slate-300 hover:text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
