import { useMemo, useState } from 'react';
import { Filter, Search, X, SlidersHorizontal, CalendarDays } from 'lucide-react';
import clsx from 'clsx';
import { useData } from '@/context/DataContext';
import { distinctValues, STATUS_OPTIONS } from '@/services/analytics';
import { countActiveFilters } from '@/services/filters';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { STATUS_LABEL } from '@/utils/format';
import { currentMonthRange, type BetStatus } from '@/types';

export function GlobalFilterBar() {
  const { bets, filters, setFilters, resetFilters } = useData();
  const [expanded, setExpanded] = useState(false);

  const opts = useMemo(() => ({
    services: distinctValues(bets, 'service'),
    accounts: distinctValues(bets, 'account'),
    platforms: distinctValues(bets, 'betPlatform'),
    sports: distinctValues(bets, 'sport'),
    leagues: distinctValues(bets, 'league'),
    betTypes: distinctValues(bets, 'betType'),
  }), [bets]);

  const active = countActiveFilters(filters);
  const cm = currentMonthRange();
  const isCurrentMonth = filters.dateFrom === cm.from && filters.dateTo === cm.to;

  return (
    <div className="border-b border-slate-200 bg-white/60 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/40 sm:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search events, selections, notes…"
            className="input pl-9"
          />
        </div>

        <input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || null }))}
          className="input w-auto"
          title="From date"
        />
        <span className="text-slate-400">–</span>
        <input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || null }))}
          className="input w-auto"
          title="To date"
        />

        {/* Quick date presets — the dashboard defaults to the current month. */}
        <button
          onClick={() => {
            const { from, to } = currentMonthRange();
            setFilters((f) => ({ ...f, dateFrom: from, dateTo: to }));
          }}
          className={clsx('btn-ghost px-2.5 py-2 text-xs', isCurrentMonth && 'border-brand-300 text-brand-700 dark:border-brand-500/40 dark:text-brand-300')}
          title="Show only the current month"
        >
          <CalendarDays className="h-4 w-4" /> This month
        </button>
        <button
          onClick={() => setFilters((f) => ({ ...f, dateFrom: null, dateTo: null }))}
          className={clsx('btn-ghost px-2.5 py-2 text-xs', !filters.dateFrom && !filters.dateTo && 'border-brand-300 text-brand-700 dark:border-brand-500/40 dark:text-brand-300')}
          title="Show all dates"
        >
          All time
        </button>

        <button
          onClick={() => setExpanded((e) => !e)}
          className={clsx('btn-ghost', expanded && 'border-brand-300 text-brand-700 dark:text-brand-300')}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {active > 0 && (
            <span className="ml-1 rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">{active}</span>
          )}
        </button>

        {active > 0 && (
          <button onClick={resetFilters} className="btn-ghost text-slate-500">
            <X className="h-4 w-4" /> Clear
          </button>
        )}
      </div>

      {expanded && (
        <div className="mx-auto mt-3 grid max-w-[1400px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <MultiSelect label="Service" options={opts.services} selected={filters.services}
            onChange={(v) => setFilters((f) => ({ ...f, services: v }))} />
          <MultiSelect label="Account" options={opts.accounts} selected={filters.accounts}
            onChange={(v) => setFilters((f) => ({ ...f, accounts: v }))} />
          <MultiSelect label="Platform" options={opts.platforms} selected={filters.platforms}
            onChange={(v) => setFilters((f) => ({ ...f, platforms: v }))} />
          <MultiSelect label="Sport" options={opts.sports} selected={filters.sports}
            onChange={(v) => setFilters((f) => ({ ...f, sports: v }))} />
          <MultiSelect label="League" options={opts.leagues} selected={filters.leagues}
            onChange={(v) => setFilters((f) => ({ ...f, leagues: v }))} />
          <MultiSelect label="Bet Type" options={opts.betTypes} selected={filters.betTypes}
            onChange={(v) => setFilters((f) => ({ ...f, betTypes: v }))} />
          <MultiSelect
            label="Status"
            options={STATUS_OPTIONS.map((s) => STATUS_LABEL[s])}
            selected={filters.statuses.map((s) => STATUS_LABEL[s])}
            onChange={(labels) => {
              const map = Object.entries(STATUS_LABEL) as [BetStatus, string][];
              const values = labels.map((l) => map.find(([, lbl]) => lbl === l)?.[0]).filter(Boolean) as BetStatus[];
              setFilters((f) => ({ ...f, statuses: values }));
            }}
          />
        </div>
      )}

      {!expanded && active > 0 && (
        <div className="mx-auto mt-2 flex max-w-[1400px] items-center gap-1.5 text-xs text-slate-400">
          <Filter className="h-3 w-3" /> {active} active filter{active > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
