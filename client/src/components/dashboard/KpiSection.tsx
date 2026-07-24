import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { Kpis } from '@/services/analytics';
import { Skeleton } from '@/components/ui/primitives';
import { moneyKpi, percent, number as fmtNum, decimalOdds } from '@/utils/format';

/**
 * KPI hierarchy: the three numbers that matter get hero treatment, the
 * settled/pending split becomes one proportional bar (it's a breakdown of a
 * single quantity, not four independent metrics), and the rest sit in a
 * compact secondary strip.
 */
export function KpiSection({ kpis, prev, loading }: { kpis: Kpis; prev?: Kpis | null; loading?: boolean }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <HeroCard
          label="Net Profit"
          value={moneyKpi(kpis.netProfit)}
          delta={kpis.netProfit}
          sub={`from ${moneyKpi(kpis.settledStake)} settled`}
          compare={prev ? { current: kpis.netProfit, previous: prev.netProfit, kind: 'money' } : undefined}
          loading={loading}
        />
        <HeroCard
          label="ROI"
          value={percent(kpis.roi)}
          delta={kpis.roi}
          sub="return on settled stake"
          compare={prev ? { current: kpis.roi, previous: prev.roi, kind: 'points' } : undefined}
          loading={loading}
        />
        <HeroCard
          label="Win Rate"
          value={percent(kpis.winRate)}
          sub={`${fmtNum(kpis.won)} of ${fmtNum(kpis.won + kpis.lost)} decided`}
          compare={prev ? { current: kpis.winRate, previous: prev.winRate, kind: 'points' } : undefined}
          loading={loading}
        />
      </div>

      <SettlementCard kpis={kpis} loading={loading} />

      <div className="card grid grid-cols-2 divide-slate-100 p-0 sm:grid-cols-3 lg:grid-cols-6 dark:divide-slate-800">
        <Cell label="Total Bets" value={fmtNum(kpis.totalBets)} loading={loading} />
        <Cell label="Turnover" value={moneyKpi(kpis.totalStake)} loading={loading} />
        <Cell label="Returns" value={moneyKpi(kpis.totalReturns)} loading={loading} />
        <Cell label="Avg Stake" value={moneyKpi(kpis.avgStake)} loading={loading} />
        <Cell label="Avg Odds" value={decimalOdds(kpis.avgOdds)} loading={loading} />
        <Cell label="Pending Stake" value={moneyKpi(kpis.pendingStake)} loading={loading} />
      </div>
    </div>
  );
}

interface Compare { current: number; previous: number; kind: 'money' | 'points' }

/** "vs previous period" badge — a KPI without a baseline is hard to judge. */
function ComparisonBadge({ compare }: { compare: Compare }) {
  const { current, previous, kind } = compare;
  const diff = current - previous;
  if (!Number.isFinite(diff) || Math.abs(diff) < 0.005) {
    return <span className="text-[11px] text-slate-400">no change vs prev period</span>;
  }
  const up = diff > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const text = kind === 'money'
    ? moneyKpi(Math.abs(diff))
    : `${Math.abs(diff).toFixed(1)} pts`;
  // Percentage change only makes sense for money with a non-trivial baseline.
  const pct = kind === 'money' && Math.abs(previous) > 1
    ? ` (${up ? '+' : '−'}${Math.abs((diff / Math.abs(previous)) * 100).toFixed(0)}%)`
    : '';
  return (
    <span className={clsx(
      'inline-flex items-center gap-0.5 text-[11px] font-medium',
      up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
    )}>
      <Icon className="h-3 w-3" aria-hidden />
      {up ? '+' : '−'}{text}{pct}
      <span className="font-normal text-slate-400"> vs prev period</span>
    </span>
  );
}

function HeroCard({ label, value, sub, delta, compare, loading }: {
  label: string; value: string; sub?: string; delta?: number; compare?: Compare; loading?: boolean;
}) {
  const dir = delta === undefined ? 0 : delta > 0 ? 1 : delta < 0 ? -1 : 0;
  const Icon = dir > 0 ? ArrowUpRight : dir < 0 ? ArrowDownRight : Minus;
  const tone = dir > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : dir < 0 ? 'text-rose-600 dark:text-rose-400'
    : 'text-slate-800 dark:text-slate-100';

  return (
    <div className="card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-32" />
      ) : (
        <div className="mt-1.5 flex items-center gap-1.5">
          {/* Arrow as well as colour, so profit/loss is readable without relying on hue */}
          {delta !== undefined && <Icon className={clsx('h-5 w-5 shrink-0', tone)} aria-hidden />}
          <p title={value} className={clsx('truncate text-2xl font-bold tabular-nums sm:text-3xl', tone)}>{value}</p>
        </div>
      )}
      {!loading && (
        <div className="mt-1 space-y-0.5">
          {compare ? <ComparisonBadge compare={compare} /> : null}
          {sub && <p className="truncate text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
        </div>
      )}
    </div>
  );
}

const SEGMENTS = [
  { key: 'won', label: 'Won', cls: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'lost', label: 'Lost', cls: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
  { key: 'void', label: 'Void', cls: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400' },
  { key: 'pending', label: 'Pending', cls: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400' },
] as const;

function SettlementCard({ kpis, loading }: { kpis: Kpis; loading?: boolean }) {
  const counts = { won: kpis.won, lost: kpis.lost, void: kpis.void, pending: kpis.pending };
  const total = counts.won + counts.lost + counts.void + counts.pending || 1;

  return (
    <div className="card p-4">
      <div className="mb-2.5 flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Settlement</p>
        <p className="text-xs text-slate-400">{fmtNum(kpis.totalBets)} bets</p>
      </div>

      {loading ? (
        <Skeleton className="h-2.5 w-full" />
      ) : (
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {SEGMENTS.map((s) => {
            const pct = (counts[s.key] / total) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={s.key}
                className={s.cls}
                style={{ width: `${pct}%` }}
                title={`${s.label}: ${counts[s.key]} (${pct.toFixed(1)}%)`}
              />
            );
          })}
        </div>
      )}

      {/* Value sits immediately after its own label, so it can't read as
          belonging to the next legend item. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-baseline gap-1.5">
            <span className={clsx('h-2 w-2 shrink-0 translate-y-[-1px] rounded-full', s.cls)} />
            <span className="text-xs text-slate-500 dark:text-slate-400">{s.label}</span>
            <span className={clsx('text-sm font-semibold tabular-nums', s.text)}>
              {loading ? '—' : fmtNum(counts[s.key])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cell({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="border-b border-slate-100 px-4 py-3 last:border-0 sm:border-b-0 sm:border-r sm:last:border-r-0 dark:border-slate-800">
      <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-4 w-16" />
      ) : (
        <p title={value} className="mt-0.5 truncate text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{value}</p>
      )}
    </div>
  );
}
