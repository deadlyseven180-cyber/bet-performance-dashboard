import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Inbox, Sparkles } from 'lucide-react';
import type { Bet } from '@/types';
import { formatDate, money, decimalOdds, STATUS_LABEL, STATUS_STYLE, profitColor } from '@/utils/format';
import { EmptyState } from '@/components/ui/primitives';

type SortKey = 'date' | 'service' | 'account' | 'betPlatform' | 'sport' | 'event' | 'selection' | 'stake' | 'odds' | 'status' | 'profit';
type Dir = 'asc' | 'desc';

const COLS: { key: SortKey; label: string; numeric?: boolean; align?: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'service', label: 'Service' },
  { key: 'account', label: 'Account' },
  { key: 'betPlatform', label: 'Platform' },
  { key: 'sport', label: 'Sport' },
  { key: 'event', label: 'Event' },
  { key: 'selection', label: 'Selection' },
  { key: 'stake', label: 'Stake', numeric: true, align: 'text-right' },
  { key: 'odds', label: 'Odds', numeric: true, align: 'text-right' },
  { key: 'status', label: 'Status' },
  { key: 'profit', label: 'Profit', numeric: true, align: 'text-right' },
];

const PAGE_SIZE = 25;

export function BetHistoryTable({ bets }: { bets: Bet[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [dir, setDir] = useState<Dir>('desc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const copy = [...bets];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp: number;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return dir === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [bets, sortKey, dir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = sorted.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setDir(key === 'date' || key === 'stake' || key === 'odds' || key === 'profit' ? 'desc' : 'asc'); }
    setPage(0);
  };

  if (!bets.length) {
    return <EmptyState icon={<Inbox className="h-10 w-10" />} title="No bets found" message="No records match your current filters or search." />;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
              {COLS.map((col) => {
                const activeSort = sortKey === col.key;
                const Icon = activeSort ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th key={col.key} className={clsx('whitespace-nowrap px-3 py-2.5 font-medium', col.align)}>
                    <button
                      onClick={() => toggleSort(col.key)}
                      className={clsx('inline-flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200', activeSort && 'text-brand-600 dark:text-brand-400')}
                    >
                      {col.label}
                      <Icon className="h-3 w-3" />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/60 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500 dark:text-slate-400">{formatDate(b.date)}</td>
                <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-200">{b.service}</td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{b.account}</td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{b.betPlatform}</td>
                <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{b.sport}</td>
                <td className="max-w-[180px] truncate px-3 py-2.5 text-slate-600 dark:text-slate-300" title={b.event}>{b.event || '—'}</td>
                <td className="max-w-[160px] truncate px-3 py-2.5 text-slate-600 dark:text-slate-300" title={b.selection}>{b.selection || '—'}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{money(b.stake)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">{decimalOdds(b.odds)}</td>
                <td className="px-3 py-2.5">
                  <span className={clsx('chip', STATUS_STYLE[b.status])}>
                    {STATUS_LABEL[b.status]}
                    {b.statusInferred && <Sparkles className="h-3 w-3" aria-label="Inferred from profit/return" />}
                  </span>
                </td>
                <td className={clsx('px-3 py-2.5 text-right tabular-nums font-semibold', profitColor(b.profit))}>
                  {b.status === 'pending' ? '—' : money(b.profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-1 pt-3 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Showing <span className="font-semibold">{current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, sorted.length)}</span> of{' '}
          <span className="font-semibold">{sorted.length}</span> bets
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={current === 0} className="btn-ghost px-2 py-1.5">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">Page {current + 1} / {pageCount}</span>
          <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={current >= pageCount - 1} className="btn-ghost px-2 py-1.5">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
