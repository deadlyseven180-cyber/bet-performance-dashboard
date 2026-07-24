import { EMPTY_FILTERS, type Bet, type Filters } from '@/types';

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

/**
 * Filters <-> URL query string. Syncing to the URL makes any view shareable:
 * you can send someone a link to "June, NBA, Sharp Alerts" instead of telling
 * them which controls to set.
 */
const LIST_KEYS: [keyof Filters, string][] = [
  ['services', 'svc'], ['accounts', 'acc'], ['platforms', 'plat'],
  ['sports', 'sport'], ['leagues', 'league'], ['betTypes', 'type'],
  ['statuses', 'status'],
];

export function filtersToParams(f: Filters): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.dateFrom) p.from = f.dateFrom;
  if (f.dateTo) p.to = f.dateTo;
  if (f.search.trim()) p.q = f.search.trim();
  for (const [key, param] of LIST_KEYS) {
    const v = f[key] as string[];
    if (v.length) p[param] = v.join('~');
  }
  return p;
}

/** Returns null when the URL carries no filter state at all. */
export function filtersFromParams(p: URLSearchParams): Filters | null {
  const known = ['from', 'to', 'q', ...LIST_KEYS.map(([, k]) => k)];
  if (!known.some((k) => p.has(k))) return null;

  const f: Filters = { ...EMPTY_FILTERS };
  f.dateFrom = p.get('from');
  f.dateTo = p.get('to');
  f.search = p.get('q') ?? '';
  for (const [key, param] of LIST_KEYS) {
    const raw = p.get(param);
    if (raw) (f[key] as string[]) = raw.split('~').filter(Boolean);
  }
  return f;
}

/**
 * The equivalent window immediately before the selected one, so KPIs can be
 * shown as "vs previous period". Returns null when no date range is set
 * (an all-time view has nothing to compare against).
 */
export function previousPeriod(f: Filters): Filters | null {
  if (!f.dateFrom || !f.dateTo) return null;
  const from = new Date(f.dateFrom + 'T00:00:00Z');
  const to = new Date(f.dateTo + 'T00:00:00Z');
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;

  const dayMs = 86400000;
  const spanDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / dayMs) + 1);
  const prevTo = new Date(from.getTime() - dayMs);
  const prevFrom = new Date(prevTo.getTime() - (spanDays - 1) * dayMs);

  return {
    ...f,
    dateFrom: prevFrom.toISOString().slice(0, 10),
    dateTo: prevTo.toISOString().slice(0, 10),
  };
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
