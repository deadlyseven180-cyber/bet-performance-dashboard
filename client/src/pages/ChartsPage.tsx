import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SectionCard, Segmented, Badge } from '@/components/ui/primitives';
import { ErrorBanner } from '@/components/dashboard/StatusBanners';
import { NoResults } from '@/components/dashboard/NoResults';
import { ProfitOverTimeChart, type ProfitMode } from '@/charts/ProfitOverTimeChart';
import { ProfitByGroupChart } from '@/charts/ProfitByGroupChart';
import { WinRateByTypeChart } from '@/charts/WinRateByTypeChart';
import { OddsDistributionChart, StakeDistributionChart } from '@/charts/DistributionCharts';
import { decimalOdds, moneyKpi } from '@/utils/format';
import type { Granularity } from '@/types';

const TOP_N_OPTIONS = [
  { value: '5', label: 'Top 5' },
  { value: '10', label: 'Top 10' },
  { value: '25', label: 'Top 25' },
];

export function ChartsPage() {
  const a = useAnalytics();
  const [gran, setGran] = useState<Granularity>('weekly');
  const [mode, setMode] = useState<ProfitMode>('both');
  const [topN, setTopN] = useState('10');
  const n = Number(topN);

  if (!a.isLoading && a.bets.length === 0 && a.allBets.length > 0) {
    return <div className="space-y-5"><ErrorBanner /><NoResults /></div>;
  }

  return (
    <div className="space-y-5">
      <ErrorBanner />

      <SectionCard
        title="Profit Over Time"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={mode} onChange={setMode} options={[
              { value: 'both' as ProfitMode, label: 'Both' },
              { value: 'cumulative' as ProfitMode, label: 'Cumulative' },
              { value: 'period' as ProfitMode, label: 'Per period' },
            ]} />
            <Segmented value={gran} onChange={setGran} options={[
              { value: 'daily' as Granularity, label: 'Daily' },
              { value: 'weekly' as Granularity, label: 'Weekly' },
              { value: 'monthly' as Granularity, label: 'Monthly' },
            ]} />
          </div>
        }
      >
        <ProfitOverTimeChart bets={a.bets} granularity={gran} mode={mode} height={400} />
      </SectionCard>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">Breakdowns — anything beyond the top N is grouped into “Other”.</p>
        <Segmented value={topN} onChange={setTopN} options={TOP_N_OPTIONS} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Profit by Service"><ProfitByGroupChart stats={a.byService} limit={n} /></SectionCard>
        {a.dims.account && <SectionCard title="Profit by Account"><ProfitByGroupChart stats={a.byAccount} limit={n} /></SectionCard>}
        {a.dims.betPlatform && <SectionCard title="Profit by Betting Platform"><ProfitByGroupChart stats={a.byPlatform} limit={n} /></SectionCard>}
        {a.dims.sport && <SectionCard title="Profit by Sport"><ProfitByGroupChart stats={a.bySport} limit={n} /></SectionCard>}
        {a.dims.league && <SectionCard title="Profit by League"><ProfitByGroupChart stats={a.byLeague} limit={n} /></SectionCard>}
      </div>

      {a.dims.betType && (
        <SectionCard title="Win Rate by Bet Type">
          <WinRateByTypeChart bets={a.bets} />
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          title="Stake Distribution"
          subtitle="Frequency of stake sizes with profit overlay"
          action={<Badge className="bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">Avg {moneyKpi(a.stake.avg)}</Badge>}
        >
          <StakeDistributionChart bets={a.bets} />
        </SectionCard>

        <SectionCard
          title="Odds Distribution"
          subtitle="Bet frequency and profit by odds band"
          action={
            <div className="flex flex-wrap gap-1.5">
              <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Avg {decimalOdds(a.odds.avg)}</Badge>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">High {decimalOdds(a.odds.highest)}</Badge>
              <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">Low {decimalOdds(a.odds.lowest)}</Badge>
            </div>
          }
        >
          <OddsDistributionChart bets={a.bets} />
        </SectionCard>
      </div>
    </div>
  );
}
