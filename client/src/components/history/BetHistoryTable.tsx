import { Fragment, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox, Sparkles } from 'lucide-react';
import type { Bet } from '@/types';
import type { Dimensions } from '@/services/analytics';
import { formatDate, money, decimalOdds, STATUS_LABEL, STATUS_STYLE, profitColor } from '@/utils/format';
import { EmptyState } from '@/components/ui/primitives';

type SortKey = 'date' | 'service' | 'account' | 'betPlatform' | 'sport' | 'league' | 'event' | 'selection' | 'stake' | 'odds' | 'status' | 'profit';
type Dir = 'asc' | 'desc';

interface Col {
  key: SortKey;
  label: string;
  align?: string;
  /** Which data dimension must be present for this column to be shown. */
  dim?: keyof Dimensions;
}

const COLS: Col[] = [
  { key: 'date', label: 'Date' },
  { key: 'service', label: 'Service', dim: 'service' },
  { key: 'account', label: 'Account', dim: 'account' },
  { key: 'betPlatform', label: 'Platform', dim: 'betPlatform' },
  { key: 'sport', label: 'Sport', dim: 'sport' },
  { key: 'league', label: 'League', dim: 'league' },
  { key: 'event', label: 'Event', dim: 'event' },
  { key: 'selection', label: 'Selection', dim: 'selection' },
  { key: 'stake', label: 'Stake', align: 'text-right' },
  { key: 'odds', label: 'Odds', align: 'text-right' },
  { key: 'status', label: 'Status' },
  { key: 'profit', label: 'Profit', align: 'text-right' },
];

const PAGE_SIZES = [25, 50, 100];

