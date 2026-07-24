import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SectionCard, Segmented } from '@/components/ui/primitives';
import { RankingTable } from '@/components/rankings/RankingTable';
import { ErrorBanner } from '@/components/dashboard/StatusBanners';
import type { RankMetric } from '@/services/analytics';
import { Trophy, TrendingDown, CreditCard, Building2, Volleyball, Ticket } from 'lucide-react';

export function RankingsPage() {
  const a = useAnalytics();
  const [metric, setMetric] = useState<RankMetric>('profit');

  return (
    <div className="space-y-5">
      <ErrorBanner />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">Leaderboards across services, accounts, platforms, sports and bet types.</p>
        <Segmented
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'profit', label: 'Profit' },
            { value: 'roi', label: 'ROI' },
            { value: 'winRate', label: 'Win Rate' },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Top Performing Services" action={<Trophy className="h-4 w-4 text-amber-500" />}>
          <RankingTable stats={a.byService} metric={metric} limit={12} />
        </SectionCard>
        <SectionCard title="Worst Performing Services" subtitle="Lowest profit first" action={<TrendingDown className="h-4 w-4 text-rose-500" />}>
          <RankingTable stats={a.byService} metric="profit" dir="asc" limit={12} />
        </SectionCard>
        <SectionCard title="Best Accounts" action={<CreditCard className="h-4 w-4 text-brand-500" />}>
          <RankingTable stats={a.byAccount} metric={metric} limit={12} />
        </SectionCard>
        <SectionCard title="Best Betting Platforms" action={<Building2 className="h-4 w-4 text-sky-500" />}>
          <RankingTable stats={a.byPlatform} metric={metric} limit={12} />
        </SectionCard>
        <SectionCard title="Best Sports" action={<Volleyball className="h-4 w-4 text-emerald-500" />}>
          <RankingTable stats={a.bySport} metric={metric} limit={12} />
        </SectionCard>
        <SectionCard title="Best Bet Types" subtitle="Ranked by ROI" action={<Ticket className="h-4 w-4 text-violet-500" />}>
          <RankingTable stats={a.byBetType} metric="roi" limit={12} />
        </SectionCard>
      </div>
    </div>
  );
}
