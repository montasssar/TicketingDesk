// app/(protected)/tickets/[id]/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getTicketById,
  addTicketComment,
  type TicketDetail,
} from "@/lib/api";

export default function TicketDetailPage() {
  const { token } = useAuth();
  const params = useParams<{ id: string }>();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const id = Number(params.id);

  useEffect(() => {
    if (!token || Number.isNaN(id)) return;

    const authToken = token as string;

    let cancelled = false;

    async function loadTicket() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTicketById(authToken, id);
        if (!cancelled) {
          setTicket(data);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setError("Could not load ticket.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTicket();

    return () => {
      cancelled = true;
    };
  }, [token, id]);

  const handleAddComment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || !ticket) return;

    const authToken = token as string;
    const body = comment.trim();
    if (!body) return;

    try {
      setSavingComment(true);
      setError(null);

      const updated = await addTicketComment(authToken, ticket.id, {
        body,
      });
      setTicket(updated);
      setComment("");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Could not add comment.",
      );
    } finally {
      setSavingComment(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Ticket #{id}
          </h1>
          {ticket && (
            <p className="text-sm text-slate-400">
              {ticket.title} · Status {ticket.status} · Priority{" "}
              {ticket.priority}
            </p>
          )}
        </div>

        <Link
          href="/tickets"
          className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          Back to tickets
        </Link>
      </header>

      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}

      {loading && <p className="text-sm text-slate-300">Loading…</p>}

      {ticket && (
        <>
          <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Description
            </h2>
            <p className="mt-2 text-sm text-slate-200">
              {ticket.description}
            </p>

            <p className="mt-4 text-xs text-slate-500">
              Created by {ticket.creator.email} · Updated at{" "}
              {new Date(ticket.updatedAt).toLocaleString()}
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Comments
            </h2>

            <ul className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              {ticket.comments.length === 0 && (
                <li className="text-xs text-slate-400">
                  No comments yet.
                </li>
              )}

              {ticket.comments.map((c) => (
                <li key={c.id} className="text-sm">
                  <p>{c.body}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    by {c.author.email} ·{" "}
                    {new Date(c.createdAt).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>

            <form
              onSubmit={handleAddComment}
              className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/70 p-4"
            >
              <textarea
                rows={3}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                placeholder="Add a comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={savingComment || !comment.trim()}
                  className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
                >
                  {savingComment ? "Saving…" : "Add comment"}
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
