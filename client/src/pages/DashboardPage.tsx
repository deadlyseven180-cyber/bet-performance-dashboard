import { useState } from 'react';
import { Trophy, TrendingDown, Award, Landmark, Flame, Snowflake, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { KpiSection } from '@/components/dashboard/KpiSection';
import { ErrorBanner } from '@/components/dashboard/StatusBanners';
import { NoResults } from '@/components/dashboard/NoResults';
import { SectionCard, Segmented } from '@/components/ui/primitives';
import { RankingTable } from '@/components/rankings/RankingTable';
import { ProfitOverTimeChart, type ProfitMode } from '@/charts/ProfitOverTimeChart';
import { ProfitByGroupChart } from '@/charts/ProfitByGroupChart';
import { WinRateByTypeChart } from '@/charts/WinRateByTypeChart';
import { moneyKpi, profitColor } from '@/utils/format';
import type { Granularity } from '@/types';

const TOP_N_OPTIONS = [
  { value: '5', label: 'Top 5' },
  { value: '10', label: 'Top 10' },
  { value: '25', label: 'Top 25' },
];

export function DashboardPage() {
  const a = useAnalytics();
  const [gran, setGran] = useState<Granularity>('daily');
  const [mode, setMode] = useState<ProfitMode>('both');
  const [topN, setTopN] = useState('10');
  const n = Number(topN);

  const insights = [
    { label: 'Largest Win', value: moneyKpi(a.kpis.largestWin), icon: ArrowUpRight, cls: 'text-emerald-500', tone: 'pos' },
    { label: 'Largest Loss', value: moneyKpi(a.kpis.largestLoss), icon: ArrowDownRight, cls: 'text-rose-500', tone: 'neg' },
    { label: 'Longest Win Streak', value: `${a.kpis.longestWinStreak} bets`, icon: Flame, cls: 'text-amber-500', tone: '' },
    { label: 'Longest Loss Streak', value: `${a.kpis.longestLossStreak} bets`, icon: Snowflake, cls: 'text-sky-500', tone: '' },
  ];

  // Filters matched nothing (e.g. current month with no bets yet) — show a way out.
  if (!a.isLoading && a.bets.length === 0 && a.allBets.length > 0) {
    return (
      <div className="space-y-5">
        <ErrorBanner />
        <NoResults />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ErrorBanner />

      <KpiSection kpis={a.kpis} loading={a.isLoading} />

      {/* Secondary insights row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {insights.map((it) => (
          <div key={it.label} className="card flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <it.icon className={`h-5 w-5 ${it.cls}`} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">{it.label}</p>
              <p
                title={it.value}
                className={`truncate text-base font-bold tabular-nums ${it.tone === 'neg' ? profitColor(a.kpis.largestLoss) : it.tone === 'pos' ? profitColor(a.kpis.largestWin) : 'text-slate-800 dark:text-slate-100'}`}
              >
                {it.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <SectionCard
        title="Profit Over Time"
        subtitle="Cumulative bankroll growth with per-period profit"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: 'both' as ProfitMode, label: 'Both' },
                { value: 'cumulative' as ProfitMode, label: 'Cumulative' },
                { value: 'period' as ProfitMode, label: 'Per period' },
              ]}
            />
            <Segmented
              value={gran}
              onChange={setGran}
              options={[
                { value: 'daily' as Granularity, label: 'Daily' },
                { value: 'weekly' as Granularity, label: 'Weekly' },
                { value: 'monthly' as Granularity, label: 'Monthly' },
              ]}
            />
          </div>
        }
      >
        <ProfitOverTimeChart bets={a.bets} granularity={gran} mode={mode} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          title="Profit by Service"
          subtitle="Ranked by net profit"
          action={<Segmented value={topN} onChange={setTopN} options={TOP_N_OPTIONS} />}
        >
          <ProfitByGroupChart stats={a.byService} limit={n} />
        </SectionCard>

        {a.dims.sport && (
          <SectionCard title="Profit by Sport" subtitle="Where you make (and lose) money">
            <ProfitByGroupChart stats={a.bySport} limit={n} />
          </SectionCard>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {a.dims.betPlatform && (
          <SectionCard title="Profit by Platform" subtitle="Bookmaker performance">
            <ProfitByGroupChart stats={a.byPlatform} limit={n} />
          </SectionCard>
        )}
        {a.dims.account && (
          <SectionCard title="Profit by Account" subtitle="Best performing accounts">
            <ProfitByGroupChart stats={a.byAccount} limit={n} />
          </SectionCard>
        )}
        {/* Only meaningful when the sheet actually has a Bet Type column */}
        {a.dims.betType && (
          <SectionCard title="Win Rate by Bet Type" subtitle="Decided bets only">
            <WinRateByTypeChart bets={a.bets} />
          </SectionCard>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Top Services" subtitle="Ranked by net profit" action={<Trophy className="h-4 w-4 text-amber-500" />}>
          <RankingTable stats={a.byService} metric="profit" limit={5} />
        </SectionCard>
        <SectionCard title="Underperformers" subtitle="Lowest profit services" action={<TrendingDown className="h-4 w-4 text-rose-500" />}>
          <RankingTable stats={a.byService} metric="profit" dir="asc" limit={5} />
        </SectionCard>
        {a.dims.account && (
          <SectionCard title="Best Accounts" subtitle="Ranked by ROI" action={<Award className="h-4 w-4 text-brand-500" />}>
            <RankingTable stats={a.byAccount} metric="roi" limit={5} />
          </SectionCard>
        )}
        {a.dims.betType && (
          <SectionCard title="Best Bet Types" subtitle="Ranked by ROI" action={<Landmark className="h-4 w-4 text-emerald-500" />}>
            <RankingTable stats={a.byBetType} metric="roi" limit={5} />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
