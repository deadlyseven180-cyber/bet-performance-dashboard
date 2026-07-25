import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { sheetsApi } from '@/api/sheets';
import { ApiError } from '@/api/client';
import { useSearchParams } from 'react-router-dom';
import { applyFilters, filtersToParams, filtersFromParams } from '@/services/filters';
import { cleanSportNoise } from '@/services/analytics';
import { EMPTY_FILTERS, defaultFilters, type AppConfig, type Bet, type BetsPayload, type Filters, type SyncStatus } from '@/types';
import { useToast } from '@/components/ui/Toast';

interface DataState {
  config: AppConfig | null;
  bets: Bet[];
  filteredBets: Bet[];
  payload: BetsPayload | null;
  syncStatus: SyncStatus;
  syncedAt: string | null;
  /** When we last successfully checked the sheet (even if nothing changed). */
  lastChecked: string | null;
  recordCount: number;
  warnings: string[];
  error: string | null;
  errorCode: string | null;
  /** Live polling is always on; this reports whether it's currently healthy. */
  live: boolean;

  filters: Filters;
  setFilters: (f: Filters | ((prev: Filters) => Filters)) => void;
  resetFilters: () => void;

  refresh: (opts?: { silent?: boolean }) => Promise<void>;
}

/** How often to poll the sheet for changes (near-realtime). */
const POLL_MS = 10_000;

const Ctx = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [payload, setPayload] = useState<BetsPayload | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const lastHashRef = useRef<string | null>(null);

  // Filters come from the URL when present (shareable views), else default to
  // the present month.
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(
    () => filtersFromParams(searchParams) ?? defaultFilters(),
  );

  // Mirror filter state back into the URL so the view can be copied/shared.
  useEffect(() => {
    setSearchParams(filtersToParams(filters), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const timerRef = useRef<number | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    if (inFlight.current) return; // never overlap polls
    inFlight.current = true;
    // Only show the "loading" state on the very first fetch — background polls
    // must not flicker the UI.
    setSyncStatus((s) => (s === 'idle' ? 'loading' : s));
    try {
      const data = await sheetsApi.getBets();
      setLastChecked(new Date().toISOString());
      setLive(true);
      setError(null);
      setErrorCode(null);
      setSyncStatus('success');

      // Change-detection: only touch the heavy state (and re-render every chart)
      // when the sheet content actually changed.
      const changed = data.hash !== lastHashRef.current;
      if (changed) {
        const firstLoad = lastHashRef.current === null;
        lastHashRef.current = data.hash;
        setPayload(data);
        setBets(cleanSportNoise(data.bets));
        setSyncedAt(data.syncedAt);
        setWarnings(data.warnings ?? []);
        if (!firstLoad) toast.success('Sheet updated', `${data.recordCount} records — live.`);
      }
      if (!opts?.silent && !changed) toast.info('Up to date', 'No changes since last sync.');
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load data.';
      const code = err instanceof ApiError ? err.code : 'ERROR';
      setError(message);
      setErrorCode(code);
      setLive(false);
      setSyncStatus((s) => (s === 'idle' || bets.length === 0 ? 'error' : s));
      if (!opts?.silent) toast.error('Sync failed', message);
    } finally {
      inFlight.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  // Initial load: fetch server config, then bets.
  useEffect(() => {
    (async () => {
      try {
        setConfig(await sheetsApi.getConfig());
      } catch {
        /* config is best-effort */
      }
      await refresh({ silent: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Always-on live polling. Pauses while the tab is hidden to avoid needless
  // reads, and refreshes immediately when the user returns.
  useEffect(() => {
    const tick = () => { if (!document.hidden) refresh({ silent: true }); };
    timerRef.current = window.setInterval(tick, POLL_MS);
    const onVisible = () => { if (!document.hidden) refresh({ silent: true }); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const filteredBets = useMemo(() => applyFilters(bets, filters), [bets, filters]);

  const value: DataState = {
    config,
    bets,
    filteredBets,
    payload,
    syncStatus,
    syncedAt,
    lastChecked,
    recordCount: payload?.recordCount ?? bets.length,
    warnings,
    error,
    errorCode,
    live,
    filters,
    setFilters,
    resetFilters,
    refresh,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
