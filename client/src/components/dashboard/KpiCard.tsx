import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/primitives';

export function KpiCard({
  label, value, sub, icon: Icon, tone = 'neutral', loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  tone?: 'neutral' | 'positive' | 'negative' | 'brand';
  loading?: boolean;
}) {
  const toneStyles = {
    neutral: 'text-slate-800 dark:text-slate-100',
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-rose-600 dark:text-rose-400',
    brand: 'text-brand-600 dark:text-brand-400',
  }[tone];

  const iconTone = {
    neutral: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    positive: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    negative: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
    brand: 'bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400',
  }[tone];

  return (
    <div className="card animate-fade-in p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && (
          <span className={clsx('flex h-8 w-8 items-center justify-center rounded-lg', iconTone)}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-24" />
      ) : (
        <p className={clsx('mt-2 text-2xl font-bold tabular-nums', toneStyles)}>{value}</p>
      )}
      {sub && !loading && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
    </div>
  );
}
