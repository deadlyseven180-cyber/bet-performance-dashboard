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
  recordCount: number;
  warnings: string[];
  error: string | null;
  errorCode: string | null;

  filters: Filters;
  setFilters: (f: Filters | ((prev: Filters) => Filters)) => void;
  resetFilters: () => void;

  spreadsheetId: string;
  worksheet: string;
  setSource: (spreadsheetId: string, worksheet: string) => void;

  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;

  refresh: (opts?: { silent?: boolean }) => Promise<void>;
}

const Ctx = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [payload, setPayload] = useState<BetsPayload | null>(null);
  const [bets, setBets] = useState<Bet[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

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
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => localStorage.getItem('spreadsheetId') ?? '');
  const [worksheet, setWorksheet] = useState<string>(() => localStorage.getItem('worksheet') ?? '');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => localStorage.getItem('autoRefresh') === '1');

  const timerRef = useRef<number | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    setSyncStatus('loading');
    setError(null);
    setErrorCode(null);
    try {
      const data = await sheetsApi.getBets(spreadsheetId || undefined, worksheet || undefined);
      setPayload(data);
      setBets(cleanSportNoise(data.bets));
      setSyncedAt(data.syncedAt);
      setWarnings(data.warnings ?? []);
      setSyncStatus('success');
      if (!opts?.silent) {
        toast.success('Data synced', `${data.recordCount} records loaded from Google Sheets.`);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load data.';
      const code = err instanceof ApiError ? err.code : 'ERROR';
      setError(message);
      setErrorCode(code);
      setSyncStatus('error');
      if (!opts?.silent) toast.error('Sync failed', message);
    }
  }, [spreadsheetId, worksheet, toast]);

  // Initial load: fetch server config, then bets.
  useEffect(() => {
    (async () => {
      try {
        const cfg = await sheetsApi.getConfig();
        setConfig(cfg);
        if (!spreadsheetId && cfg.defaultSpreadsheetId) setSpreadsheetId(cfg.defaultSpreadsheetId);
        if (!worksheet && cfg.defaultWorksheet) setWorksheet(cfg.defaultWorksheet);
      } catch {
        /* config is best-effort */
      }
      await refresh({ silent: true });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh every 60 seconds when enabled.
  useEffect(() => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (autoRefresh) {
      timerRef.current = window.setInterval(() => refresh({ silent: true }), 60_000);
    }
    localStorage.setItem('autoRefresh', autoRefresh ? '1' : '0');
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [autoRefresh, refresh]);

  const setSource = useCallback((sid: string, ws: string) => {
    setSpreadsheetId(sid);
    setWorksheet(ws);
    localStorage.setItem('spreadsheetId', sid);
    localStorage.setItem('worksheet', ws);
  }, []);

  const resetFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const filteredBets = useMemo(() => applyFilters(bets, filters), [bets, filters]);

  const value: DataState = {
    config,
    bets,
    filteredBets,
    payload,
    syncStatus,
    syncedAt,
    recordCount: payload?.recordCount ?? bets.length,
    warnings,
    error,
    errorCode,
    filters,
    setFilters,
    resetFilters,
    spreadsheetId,
    worksheet,
    setSource,
    autoRefresh,
    setAutoRefresh,
    refresh,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
