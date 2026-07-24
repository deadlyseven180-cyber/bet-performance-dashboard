import { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import {
  availableDimensions, computeKpis, groupBy, oddsDistribution, stakeDistribution,
} from '@/services/analytics';

/** Derives every analytic the UI needs from the currently-filtered bets. */
export function useAnalytics() {
  const { filteredBets, syncStatus, bets } = useData();

  return useMemo(() => ({
    bets: filteredBets,
    allBets: bets,
    isLoading: syncStatus === 'loading' && bets.length === 0,
    /** Which columns actually have data — drives what the UI renders. */
    dims: availableDimensions(bets),
    kpis: computeKpis(filteredBets),
    byService: groupBy(filteredBets, 'service'),
    byAccount: groupBy(filteredBets, 'account'),
    byPlatform: groupBy(filteredBets, 'betPlatform'),
    bySport: groupBy(filteredBets, 'sport'),
    byBetType: groupBy(filteredBets, 'betType'),
    byLeague: groupBy(filteredBets, 'league'),
    odds: oddsDistribution(filteredBets),
    stake: stakeDistribution(filteredBets),
  }), [filteredBets, bets, syncStatus]);
}
