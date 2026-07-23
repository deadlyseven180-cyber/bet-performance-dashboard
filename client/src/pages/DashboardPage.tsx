import { useState } from 'react';
import { Trophy, TrendingDown, Award, Landmark, Flame, Snowflake, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { KpiGrid } from '@/components/dashboard/KpiGrid';
import { ErrorBanner, WarningBanner } from '@/components/dashboard/StatusBanners';
import { SectionCard, Segmented } from '@/components/ui/primitives';
import { RankingTable } from '@/components/rankings/RankingTable';
import { ProfitOverTimeChart } from '@/charts/ProfitOverTimeChart';
import { ProfitByGroupChart } from '@/charts/ProfitByGroupChart';
import { WinRateByTypeChart } from '@/charts/WinRateByTypeChart';
import { money, profitColor } from '@/utils/format';
import type { Granularity } from '@/types';

export function DashboardPage() {
  const a = useAnalytics();
  const [gran, setGran] = useState<Granularity>('daily');

  const insights = [
    { label: 'Largest Win', value: money(a.kpis.largestWin), icon: ArrowUpRight, cls: 'text-emerald-500' },
    { label: 'Largest Loss', value: money(a.kpis.largestLoss), icon: ArrowDownRight, cls: 'text-rose-500' },
    { label: 'Longest Win Streak', value: `${a.kpis.longestWinStreak} bets`, icon: Flame, cls: 'text-amber-500' },
    { label: 'Longest Loss Streak', value: `${a.kpis.longestLossStreak} bets`, icon: Snowflake, cls: 'text-sky-500' },
  ];

  return (
    <div className="space-y-5">
      <ErrorBanner />
      <WarningBanner />

      <KpiGrid kpis={a.kpis} loading={a.isLoading} />

      {/* Secondary insights row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {insights.map((it) => (
          <div key={it.label} className="card flex items-center gap-3 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              <it.icon className={`h-5 w-5 ${it.cls}`} />
            </span>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{it.label}</p>
              <p className={`text-lg font-bold ${it.label.includes('Loss') && it.label.includes('Largest') ? profitColor(a.kpis.largestLoss) : 'text-slate-800 dark:text-slate-100'}`}>{it.value}</p>
            </div>
          </div>
        ))}
      </div>

      <SectionCard
        title="Profit Over Time"
        subtitle="Cumulative bankroll growth with per-period profit"
        action={
          <Segmented
            value={gran}
            onChange={setGran}
            options={[
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
          />
        }
      >
        <ProfitOverTimeChart bets={a.bets} granularity={gran} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Profit by Service" subtitle="Top services by net profit">
          <ProfitByGroupChart stats={a.byService} />
        </SectionCard>
        <SectionCard title="Profit by Sport" subtitle="Where you make (and lose) money">
          <ProfitByGroupChart stats={a.bySport} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Win Rate by Bet Type" subtitle="Decided bets only">
          <WinRateByTypeChart bets={a.bets} />
        </SectionCard>
        <SectionCard title="Profit by Platform" subtitle="Bookmaker performance">
          <ProfitByGroupChart stats={a.byPlatform} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Top Services" subtitle="Ranked by net profit" action={<Trophy className="h-4 w-4 text-amber-500" />}>
          <RankingTable stats={a.byService} metric="profit" limit={5} />
        </SectionCard>
        <SectionCard title="Underperformers" subtitle="Lowest profit services" action={<TrendingDown className="h-4 w-4 text-rose-500" />}>
          <RankingTable stats={a.byService} metric="profit" dir="asc" limit={5} />
        </SectionCard>
        <SectionCard title="Best Accounts" subtitle="Ranked by ROI" action={<Award className="h-4 w-4 text-brand-500" />}>
          <RankingTable stats={a.byAccount} metric="roi" limit={5} />
        </SectionCard>
        <SectionCard title="Best Bet Types" subtitle="Ranked by ROI" action={<Landmark className="h-4 w-4 text-emerald-500" />}>
          <RankingTable stats={a.byBetType} metric="roi" limit={5} />
        </SectionCard>
      </div>
    </div>
  );
}
