import { useState } from 'react';
import { Info } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useData } from '@/context/DataContext';
import { SectionCard, Segmented } from '@/components/ui/primitives';
import { RankingTable } from '@/components/rankings/RankingTable';
import { DivergingProfitChart } from '@/charts/InsightCharts';
import { ErrorBanner } from '@/components/dashboard/StatusBanners';
import { NoResults } from '@/components/dashboard/NoResults';
import type { GroupStat, RankMetric } from '@/services/analytics';
import type { Filters } from '@/types';

type DimKey = 'service' | 'account' | 'platform' | 'sport' | 'betType';

const MIN_BETS_OPTIONS = [
  { value: '0', label: 'All' },
  { value: '10', label: '10+' },
  { value: '25', label: '25+' },
  { value: '50', label: '50+' },
];

export function RankingsPage() {
  const a = useAnalytics();
  const { setFilters } = useData();
  const [metric, setMetric] = useState<RankMetric>('profit');
  const [dim, setDim] = useState<DimKey>('service');
  const [minBets, setMinBets] = useState('25');

  if (!a.isLoading && a.bets.length === 0 && a.allBets.length > 0) {
    return <div className="space-y-5"><ErrorBanner /><NoResults /></div>;
  }

  // Only offer dimensions this spreadsheet actually populates.
  const dimensions: { key: DimKey; label: string; stats: GroupStat[]; filterKey: keyof Filters }[] = [
    { key: 'service', label: 'Services', stats: a.byService, filterKey: 'services' },
    ...(a.dims.account ? [{ key: 'account' as DimKey, label: 'Accounts', stats: a.byAccount, filterKey: 'accounts' as keyof Filters }] : []),
    ...(a.dims.betPlatform ? [{ key: 'platform' as DimKey, label: 'Platforms', stats: a.byPlatform, filterKey: 'platforms' as keyof Filters }] : []),
    ...(a.dims.sport ? [{ key: 'sport' as DimKey, label: 'Sports', stats: a.bySport, filterKey: 'sports' as keyof Filters }] : []),
    ...(a.dims.betType ? [{ key: 'betType' as DimKey, label: 'Bet Types', stats: a.byBetType, filterKey: 'betTypes' as keyof Filters }] : []),
  ];
  const activeDim = dimensions.find((d) => d.key === dim) ?? dimensions[0];
  const min = Number(minBets);
  const rateMetric = metric === 'roi' || metric === 'winRate';

  /** Drill-down: clicking a row scopes the whole app to that value. */
  const drillDown = (key: string) => {
    setFilters((f) => ({ ...f, [activeDim.filterKey]: [key] } as Filters));
  };

  return (
    <div className="space-y-5">
      <ErrorBanner />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={dim}
          onChange={(v) => setDim(v as DimKey)}
          options={dimensions.map((d) => ({ value: d.key, label: d.label }))}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            value={metric}
            onChange={setMetric}
            options={[
              { value: 'profit' as RankMetric, label: 'Profit' },
              { value: 'roi' as RankMetric, label: 'ROI' },
              { value: 'winRate' as RankMetric, label: 'Win Rate' },
            ]}
          />
          <Segmented value={minBets} onChange={setMinBets} options={MIN_BETS_OPTIONS} />
        </div>
      </div>

      {rateMetric && (
        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
          <p>
            Rate metrics are unreliable on small samples — a handful of lucky wins can top the table.
            {min > 0
              ? <> Showing only groups with <b>{min}+ settled bets</b>.</>
              : <> No minimum applied, so treat ⚠️-flagged rows with caution.</>}
          </p>
        </div>
      )}

      <SectionCard
        title={`${activeDim.label} — best to worst`}
        subtitle="Full spread of profit in one view. Click a bar to filter everything to it."
      >
        <DivergingProfitChart stats={activeDim.stats} limit={14} onSelect={drillDown} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          title={`Top ${activeDim.label}`}
          subtitle={`Ranked by ${metric === 'profit' ? 'net profit' : metric === 'roi' ? 'ROI' : 'win rate'} — click a row to drill in`}
        >
          <RankingTable stats={activeDim.stats} metric={metric} limit={15} minBets={min} onSelect={drillDown} />
        </SectionCard>

        <SectionCard title={`Underperforming ${activeDim.label}`} subtitle="Lowest profit first">
          <RankingTable stats={activeDim.stats} metric="profit" dir="asc" limit={15} onSelect={drillDown} />
        </SectionCard>
      </div>
    </div>
  );
}
