import { useState, useEffect, useCallback, useRef } from "react";
import { getTickets, type TicketSummary } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface UseTicketsOptions {
    limit?: number;
}

export function useTickets(options: UseTicketsOptions = {}) {
    const { limit = 5 } = options;
    const { token, loading: authLoading } = useAuth();

    // Data State
    const [tickets, setTickets] = useState<TicketSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<string>("");
    const [priority, setPriority] = useState<string>("");

    // Debounce ref
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchTickets = useCallback(async (isDebounced = false) => {
        if (!token) return;

        if (!isDebounced) setLoading(true);
        setError(null);

        try {
            const res = await getTickets(token, {
                page,
                limit,
                search,
                status: status as any || undefined,
                priority: priority as any || undefined,
            });

            setTickets(res.data);
            setTotalPages(res.meta.lastPage);
        } catch (err) {
            console.error(err);
            setError("Could not load tickets.");
        } finally {
            setLoading(false);
        }
    }, [token, page, limit, search, status, priority]);

    useEffect(() => {
        if (authLoading) return;
        if (!token) {
            setLoading(false);
            return;
        }

        // Cancel previous debounce
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

        // If search changed, debounce. Otherwise fetch immediately.
        // Actually, simple strategy: Debounce everything slightly to avoid rapid clicks spamming
        // But instant pagination feels better.
        // Let's debounce only if search is involved, or just debounce all loosely (300ms)

        // For this implementation, we will use the same logic as the original page:
        // "Debounce search slightly if desired, or just load on effect" - original had 300ms timer

        setLoading(true); // Optimistic loading state
        debounceTimerRef.current = setTimeout(() => {
            fetchTickets();
        }, 300);

        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        };
    }, [token, authLoading, page, search, status, priority, fetchTickets]);

    // Actions to expose
    const setFilter = {
        search: (val: string) => { setSearch(val); setPage(1); },
        status: (val: string) => { setStatus(val); setPage(1); },
        priority: (val: string) => { setPriority(val); setPage(1); },
        page: setPage,
    };

    return {
        tickets,
        loading,
        error,
        filters: { search, status, priority, page, totalPages },
        setFilter,
        refresh: fetchTickets,
    };
}
