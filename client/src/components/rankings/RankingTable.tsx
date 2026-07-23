import clsx from 'clsx';
import type { GroupStat, RankMetric } from '@/services/analytics';
import { rankGroups } from '@/services/analytics';
import { money, percent, number as fmtNum, profitColor } from '@/utils/format';
import { EmptyState } from '@/components/ui/primitives';
import { Inbox } from 'lucide-react';

const MEDAL = ['🥇', '🥈', '🥉'];

export function RankingTable({
  stats, metric = 'profit', dir = 'desc', limit = 10, compact = false,
}: {
  stats: GroupStat[];
  metric?: RankMetric;
  dir?: 'desc' | 'asc';
  limit?: number;
  compact?: boolean;
}) {
  const ranked = rankGroups(stats, metric, dir).slice(0, limit);
  if (!ranked.length) {
    return <EmptyState icon={<Inbox className="h-9 w-9" />} title="No data" message="No groups match the current filters." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
            <th className="py-2 pl-1 pr-2 font-medium">#</th>
            <th className="py-2 pr-2 font-medium">Name</th>
            {!compact && <th className="py-2 pr-2 text-right font-medium">Bets</th>}
            {!compact && <th className="py-2 pr-2 text-right font-medium">Win %</th>}
            <th className="py-2 pr-2 text-right font-medium">ROI</th>
            <th className="py-2 pr-1 text-right font-medium">Profit</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((g, i) => (
            <tr key={g.key} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 dark:border-slate-800/60 dark:hover:bg-slate-800/40">
              <td className="py-2 pl-1 pr-2 tabular-nums text-slate-400">
                {dir === 'desc' && i < 3 ? MEDAL[i] : i + 1}
              </td>
              <td className="max-w-[160px] truncate py-2 pr-2 font-medium text-slate-700 dark:text-slate-200">{g.key}</td>
              {!compact && <td className="py-2 pr-2 text-right tabular-nums text-slate-500">{fmtNum(g.bets)}</td>}
              {!compact && <td className="py-2 pr-2 text-right tabular-nums text-slate-500">{percent(g.winRate)}</td>}
              <td className={clsx('py-2 pr-2 text-right tabular-nums font-medium', profitColor(g.roi))}>{percent(g.roi)}</td>
              <td className={clsx('py-2 pr-1 text-right tabular-nums font-semibold', profitColor(g.profit))}>{money(g.profit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
