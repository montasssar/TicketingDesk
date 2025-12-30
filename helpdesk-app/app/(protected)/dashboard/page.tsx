// app/(protected)/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { type TicketsSummaryStats } from "@/lib/api";
import { useDashboardStats } from "@/hooks/useDashboardStats";


export default function DashboardPage() {
  const { user } = useAuth();
  const { stats, loading, error } = useDashboardStats({
    autoRefresh: true,
    refreshIntervalMs: 30000
  });


  const rawRole = user?.role ?? "employee";
  const role: "employee" | "agent" | "admin" =
    rawRole === "agent" || rawRole === "admin" ? rawRole : "employee";

  const displayName: string = user?.name ?? user?.email ?? "";

  const showTeamCard = role === "agent" || role === "admin";
  const showAdminCard = role === "admin";

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-400">
          Welcome, {displayName} ({role.toUpperCase()}).
        </p>
        {error && (
          <p className="text-xs text-red-400">
            {error}
          </p>
        )}
      </header>

      {/* CARDS */}
      <section className="grid gap-4 md:grid-cols-3">
        {/* My tickets */}
        <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-100">
            My tickets
          </h2>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {loading ? "…" : stats.myTicketsCount}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Tickets where you are the requester
            {role === "agent" && " or assignee"}.
          </p>
        </article>

        {/* Team queue – only for agents/admins */}
        {showTeamCard && (
          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Team queue
            </h2>
            <p className="mt-1 text-2xl font-bold text-sky-400">
              {loading ? "…" : stats.teamQueueCount}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Unassigned tickets that still need an owner.
            </p>
          </article>
        )}

        {/* Admin analytics – only for admins */}
        {showAdminCard && (
          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Admin analytics
            </h2>
            <p className="mt-1 text-2xl font-bold text-amber-400">
              {loading ? "…" : stats.totalTicketsCount}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Total tickets in the system.
            </p>
          </article>
        )}
      </section>

      {/* CTAS */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/tickets/new"
          className="inline-flex items-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
        >
          + Add ticket
        </Link>

        <Link
          href="/tickets"
          className="inline-flex items-center rounded-md border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800"
        >
          View tickets
        </Link>
      </div>
    </div>
  );
}
