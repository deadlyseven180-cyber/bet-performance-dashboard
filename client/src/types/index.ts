export type BetStatus = 'won' | 'lost' | 'void' | 'pending' | 'unknown';

export interface Bet {
  id: string;
  date: string | null;
  service: string;
  account: string;
  betPlatform: string;
  sport: string;
  league: string;
  event: string;
  betType: string;
  selection: string;
  stake: number;
  odds: number;
  status: BetStatus;
  statusRaw: string;
  returnAmount: number;
  profit: number;
  notes: string;
  statusInferred: boolean;
  extra: Record<string, string>;
}

export interface SheetMeta {
  spreadsheetId: string;
  spreadsheetTitle: string;
  worksheet: string;
  worksheets: string[];
}

export interface BetsPayload {
  bets: Bet[];
  meta: SheetMeta;
  source: string;
  syncedAt: string;
  recordCount: number;
  hash: string;
  cached?: boolean;
  warnings: string[];
}

export type SyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AppConfig {
  dataSource: 'mock' | 'apikey' | 'service' | 'oauth';
  defaultSpreadsheetId: string;
  defaultWorksheet: string;
}

export interface Filters {
  dateFrom: string | null;
  dateTo: string | null;
  services: string[];
  accounts: string[];
  platforms: string[];
  sports: string[];
  leagues: string[];
  betTypes: string[];
  statuses: BetStatus[];
  search: string;
}

export const EMPTY_FILTERS: Filters = {
  dateFrom: null,
  dateTo: null,
  services: [],
  accounts: [],
  platforms: [],
  sports: [],
  leagues: [],
  betTypes: [],
  statuses: [],
  search: '',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** First and last day of the month we're currently in (local time). */
export function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  return {
    from: `${y}-${pad(m + 1)}-01`,
    to: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
  };
}

/**
 * Filters the dashboard starts with: the present month. Computed lazily so a
 * long-running tab still lands on the right month after midnight/month rollover.
 */
export function defaultFilters(): Filters {
  const { from, to } = currentMonthRange();
  return { ...EMPTY_FILTERS, dateFrom: from, dateTo: to };
}

export type Granularity = 'daily' | 'weekly' | 'monthly';
