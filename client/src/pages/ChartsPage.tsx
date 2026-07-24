import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SectionCard, Segmented, Badge } from '@/components/ui/primitives';
import { ErrorBanner } from '@/components/dashboard/StatusBanners';
import { ProfitOverTimeChart } from '@/charts/ProfitOverTimeChart';
import { ProfitByGroupChart } from '@/charts/ProfitByGroupChart';
import { WinRateByTypeChart } from '@/charts/WinRateByTypeChart';
import { OddsDistributionChart, StakeDistributionChart } from '@/charts/DistributionCharts';
import { decimalOdds, money } from '@/utils/format';
import type { Granularity } from '@/types';

export function ChartsPage() {
  const a = useAnalytics();
  const [gran, setGran] = useState<Granularity>('weekly');

  return (
    <div className="space-y-5">
      <ErrorBanner />

      <SectionCard
        title="Profit Over Time"
        action={
          <Segmented value={gran} onChange={setGran} options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]} />
        }
      >
        <ProfitOverTimeChart bets={a.bets} granularity={gran} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Profit by Service"><ProfitByGroupChart stats={a.byService} /></SectionCard>
        <SectionCard title="Profit by Account"><ProfitByGroupChart stats={a.byAccount} /></SectionCard>
        <SectionCard title="Profit by Betting Platform"><ProfitByGroupChart stats={a.byPlatform} /></SectionCard>
        <SectionCard title="Profit by Sport"><ProfitByGroupChart stats={a.bySport} /></SectionCard>
      </div>

      <SectionCard title="Win Rate by Bet Type">
        <WinRateByTypeChart bets={a.bets} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          title="Stake Distribution"
          subtitle="Frequency of stake sizes with profit overlay"
          action={<Badge className="bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">Avg {money(a.stake.avg)}</Badge>}
        >
          <StakeDistributionChart bets={a.bets} />
        </SectionCard>

        <SectionCard
          title="Odds Distribution"
          subtitle="Bet frequency and profit by odds band"
          action={
            <div className="flex gap-1.5">
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
