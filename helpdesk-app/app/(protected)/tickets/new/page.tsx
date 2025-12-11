// app/(protected)/tickets/new/page.tsx
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  createTicket,
  getAgents,
  type AgentSummary,
  type TicketPriority,
} from "@/lib/api";

const DEFAULT_PRIORITY: TicketPriority = "MEDIUM";

export default function NewTicketPage() {
  const router = useRouter();
  const { token } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] =
    useState<TicketPriority>(DEFAULT_PRIORITY);
  const [assigneeId, setAssigneeId] = useState<number | null>(null);

  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load agents for dropdown
  useEffect(() => {
    if (!token) return;

    const authToken = token as string;
    let cancelled = false;

    async function loadAgents() {
      try {
        setLoadingAgents(true);
        const list = await getAgents(authToken);
        if (!cancelled) {
          setAgents(list);
        }
      } catch (err) {
        console.error("Failed to load agents", err);
        // form still works without agents
      } finally {
        if (!cancelled) {
          setLoadingAgents(false);
        }
      }
    }

    loadAgents();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    const authToken = token as string;
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      setError("Title and description are required.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const created = await createTicket(authToken, {
        title: trimmedTitle,
        description: trimmedDescription,
        priority,
        assigneeId,
      });

      // Go directly to the new ticket
      router.push(`/tickets/${created.id}`);
    } catch (err) {
      console.error(err);
      setError("Could not create ticket. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-10 text-slate-200">
        <p className="text-sm">
          You must be logged in to create a ticket.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pt-8 text-white space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            New ticket
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Describe the issue and we&apos;ll route it to the right
            agent.
          </p>
        </div>

        <Link
          href="/tickets"
          className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
        >
          Back to tickets
        </Link>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">
            Title
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="Short summary of the issue"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-200">
            Description
          </label>
          <textarea
            rows={5}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            placeholder="Give as much detail as possible…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Priority */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-200">
              Priority
            </label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as TicketPriority)
              }
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>

          {/* Assignee */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-200">
              Assign to (optional)
            </label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={assigneeId ?? ""}
              disabled={loadingAgents}
              onChange={(e) =>
                setAssigneeId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">
                {loadingAgents ? "Loading agents…" : "Unassigned"}
              </option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center rounded-md bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create ticket"}
        </button>
      </form>
    </div>
  );
}