export function BetHistoryTable({ bets, dims }: { bets: Bet[]; dims: Dimensions }) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [dir, setDir] = useState<Dir>('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Only render columns whose underlying data actually exists in this sheet.
  const cols = useMemo(() => COLS.filter((c) => !c.dim || dims[c.dim]), [dims]);

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

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const rows = sorted.slice(current * pageSize, current * pageSize + pageSize);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setDir(key === 'date' || key === 'stake' || key === 'odds' || key === 'profit' ? 'desc' : 'asc'); }
    setPage(0);
  };

  if (!bets.length) {
    return <EmptyState icon={<Inbox className="h-10 w-10" />} title="No bets found" message="No records match your current filters or search." />;
  }

  const cell = (b: Bet, key: SortKey) => {
    switch (key) {
      case 'date': return <span className="whitespace-nowrap text-slate-500 dark:text-slate-400">{formatDate(b.date)}</span>;
      case 'service': return <span className="font-medium text-slate-700 dark:text-slate-200">{b.service}</span>;
      case 'stake': return <span className="tabular-nums text-slate-600 dark:text-slate-300">{money(b.stake)}</span>;
      case 'odds': return <span className="tabular-nums text-slate-600 dark:text-slate-300">{decimalOdds(b.odds)}</span>;
      case 'status': return (
        <span className={clsx('chip', STATUS_STYLE[b.status])}>
          {STATUS_LABEL[b.status]}
          {b.statusInferred && <Sparkles className="h-3 w-3" aria-label="Inferred from profit/return" />}
        </span>
      );
      case 'profit': return (
        <span className={clsx('tabular-nums font-semibold', profitColor(b.profit))}>
          {b.status === 'pending' ? '—' : `${b.profit > 0 ? '+' : ''}${money(b.profit)}`}
        </span>
      );
      default: {
        const v = String(b[key] ?? '');
        return <span className="text-slate-600 dark:text-slate-300" title={v}>{v || '—'}</span>;
      }
    }
  };

  return (
    <div>
      {/* Phones can't use the sortable column headers, so expose sorting here */}
      <div className="mb-3 flex items-center gap-2 sm:hidden">
        <select
          value={sortKey}
          onChange={(e) => { setSortKey(e.target.value as SortKey); setPage(0); }}
          className="input py-1.5 text-xs"
          aria-label="Sort by"
        >
          {cols.map((c) => <option key={c.key} value={c.key}>Sort: {c.label}</option>)}
        </select>
        <button
          onClick={() => setDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          className="btn-ghost shrink-0 px-2.5 py-1.5 text-xs"
          title={dir === 'asc' ? 'Ascending' : 'Descending'}
        >
          {dir === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Phones: stacked cards — a 12-column table is unusable at 360px wide */}
      <ul className="space-y-2 sm:hidden">
        {rows.map((b) => (
          <li key={b.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {b.selection || b.event || '—'}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {[formatDate(b.date), dims.sport ? b.sport : null, dims.betPlatform ? b.betPlatform : null]
                    .filter(Boolean).join(' • ')}
                </p>
              </div>
              <span className={clsx('chip shrink-0', STATUS_STYLE[b.status])}>
                {STATUS_LABEL[b.status]}
                {b.statusInferred && <Sparkles className="h-3 w-3" aria-label="Inferred" />}
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-50 pt-2 text-xs dark:border-slate-800/60">
              <span className="text-slate-500 dark:text-slate-400">
                {money(b.stake)} @ {decimalOdds(b.odds)}
              </span>
              <span className={clsx('text-sm font-bold tabular-nums', profitColor(b.profit))}>
                {b.status === 'pending' ? '—' : `${b.profit > 0 ? '+' : ''}${money(b.profit)}`}
              </span>
            </div>
            {(dims.service || dims.account) && (
              <p className="mt-1.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                {[dims.service ? b.service : null, dims.account ? b.account : null].filter(Boolean).join(' · ')}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="hidden max-h-[70vh] overflow-auto rounded-xl border border-slate-100 sm:block dark:border-slate-800">
        <table className="w-full min-w-[820px] text-sm">
          {/* Sticky header so column meaning survives long scrolls */}
          <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur dark:bg-slate-900/95">
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
              {cols.map((col) => {
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
            {rows.map((b, i) => (
              <Fragment key={b.id}>
                <tr
                  onClick={() => setExpanded((id) => (id === b.id ? null : b.id))}
                  className={clsx(
                    'cursor-pointer border-b border-slate-50 hover:bg-brand-50/40 dark:border-slate-800/60 dark:hover:bg-slate-800/50',
                    i % 2 === 1 && 'bg-slate-50/50 dark:bg-slate-800/20',
                    expanded === b.id && 'bg-brand-50/60 dark:bg-slate-800/60',
                  )}
                  title="Click to see every field for this bet"
                >
                  {cols.map((col) => (
                    <td key={col.key} className={clsx('max-w-[200px] truncate px-3 py-2.5', col.align)}>
                      {cell(b, col.key)}
                    </td>
                  ))}
                </tr>
                {expanded === b.id && (
                  <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/40">
                    <td colSpan={cols.length} className="px-3 py-3">
                      <BetDetail bet={b} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
        <div className="flex items-center gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">{current * pageSize + 1}–{Math.min((current + 1) * pageSize, sorted.length)}</span>
            {' of '}<span className="font-semibold">{sorted.length.toLocaleString()}</span>
          </p>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            className="input w-auto py-1 text-xs"
            title="Rows per page"
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / page</option>)}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setPage(0)} disabled={current === 0} className="btn-ghost px-2 py-1.5" title="First page">
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={current === 0} className="btn-ghost px-2 py-1.5">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-1 text-xs tabular-nums text-slate-500 dark:text-slate-400">
            Page {current + 1} / {pageCount.toLocaleString()}
          </span>
          <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={current >= pageCount - 1} className="btn-ghost px-2 py-1.5">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => setPage(pageCount - 1)} disabled={current >= pageCount - 1} className="btn-ghost px-2 py-1.5" title="Last page">
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Every field for one bet, including columns the importer captured but that
 * aren't mapped to a standard field (e.g. Daily Profit / Accumulated Profit).
 */
function BetDetail({ bet }: { bet: Bet }) {
  const fields: [string, string][] = [
    ['Date', formatDate(bet.date)],
    ['Service', bet.service],
    ['Account', bet.account],
    ['Platform', bet.betPlatform],
    ['Sport', bet.sport],
    ['League', bet.league],
    ['Event', bet.event],
    ['Bet Type', bet.betType],
    ['Selection', bet.selection],
    ['Stake', money(bet.stake)],
    ['Odds', decimalOdds(bet.odds)],
    ['Status', bet.statusRaw || STATUS_LABEL[bet.status]],
    ['Return', money(bet.returnAmount)],
    ['Profit', money(bet.profit)],
    ['Notes', bet.notes],
    ...Object.entries(bet.extra),
  ].filter(([, v]) => v !== '' && v !== 'Unknown' && v !== '—') as [string, string][];

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
      {fields.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] uppercase tracking-wide text-slate-400">{k}</dt>
          <dd className="truncate text-xs font-medium text-slate-700 dark:text-slate-200" title={v}>{v}</dd>
        </div>
      ))}
      {bet.statusInferred && (
        <div className="col-span-full text-[11px] text-amber-600 dark:text-amber-400">
          ⚠ Win/loss was inferred from the profit and return amounts — this row had no usable status.
        </div>
      )}
    </dl>
  );
}
