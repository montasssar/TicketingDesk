// app/(protected)/tickets/[id]/page.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getTicketById,
  getAgents,
  addTicketComment,
  assignTicket,
  updateTicketStatus,
  updateTicketPriority,
  type TicketDetail,
  type TicketStatus,
  type TicketPriority,
  type AgentSummary,
} from "@/lib/api";

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();

  const ticketId = Number(params.id);

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // local editable state for status/priority
  const [editStatus, setEditStatus] = useState<TicketStatus>("OPEN");
  const [editPriority, setEditPriority] = useState<TicketPriority>("MEDIUM");
  const [savingStatusPriority, setSavingStatusPriority] = useState(false);

  // comments
  const [commentBody, setCommentBody] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // assignment
  const [assigneeUpdating, setAssigneeUpdating] = useState(false);

  useEffect(() => {
    if (!token || !ticketId) return;

    const authToken = token as string;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [ticketRes, agentsRes] = await Promise.all([
          getTicketById(authToken, ticketId),
          getAgents(authToken).catch(() => [] as AgentSummary[]),
        ]);

        if (!cancelled) {
          setTicket(ticketRes);
          setEditStatus(ticketRes.status);
          setEditPriority(ticketRes.priority);
          setAgents(agentsRes);
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

    load();

    return () => {
      cancelled = true;
    };
  }, [token, ticketId]);

  if (!ticketId || Number.isNaN(ticketId)) {
    notFound();
  }

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-10 text-slate-200">
        <p className="text-sm">
          You must be logged in to view this ticket.
        </p>
      </div>
    );
  }

  async function handleSaveChanges() {
    if (!ticket) return;

    setSavingStatusPriority(true);
    setError(null);

    try {
      const authToken = token as string;

      // Update status then priority using correct payloads
      let updated = await updateTicketStatus(authToken, ticket.id, {
        status: editStatus,
      });

      updated = await updateTicketPriority(authToken, ticket.id, {
        priority: editPriority,
      });

      setTicket(updated);
    } catch (err) {
      console.error(err);
      setError("Could not save status/priority.");
    } finally {
      setSavingStatusPriority(false);
    }
  }

  async function handleAssigneeChange(nextAssigneeId: number | null) {
    if (!ticket) return;
    setAssigneeUpdating(true);
    setError(null);

    try {
      const authToken = token as string;
      const updated = await assignTicket(authToken, ticket.id, {
        assigneeId: nextAssigneeId,
      });
      setTicket(updated);
    } catch (err) {
      console.error(err);
      setError("Could not update assignee.");
    } finally {
      setAssigneeUpdating(false);
    }
  }

  async function handleAddComment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ticket || !commentBody.trim()) return;

    setCommentSubmitting(true);
    setError(null);

    try {
      const authToken = token as string;
      const updated = await addTicketComment(authToken, ticket.id, {
        body: commentBody.trim(), // ✅ correct payload shape
      });
      setTicket(updated);
      setCommentBody("");
    } catch (err) {
      console.error(err);
      setError("Could not add comment.");
    } finally {
      setCommentSubmitting(false);
    }
  }

  if (loading || !ticket) {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-10 text-slate-200">
        {error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <p className="text-sm text-slate-400">Loading ticket…</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pt-8 text-white space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <button
            onClick={() => router.back()}
            className="mb-2 text-xs text-slate-400 hover:text-slate-200"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {ticket.title}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Created by{" "}
            <span className="font-medium">
              {ticket.creator.name ?? ticket.creator.email}
            </span>
          </p>
        </div>

        <Link
          href="/tickets"
          className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          All tickets
        </Link>
      </header>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Assignment */}
      <section className="space-y-2 rounded-md border border-slate-800 bg-slate-950 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Assignment
        </h2>
        <p className="text-xs text-slate-400">
          Current assignee:{" "}
          <span className="font-medium">
            {ticket.assignee
              ? ticket.assignee.name ?? ticket.assignee.email
              : "Unassigned"}
          </span>
        </p>
        <div className="mt-2">
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
            value={ticket.assignee?.id ?? ""}
            disabled={assigneeUpdating || loadingAgents}
            onChange={(e) =>
              handleAssigneeChange(
                e.target.value ? Number(e.target.value) : null,
              )
            }
          >
            <option value="">
              {loadingAgents ? "Loading…" : "Unassigned"}
            </option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Status + Priority with Save button */}
      <section className="space-y-3 rounded-md border border-slate-800 bg-slate-950 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Status & Priority
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Status
            </label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
              value={editStatus}
              onChange={(e) =>
                setEditStatus(e.target.value as TicketStatus)
              }
            >
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-300">
              Priority
            </label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs"
              value={editPriority}
              onChange={(e) =>
                setEditPriority(e.target.value as TicketPriority)
              }
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={savingStatusPriority}
            className="inline-flex items-center rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {savingStatusPriority ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      {/* Description */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-200">
          Description
        </h2>
        <p className="text-sm text-slate-200/90 whitespace-pre-line rounded-md border border-slate-800 bg-slate-950 px-3 py-3">
          {ticket.description}
        </p>
      </section>

      {/* Comments */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Comments
        </h2>

        <div className="space-y-2">
          {ticket.comments.length === 0 ? (
            <p className="text-xs text-slate-400">
              No comments yet. Be the first to respond.
            </p>
          ) : (
            ticket.comments.map((c) => (
              <div
                key={c.id}
                className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {c.author.name ?? c.author.email}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-200 whitespace-pre-line">
                  {c.body}
                </p>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={handleAddComment}
          className="space-y-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-3"
        >
          <textarea
            rows={3}
            className="w-full rounded-md border border-slate-800 bg-slate-950 px-2 py-2 text-xs"
            placeholder="Add a comment…"
            value={commentBody}
            onChange={(e) => setCommentBody(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={commentSubmitting || !commentBody.trim()}
              className="rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {commentSubmitting ? "Sending…" : "Add comment"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
