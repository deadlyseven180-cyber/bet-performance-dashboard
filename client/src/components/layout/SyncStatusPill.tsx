import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { timeAgo } from '@/utils/format';

/**
 * Live status. Polling is always on, so instead of a manual refresh control
 * this shows a pulsing "LIVE" dot with when the sheet was last checked, or a
 * clear error state when the connection drops.
 */
export function LiveIndicator() {
  const { live, lastChecked, recordCount, error, syncStatus } = useData();
  const [, force] = useState(0);

  // Keep the "x ago" label fresh.
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(t);
  }, []);

  if (error && !live && syncStatus === 'error') {
    return (
      <div className="flex items-center gap-1.5 rounded border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-400">
        <AlertCircle className="h-3.5 w-3.5" />
        Offline
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded border border-slate-200 px-2.5 py-1 dark:border-slate-800">
      <span className="relative flex h-2 w-2">
        <span className={clsx(
          'absolute inline-flex h-full w-full rounded-full opacity-75',
          live && 'animate-ping bg-emerald-400',
        )} />
        <span className={clsx('relative inline-flex h-2 w-2 rounded-full', live ? 'bg-emerald-500' : 'bg-slate-400')} />
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">Live</span>
      <span className="hidden text-[11px] text-slate-400 tabular-nums sm:inline">{recordCount.toLocaleString()} rows</span>
      {lastChecked && (
        <span className="hidden text-[11px] text-slate-400 md:inline">· {timeAgo(lastChecked)}</span>
      )}
    </div>
  );
}
