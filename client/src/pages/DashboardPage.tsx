import { useState } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useData } from '@/context/DataContext';
import { KpiSection } from '@/components/dashboard/KpiSection';
import { ErrorBanner } from '@/components/dashboard/StatusBanners';
import { NoResults } from '@/components/dashboard/NoResults';
import { SectionCard, Segmented } from '@/components/ui/primitives';
import { RankingTable } from '@/components/rankings/RankingTable';
import { ProfitOverTimeChart, type ProfitMode } from '@/charts/ProfitOverTimeChart';
import { ProfitByGroupChart } from '@/charts/ProfitByGroupChart';
import { DrawdownChart } from '@/charts/InsightCharts';
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
  const { setFilters } = useData();
  const [gran, setGran] = useState<Granularity>('daily');
  const [mode, setMode] = useState<ProfitMode>('both');
  const [topN, setTopN] = useState('10');
  const n = Number(topN);

  const insights = [
    { label: 'Largest win', value: moneyKpi(a.kpis.largestWin), tone: 'pos' },
    { label: 'Largest loss', value: moneyKpi(a.kpis.largestLoss), tone: 'neg' },
    { label: 'Win streak', value: `${a.kpis.longestWinStreak}`, tone: '' },
    { label: 'Loss streak', value: `${a.kpis.longestLossStreak}`, tone: '' },
    { label: 'Max drawdown', value: moneyKpi(a.maxDrawdown), tone: 'neg-dd' },
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

      <KpiSection kpis={a.kpis} prev={a.prevKpis} loading={a.isLoading} />

      {/* Secondary insights row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {insights.map((it) => (
          <div key={it.label} className="card px-3 py-2.5">
            <div className="min-w-0">
              <p className="label-micro">{it.label}</p>
              <p
                title={it.value}
                className={`truncate text-base font-bold tabular-nums ${it.tone === 'neg' ? profitColor(a.kpis.largestLoss) : it.tone === 'neg-dd' ? profitColor(a.maxDrawdown) : it.tone === 'pos' ? profitColor(a.kpis.largestWin) : 'text-slate-800 dark:text-slate-100'}`}
              >
                {it.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <SectionCard
        title="Profit Over Time"
        subtitle="Cumulative and per-period"
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

      <SectionCard title="Drawdown" subtitle="Below running peak">
        <DrawdownChart bets={a.bets} />
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard
          title="Profit by Service"
          
          action={<Segmented value={topN} onChange={setTopN} options={TOP_N_OPTIONS} />}
        >
          <ProfitByGroupChart stats={a.byService} limit={n} onSelect={(k) => setFilters((f) => ({ ...f, services: [k] }))} />
        </SectionCard>

        {a.dims.sport && (
          <SectionCard title="Profit by Sport" >
            <ProfitByGroupChart stats={a.bySport} limit={n} onSelect={(k) => setFilters((f) => ({ ...f, sports: [k] }))} />
          </SectionCard>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {a.dims.betPlatform && (
          <SectionCard title="Profit by Platform" >
            <ProfitByGroupChart stats={a.byPlatform} limit={n} onSelect={(k) => setFilters((f) => ({ ...f, platforms: [k] }))} />
          </SectionCard>
        )}
        {a.dims.account && (
          <SectionCard title="Profit by Account" >
            <ProfitByGroupChart stats={a.byAccount} limit={n} onSelect={(k) => setFilters((f) => ({ ...f, accounts: [k] }))} />
          </SectionCard>
        )}
        {/* Only meaningful when the sheet actually has a Bet Type column */}
        {a.dims.betType && (
          <SectionCard title="Win Rate by Bet Type" >
            <WinRateByTypeChart bets={a.bets} />
          </SectionCard>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard title="Top Services" >
          <RankingTable stats={a.byService} metric="profit" limit={5} onSelect={(k) => setFilters((f) => ({ ...f, services: [k] }))} />
        </SectionCard>
        <SectionCard title="Underperformers" >
          <RankingTable stats={a.byService} metric="profit" dir="asc" limit={5} onSelect={(k) => setFilters((f) => ({ ...f, services: [k] }))} />
        </SectionCard>
        {a.dims.account && (
          <SectionCard title="Best Accounts" >
            <RankingTable stats={a.byAccount} metric="roi" limit={5} minBets={25} onSelect={(k) => setFilters((f) => ({ ...f, accounts: [k] }))} />
          </SectionCard>
        )}
        {a.dims.betType && (
          <SectionCard title="Best Bet Types" >
            <RankingTable stats={a.byBetType} metric="roi" limit={5} />
          </SectionCard>
        )}
      </div>
    </div>
  );
}
