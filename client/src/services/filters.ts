import type { Bet, Filters } from '@/types';

/** Apply the active filter set to a list of bets. All filters combine (AND). */
export function applyFilters(bets: Bet[], f: Filters): Bet[] {
  const search = f.search.trim().toLowerCase();
  return bets.filter((b) => {
    if (f.dateFrom && (!b.date || b.date < f.dateFrom)) return false;
    if (f.dateTo && (!b.date || b.date > f.dateTo)) return false;
    if (f.services.length && !f.services.includes(b.service)) return false;
    if (f.accounts.length && !f.accounts.includes(b.account)) return false;
    if (f.platforms.length && !f.platforms.includes(b.betPlatform)) return false;
    if (f.sports.length && !f.sports.includes(b.sport)) return false;
    if (f.leagues.length && !f.leagues.includes(b.league)) return false;
    if (f.betTypes.length && !f.betTypes.includes(b.betType)) return false;
    if (f.statuses.length && !f.statuses.includes(b.status)) return false;
    if (search) {
      const haystack = [
        b.event, b.selection, b.service, b.account, b.betPlatform,
        b.sport, b.league, b.betType, b.notes,
      ].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.dateFrom) n++;
  if (f.dateTo) n++;
  n += f.services.length + f.accounts.length + f.platforms.length +
       f.sports.length + f.leagues.length + f.betTypes.length + f.statuses.length;
  if (f.search.trim()) n++;
  return n;
}
