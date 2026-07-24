import { CalendarX2, RotateCcw } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { EMPTY_FILTERS } from '@/types';
import { countActiveFilters } from '@/services/filters';
import { formatDate } from '@/utils/format';

/**
 * Shown when filters (notably the default current-month range) match nothing.
 * Without this the dashboard renders a wall of zeros and looks broken — e.g.
 * on the 1st of a month before any bets are logged.
 */
export function NoResults() {
  const { bets, filters, setFilters } = useData();
  const active = countActiveFilters(filters);

  const range = filters.dateFrom || filters.dateTo
    ? `${filters.dateFrom ? formatDate(filters.dateFrom) : 'the start'} – ${filters.dateTo ? formatDate(filters.dateTo) : 'now'}`
    : null;

  return (
    <div className="card flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <CalendarX2 className="h-7 w-7" />
      </span>
      <div>
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">No bets in this period</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
          {range
            ? <>Nothing matched <span className="font-medium">{range}</span>{active > 2 ? ' with your other filters' : ''}.</>
            : <>No bets matched your current filters.</>}
          {' '}Your sheet has <span className="font-medium">{bets.length.toLocaleString()}</span> bets in total.
        </p>
      </div>
      <button onClick={() => setFilters(EMPTY_FILTERS)} className="btn-primary">
        <RotateCcw className="h-4 w-4" /> Show all time
      </button>
    </div>
  );
}
