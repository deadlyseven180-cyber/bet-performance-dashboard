import clsx from 'clsx';
import { Inbox, AlertTriangle } from 'lucide-react';
import type { GroupStat, RankMetric } from '@/services/analytics';
import { rankGroups } from '@/services/analytics';
import { money, moneyKpi, percent, number as fmtNum, profitColor } from '@/utils/format';
import { EmptyState } from '@/components/ui/primitives';

export function RankingTable({
  stats, metric = 'profit', dir = 'desc', limit = 10, compact = false,
  minBets = 0, onSelect,
}: {
  stats: GroupStat[];
  metric?: RankMetric;
  dir?: 'desc' | 'asc';
  limit?: number;
  compact?: boolean;
  /** Rows below this sample size are shown as unreliable (or excluded). */
  minBets?: number;
  onSelect?: (key: string) => void;
}) {
  // Rate-based metrics are meaningless on tiny samples, so low-volume groups
  // are pushed out of the ranking rather than topping it on luck.
  const rateMetric = metric === 'roi' || metric === 'winRate';
  const eligible = rateMetric && minBets > 0 ? stats.filter((g) => g.settled >= minBets) : stats;
  const ranked = rankGroups(eligible, metric, dir).slice(0, limit);

  if (!ranked.length) {
    return (
      <EmptyState
        icon={<Inbox className="h-9 w-9" />}
        title="No qualifying groups"
        message={rateMetric && minBets > 0
          ? `Nothing has at least ${minBets} settled bets. Lower the minimum to see more.`
          : 'No groups match the current filters.'}
      />
    );
  }

  const maxAbs = Math.max(...ranked.map((g) => Math.abs(g.profit)), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
            <th className="py-2 pl-1 pr-2 font-medium">#</th>
            <th className="py-2 pr-2 font-medium">Name</th>
            {!compact && <th className="py-2 pr-2 text-right font-medium">Bets</th>}
            {!compact && <th className="hidden py-2 pr-2 text-right font-medium sm:table-cell">Turnover</th>}
            {!compact && <th className="py-2 pr-2 text-right font-medium">Win %</th>}
            <th className="py-2 pr-2 text-right font-medium">ROI</th>
            <th className="py-2 pr-1 text-right font-medium">Profit</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((g, i) => {
            const lowSample = g.settled < Math.max(minBets, 10);
            return (
              <tr
                key={g.key}
                onClick={onSelect ? () => onSelect(g.key) : undefined}
                className={clsx(
                  'border-b border-slate-50 last:border-0 dark:border-slate-800/60',
                  onSelect && 'cursor-pointer hover:bg-brand-50/50 dark:hover:bg-slate-800/50',
                )}
                title={onSelect ? `Filter everything to “${g.key}”` : undefined}
              >
                <td className={clsx(
                  'py-2 pl-1 pr-2 tabular-nums',
                  dir === 'desc' && i < 3 ? 'font-semibold text-brand-500 dark:text-brand-400' : 'text-slate-400',
                )}>
                  {String(i + 1).padStart(2, '0')}
                </td>
                <td className="max-w-[170px] py-2 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">{g.key}</span>
                    {lowSample && (
                      <AlertTriangle
                        className="h-3 w-3 shrink-0 text-amber-500"
                        aria-label="Small sample — treat this rate as unreliable"
                      />
                    )}
                  </div>
                  {/* Inline magnitude bar for at-a-glance comparison */}
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={clsx('h-full rounded-full', g.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500')}
                      style={{ width: `${(Math.abs(g.profit) / maxAbs) * 100}%` }}
                    />
                  </div>
                </td>
                {!compact && <td className="py-2 pr-2 text-right tabular-nums text-slate-500">{fmtNum(g.bets)}</td>}
                {!compact && <td className="hidden py-2 pr-2 text-right tabular-nums text-slate-500 sm:table-cell">{moneyKpi(g.stake)}</td>}
                {!compact && <td className="py-2 pr-2 text-right tabular-nums text-slate-500">{percent(g.winRate)}</td>}
                <td className={clsx('py-2 pr-2 text-right tabular-nums font-medium', profitColor(g.roi))}>
                  {g.roi > 0 ? '+' : ''}{percent(g.roi)}
                </td>
                <td className={clsx('py-2 pr-1 text-right tabular-nums font-semibold', profitColor(g.profit))}>
                  {g.profit > 0 ? '+' : ''}{money(g.profit)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
