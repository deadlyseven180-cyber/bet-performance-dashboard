import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiPut } from '@/api/client';

export interface ManualBet {
  id: string;
  day: string;
  service: string;
  name: string;
  units: number;
}

export interface TrackerConfig {
  services: string[];
  unitSizes: Record<string, number>;
  betUnits: Record<string, number>;
  manualBets: ManualBet[];
  /** Per-bet reason for why it's still short / couldn't be filled. */
  reasons: Record<string, string>;
}

const DEFAULTS: TrackerConfig = {
  services: ['60% Dude', 'SAIYAN', 'Lyno'],
  unitSizes: { '60% Dude': 3000, SAIYAN: 1500, Lyno: 2000 },
  betUnits: {},
  manualBets: [],
  reasons: {},
};

const LS_KEY = 'tracker.config';
const POLL_MS = 8000;
const SAVE_DEBOUNCE = 600;

function merge(value: Partial<TrackerConfig> | null | undefined): TrackerConfig {
  return {
    services: value?.services ?? DEFAULTS.services,
    unitSizes: value?.unitSizes ?? DEFAULTS.unitSizes,
    betUnits: value?.betUnits ?? DEFAULTS.betUnits,
    manualBets: value?.manualBets ?? DEFAULTS.manualBets,
    reasons: value?.reasons ?? DEFAULTS.reasons,
  };
}

interface ConfigResponse { enabled: boolean; value: Partial<TrackerConfig>; updatedAt: string | null }

/**
 * The tracker config, shared across every device and viewer via the server's
 * Supabase-backed store. Local edits save (debounced) and a poll pulls in
 * changes made elsewhere. Falls back to localStorage if the store is disabled.
 */
export function useTrackerConfig() {
  const [cfg, setCfg] = useState<TrackerConfig>(() => {
    try { const r = localStorage.getItem(LS_KEY); if (r) return merge(JSON.parse(r)); } catch { /* ignore */ }
    return DEFAULTS;
  });
  const [loaded, setLoaded] = useState(false);
  const [shared, setShared] = useState(false);

  const lastSeenAt = useRef<string | null>(null);
  const dirty = useRef(false);
  const saveTimer = useRef<number | null>(null);

  // Initial load from the shared store.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await apiGet<ConfigResponse>('/config');
        if (cancelled) return;
        setShared(r.enabled);
        // Remember the server version even when empty, so the poll doesn't
        // immediately treat "no shared config yet" as a remote change and wipe
        // the settings already in this browser.
        lastSeenAt.current = r.updatedAt;
        if (r.enabled && r.value && Object.keys(r.value).length) {
          setCfg(merge(r.value));
        }
      } catch { /* offline / not configured — keep localStorage copy */ }
      finally { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist: localStorage always (instant, offline), shared store when enabled.
  const persist = useCallback((next: TrackerConfig) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    if (!shared) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const r = await apiPut<ConfigResponse>('/config', { value: next });
        lastSeenAt.current = r.updatedAt;
        dirty.current = false;
      } catch { /* will retry on next edit */ }
    }, SAVE_DEBOUNCE);
  }, [shared]);

  const update = useCallback((updater: (prev: TrackerConfig) => TrackerConfig) => {
    dirty.current = true;
    setCfg((prev) => { const next = updater(prev); persist(next); return next; });
  }, [persist]);

  // Poll for changes made on other devices; don't clobber unsaved local edits.
  useEffect(() => {
    if (!shared) return;
    const id = window.setInterval(async () => {
      if (dirty.current || document.hidden) return;
      try {
        const r = await apiGet<ConfigResponse>('/config');
        if (r.enabled && r.updatedAt && r.updatedAt !== lastSeenAt.current) {
          lastSeenAt.current = r.updatedAt;
          // Ignore an empty payload (no shared config written yet).
          if (r.value && Object.keys(r.value).length) {
            const merged = merge(r.value);
            setCfg(merged);
            try { localStorage.setItem(LS_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [shared]);

  return { cfg, update, loaded, shared };
}
