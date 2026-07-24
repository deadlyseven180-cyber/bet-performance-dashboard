import { useMemo, useState } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { useData } from '@/context/DataContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { distinctValues, STATUS_OPTIONS } from '@/services/analytics';
import { countActiveFilters } from '@/services/filters';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { STATUS_LABEL } from '@/utils/format';
import { currentMonthRange, EMPTY_FILTERS, type BetStatus, type Filters } from '@/types';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Date shortcuts — far quicker than picking two dates by hand. */
function datePresets(): { label: string; from: string | null; to: string | null }[] {
  const now = new Date();
  const cm = currentMonthRange();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last30 = new Date(now); last30.setDate(now.getDate() - 29);
  return [
    { label: 'This month', from: cm.from, to: cm.to },
    { label: 'Last month', from: iso(lastMonthStart), to: iso(lastMonthEnd) },
    { label: 'Last 30 days', from: iso(last30), to: iso(now) },
    { label: 'This year', from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` },
    { label: 'All time', from: null, to: null },
  ];
}

export function GlobalFilterBar() {
  const { bets, filters, setFilters } = useData();
  const { dims } = useAnalytics();
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
  const presets = datePresets();
  const activePreset = presets.find((p) => p.from === filters.dateFrom && p.to === filters.dateTo);

  // Every active filter rendered as an individually removable chip.
  const chips: { label: string; clear: () => void }[] = [];
  if (filters.dateFrom || filters.dateTo) {
    chips.push({
      label: activePreset ? activePreset.label : `${filters.dateFrom ?? '…'} → ${filters.dateTo ?? '…'}`,
      clear: () => setFilters((f) => ({ ...f, dateFrom: null, dateTo: null })),
    });
  }
  if (filters.search.trim()) {
    chips.push({ label: `“${filters.search.trim()}”`, clear: () => setFilters((f) => ({ ...f, search: '' })) });
  }
  const listChips: [keyof Filters, string][] = [
    ['services', 'Service'], ['accounts', 'Account'], ['platforms', 'Platform'],
    ['sports', 'Sport'], ['leagues', 'League'], ['betTypes', 'Bet Type'],
  ];
  for (const [key, label] of listChips) {
    for (const v of filters[key] as string[]) {
      chips.push({
        label: `${label}: ${v}`,
        clear: () => setFilters((f) => ({ ...f, [key]: (f[key] as string[]).filter((x) => x !== v) })),
      });
    }
  }
  for (const s of filters.statuses) {
    chips.push({
      label: `Status: ${STATUS_LABEL[s]}`,
      clear: () => setFilters((f) => ({ ...f, statuses: f.statuses.filter((x) => x !== s) })),
    });
  }

  return (
    <div className="border-b border-slate-200 bg-white/60 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/40 sm:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            placeholder="Search selections, services, accounts…"
            className="input pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {presets.map((p) => (
            <button
              key={p.label}
              onClick={() => setFilters((f) => ({ ...f, dateFrom: p.from, dateTo: p.to }))}
              className={clsx(
                'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
                activePreset?.label === p.label
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

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
      </div>

      {expanded && (
        <div className="mx-auto mt-3 grid max-w-[1400px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">From</label>
            <input type="date" value={filters.dateFrom ?? ''} className="input"
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || null }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">To</label>
            <input type="date" value={filters.dateTo ?? ''} className="input"
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || null }))} />
          </div>
          {/* Only offer filters for columns this spreadsheet actually has */}
          {dims.service && <MultiSelect label="Service" options={opts.services} selected={filters.services}
            onChange={(v) => setFilters((f) => ({ ...f, services: v }))} />}
          {dims.account && <MultiSelect label="Account" options={opts.accounts} selected={filters.accounts}
            onChange={(v) => setFilters((f) => ({ ...f, accounts: v }))} />}
          {dims.betPlatform && <MultiSelect label="Platform" options={opts.platforms} selected={filters.platforms}
            onChange={(v) => setFilters((f) => ({ ...f, platforms: v }))} />}
          {dims.sport && <MultiSelect label="Sport" options={opts.sports} selected={filters.sports}
            onChange={(v) => setFilters((f) => ({ ...f, sports: v }))} />}
          {dims.league && <MultiSelect label="League" options={opts.leagues} selected={filters.leagues}
            onChange={(v) => setFilters((f) => ({ ...f, leagues: v }))} />}
          {dims.betType && <MultiSelect label="Bet Type" options={opts.betTypes} selected={filters.betTypes}
            onChange={(v) => setFilters((f) => ({ ...f, betTypes: v }))} />}
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

      {chips.length > 0 && (
        <div className="mx-auto mt-2 flex max-w-[1400px] flex-wrap items-center gap-1.5">
          {chips.map((c, i) => (
            <button
              key={i}
              onClick={c.clear}
              className="chip group bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
              title="Remove this filter"
            >
              {c.label}
              <X className="h-3 w-3 opacity-50 group-hover:opacity-100" />
            </button>
          ))}
          {chips.length > 1 && (
            <button onClick={() => setFilters(EMPTY_FILTERS)} className="chip text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}
