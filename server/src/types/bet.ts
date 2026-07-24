/** Canonical settlement status used across the whole application. */
export type BetStatus = 'won' | 'lost' | 'void' | 'pending' | 'unknown';

/** A single normalized betting record. */
export interface Bet {
  id: string;
  date: string | null; // ISO date string (yyyy-mm-dd) or null if unparseable
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
  /** The original status text from the sheet, preserved for display. */
  statusRaw: string;
  returnAmount: number;
  profit: number;
  notes: string;
  /** True when the status was inferred from profit/return rather than stated. */
  statusInferred: boolean;
  /** Any unmapped columns, preserved so nothing is lost. */
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
  /** Content fingerprint — lets the client skip re-render when unchanged. */
  hash: string;
  /** True when this response was served from the short-lived server cache. */
  cached?: boolean;
  /** Non-fatal warnings, e.g. missing optional columns. */
  warnings: string[];
}
