import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { timeAgo } from '@/utils/format';

export function SyncStatusPill() {
  const { syncStatus, syncedAt, recordCount } = useData();
  const [, force] = useState(0);

  // Keep the "x seconds ago" label fresh.
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, []);

  const map = {
    loading: { icon: Loader2, text: 'Syncing…', cls: 'text-brand-600 dark:text-brand-400', spin: true },
    success: { icon: CheckCircle2, text: 'Synced', cls: 'text-emerald-600 dark:text-emerald-400', spin: false },
    error: { icon: AlertCircle, text: 'Sync error', cls: 'text-rose-600 dark:text-rose-400', spin: false },
    idle: { icon: Clock, text: 'Idle', cls: 'text-slate-500', spin: false },
  }[syncStatus];
  const Icon = map.icon;

  return (
    <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900 sm:flex">
      <Icon className={clsx('h-3.5 w-3.5', map.cls, map.spin && 'animate-spin')} />
      <span className={clsx('font-semibold', map.cls)}>{map.text}</span>
      <span className="text-slate-400">•</span>
      <span className="text-slate-500 dark:text-slate-400 tabular-nums">{recordCount} records</span>
      {syncedAt && syncStatus !== 'loading' && (
        <>
          <span className="text-slate-400">•</span>
          <span className="text-slate-400">{timeAgo(syncedAt)}</span>
        </>
      )}
    </div>
  );
}
