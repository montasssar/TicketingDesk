// app/(protected)/layout.tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [hydrated, setHydrated] = useState(false);

  // Fix hydration mismatches – only render auth UI after mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  // Redirect unauthenticated users after hydration
  useEffect(() => {
    if (hydrated && !loading && !user) {
      router.replace("/auth/login");
    }
  }, [hydrated, loading, user, router]);

  // While hydrating or loading auth → show loader
  if (!hydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <p className="text-sm text-slate-300">Checking your session…</p>
      </main>
    );
  }

  // While redirecting (user null)
  if (!user) {
    return null;
  }

  // Style active nav link
  const navLinkClass = (href: string) =>
    `text-sm ${
      pathname === href
        ? "text-emerald-400 font-semibold"
        : "text-slate-300 hover:text-emerald-300"
    }`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* TOP NAV */}
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="rounded bg-emerald-500 px-2 py-1 text-xs font-semibold text-slate-950">
            Helpdesk
          </span>

          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className={navLinkClass("/dashboard")}>
              Dashboard
            </Link>
            <Link href="/tickets" className={navLinkClass("/tickets")}>
              Tickets
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{user.email}</span>

          <button
            onClick={() => {
              logout();
              router.replace("/auth/login");
            }}
            className="rounded-md border border-slate-600 px-2 py-1 hover:border-emerald-400 hover:text-emerald-300"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Protected pages */}
      <main className="px-6 py-6">{children}</main>
    </div>
  );
}
