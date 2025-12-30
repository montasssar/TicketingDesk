import { useState, useEffect, useCallback, useRef } from "react";
import { getTicketsSummary, type TicketsSummaryStats } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const EMPTY_STATS: TicketsSummaryStats = {
    myTicketsCount: 0,
    teamQueueCount: 0,
    totalTicketsCount: 0,
};

interface UseDashboardStatsOptions {
    autoRefresh?: boolean;
    refreshIntervalMs?: number;
}

export function useDashboardStats(options: UseDashboardStatsOptions = {}) {
    const { autoRefresh = true, refreshIntervalMs = 30000 } = options;
    const { token, loading: authLoading } = useAuth();

    const [stats, setStats] = useState<TicketsSummaryStats>(EMPTY_STATS);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // To prevent race conditions or updates on unmounted component
    const mountedRef = useRef(true);

    const fetchStats = useCallback(async (isSilent = false) => {
        if (!token) return;

        // Only show loading state on first load or manual refresh, not background polling
        if (!isSilent) setLoading(true);
        setError(null);

        try {
            const data = await getTicketsSummary(token as string);
            if (mountedRef.current) {
                setStats(data);
            }
        } catch (err) {
            console.error(err);
            if (mountedRef.current) {
                setError("Could not load ticket summary.");
                // Keep old stats on error to avoid flickering to empty
            }
        } finally {
            if (mountedRef.current && !isSilent) {
                setLoading(false);
            }
        }
    }, [token]);

    useEffect(() => {
        mountedRef.current = true;

        if (authLoading) return;
        if (!token) {
            setLoading(false);
            return;
        }

        // Initial fetch
        fetchStats();

        // Setup polling
        let intervalId: NodeJS.Timeout | null = null;
        if (autoRefresh) {
            intervalId = setInterval(() => {
                fetchStats(true); // silent update
            }, refreshIntervalMs);
        }

        return () => {
            mountedRef.current = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [token, authLoading, autoRefresh, refreshIntervalMs, fetchStats]);

    return {
        stats,
        loading,
        error,
        refresh: () => fetchStats(false),
    };
}
