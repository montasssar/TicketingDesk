"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // If logged in, go directly to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  // While checking auth
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-sm text-slate-300">Loading…</p>
      </main>
    );
  }

  // Not logged in → show landing
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold">
          🛠 Internal Helpdesk & Ticketing
        </h1>

        <p className="text-sm text-slate-300">
          Sprint 3 – Protected routes & tickets module.
        </p>

        <div className="flex items-center justify-center gap-3 text-sm mt-4">
          <Link
            href="/login"
            className="rounded-lg bg-emerald-500 text-slate-950 px-4 py-2 font-medium hover:bg-emerald-400"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-600 px-4 py-2 hover:bg-slate-900"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}