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

export type Granularity = 'daily' | 'weekly' | 'monthly';
