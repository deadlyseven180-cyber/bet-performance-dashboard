import { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import {
  availableDimensions, computeKpis, groupBy, oddsDistribution, stakeDistribution,
  profitOverTime, drawdownSeries,
} from '@/services/analytics';
import { applyFilters, previousPeriod } from '@/services/filters';

/** Derives every analytic the UI needs from the currently-filtered bets. */
export function useAnalytics() {
  const { filteredBets, syncStatus, bets, filters } = useData();

  return useMemo(() => {
    const kpis = computeKpis(filteredBets);

    // Same-length window immediately before this one, for "vs previous" deltas.
    const prevFilters = previousPeriod(filters);
    const prevBets = prevFilters ? applyFilters(bets, prevFilters) : null;
    const prevKpis = prevBets && prevBets.length ? computeKpis(prevBets) : null;

    const daily = profitOverTime(filteredBets, 'daily');
    const { maxDrawdown } = drawdownSeries(daily);

    return {
      bets: filteredBets,
      allBets: bets,
      isLoading: syncStatus === 'loading' && bets.length === 0,
      /** Which columns actually have data — drives what the UI renders. */
      dims: availableDimensions(bets),
      kpis,
      prevKpis,
      hasComparison: Boolean(prevKpis),
      maxDrawdown,
      byService: groupBy(filteredBets, 'service'),
      byAccount: groupBy(filteredBets, 'account'),
      byPlatform: groupBy(filteredBets, 'betPlatform'),
      bySport: groupBy(filteredBets, 'sport'),
      byBetType: groupBy(filteredBets, 'betType'),
      byLeague: groupBy(filteredBets, 'league'),
      odds: oddsDistribution(filteredBets),
      stake: stakeDistribution(filteredBets),
    };
  }, [filteredBets, bets, syncStatus, filters]);
}
