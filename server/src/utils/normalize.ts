import type { Bet, BetStatus } from '../types/bet.js';

/**
 * Flexible header matching. The spreadsheet structure is NEVER hardcoded:
 * we map many possible header spellings onto our canonical field names so
 * users can keep their own column titles.
 */
const FIELD_ALIASES: Record<string, string[]> = {
  date: ['date', 'day', 'placed', 'datetime', 'timestamp', 'bet date'],
  service: ['service', 'tipster', 'tipper', 'source', 'provider', 'group'],
  account: ['account', 'bowler name', 'bowler', 'user', 'punter', 'profile', 'wallet', 'holder'],
  betPlatform: [
    'bet platform', 'platform', 'bookmaker', 'bookie', 'book', 'sportsbook',
    'exchange', 'agency', 'operator',
  ],
  sport: ['sport', 'category'],
  league: ['league', 'competition', 'comp', 'tournament', 'division'],
  event: ['event', 'match', 'game', 'fixture', 'matchup'],
  betType: ['bet type', 'type', 'market', 'bet market', 'wager type'],
  selection: ['selection', 'pick', 'runner', 'bet', 'tip', 'outcome'],
  stake: ['stake', 'risk', 'wager', 'amount', 'bet amount', 'units', 'unit'],
  odds: ['odds', 'price', 'decimal odds', 'dec odds', 'odd'],
  status: ['status', 'result', 'outcome result', 'settled', 'won/lost', 'w/l'],
  returnAmount: [
    'return amount', 'return', 'returns', 'payout', 'collect', 'won amount',
    'gross return', 'total return',
  ],
  profit: ['profit', 'p/l', 'pnl', 'p&l', 'profit/loss', 'net', 'net profit'],
  notes: ['notes', 'note', 'comment', 'comments', 'remark', 'remarks'],
};

const CANONICAL_FIELDS = Object.keys(FIELD_ALIASES);

const clean = (s: string): string =>
  s.toLowerCase().replace(/[_\-/\\.]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Build a header -> canonical field lookup from the sheet's first row. */
export function mapHeaders(headers: string[]): {
  index: Record<string, number>;
  missing: string[];
} {
  const index: Record<string, number> = {};
  const cleaned = headers.map(clean);

  for (const field of CANONICAL_FIELDS) {
    const aliases = FIELD_ALIASES[field];
    let found = -1;
    // Exact alias match first, then "contains" fallback.
    for (const alias of aliases) {
      const i = cleaned.indexOf(alias);
      if (i !== -1) { found = i; break; }
    }
    if (found === -1) {
      for (const alias of aliases) {
        const i = cleaned.findIndex((h) => h.includes(alias));
        if (i !== -1) { found = i; break; }
      }
    }
    if (found !== -1) index[field] = found;
  }

  const importantOptional = ['service', 'account', 'betPlatform', 'sport', 'betType'];
  const missing = importantOptional.filter((f) => !(f in index));
  return { index, missing };
}

/** Parse messy numeric strings: "$1,250.50", "(50)", "1.234,50", "2u". */
export function parseNumber(input: unknown): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (input == null) return 0;
  let s = String(input).trim();
  if (!s) return 0;

  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  // Strip currency symbols, unit letters and spaces, keep digits/.,-
  s = s.replace(/[^\d.,-]/g, '');
  if (!s) return 0;

  // Decide decimal separator when both , and . are present.
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.'); // European 1.234,56
    } else {
      s = s.replace(/,/g, ''); // US 1,234.56
    }
  } else if (s.includes(',')) {
    // Ambiguous: treat comma as decimal only if it looks like one (,dd)
    s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '');
  }

  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
// Year assumed when a date omits it (e.g. "24 Mar"). Uses the current year.
const DEFAULT_YEAR = new Date().getUTCFullYear();

/** Best-effort date parsing into an ISO yyyy-mm-dd string. */
export function parseDate(input: unknown): string | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;

  // "24 Mar", "24 March 2025", "24-Mar-25"  (day first)
  const dMon = s.match(/^(\d{1,2})[\s\-]+([A-Za-z]{3,})\.?(?:[\s\-]+(\d{2,4}))?$/);
  if (dMon) {
    const month = MONTHS[dMon[2].slice(0, 3).toLowerCase()];
    if (month) {
      const day = Number(dMon[1]);
      let year = dMon[3] ? Number(dMon[3]) : DEFAULT_YEAR;
      if (year < 100) year += 2000;
      const d = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }

  // "Mar 24", "March 24 2025"  (month first)
  const monD = s.match(/^([A-Za-z]{3,})\.?[\s\-]+(\d{1,2})(?:,?[\s\-]+(\d{2,4}))?$/);
  if (monD) {
    const month = MONTHS[monD[1].slice(0, 3).toLowerCase()];
    if (month) {
      const day = Number(monD[2]);
      let year = monD[3] ? Number(monD[3]) : DEFAULT_YEAR;
      if (year < 100) year += 2000;
      const d = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }

  // dd/mm/yyyy or dd-mm-yyyy (Australian default) and mm/dd/yyyy heuristic.
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (m) {
    let [, a, b, y] = m;
    let day = Number(a);
    let month = Number(b);
    // If first part can't be a day, assume US mm/dd order.
    if (day > 12 && month <= 12) { /* dd/mm keeps as-is */ }
    else if (month > 12 && day <= 12) { [day, month] = [month, day]; }
    let year = Number(y);
    if (year < 100) year += 2000;
    const d = new Date(Date.UTC(year, month - 1, day));
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

const WON = ['won', 'win', 'w', 'winner', 'cashout+', 'green', 'success', 'settled won'];
const LOST = ['lost', 'lose', 'loss', 'l', 'loser', 'red', 'settled lost', 'busted'];
const VOID = ['void', 'voided', 'push', 'cancelled', 'canceled', 'refund', 'draw no bet', 'dnb', 'no bet', 'nr', 'scratch'];
const PENDING = ['pending', 'open', 'unsettled', 'live', 'in play', 'inplay', 'placed', 'active', 'running'];

function matchStatusText(raw: string): BetStatus | null {
  const t = clean(raw);
  if (!t) return null;
  if (WON.includes(t)) return 'won';
  if (LOST.includes(t)) return 'lost';
  if (VOID.includes(t)) return 'void';
  if (PENDING.includes(t)) return 'pending';
  // Partial contains fallback (e.g. "Won (cash out)").
  if (WON.some((w) => t.startsWith(w))) return 'won';
  if (LOST.some((w) => t.startsWith(w))) return 'lost';
  if (VOID.some((w) => t.includes(w))) return 'void';
  if (PENDING.some((w) => t.includes(w))) return 'pending';
  return null;
}

/**
 * Determine whether a bet won or lost.
 *
 * 1. Trust the Status column when it clearly says won/lost/void/pending.
 * 2. When status is missing or ambiguous, INFER win/loss from the money:
 *      profit > 0            -> won
 *      profit < 0            -> lost
 *      profit == 0 & return  -> void (stake returned) else pending
 *      return > stake        -> won
 *      return == 0 (settled) -> lost
 */
export function resolveStatus(
  rawStatus: string,
  profit: number,
  returnAmount: number,
  stake: number,
  hasProfit: boolean,
  hasReturn: boolean,
): { status: BetStatus; inferred: boolean } {
  const stated = matchStatusText(rawStatus);
  if (stated && stated !== 'pending') return { status: stated, inferred: false };
  if (stated === 'pending') {
    // A "pending" row that already has settlement money is actually settled.
    if (hasProfit && profit !== 0) return { status: profit > 0 ? 'won' : 'lost', inferred: true };
    return { status: 'pending', inferred: false };
  }

  // No usable status text — infer from the numbers.
  if (hasProfit) {
    if (profit > 0.0001) return { status: 'won', inferred: true };
    if (profit < -0.0001) return { status: 'lost', inferred: true };
    if (hasReturn) {
      if (returnAmount > 0.0001 && Math.abs(returnAmount - stake) < 0.01)
        return { status: 'void', inferred: true };
      if (returnAmount <= 0.0001) return { status: 'lost', inferred: true };
    }
    return { status: 'void', inferred: true };
  }

  if (hasReturn) {
    if (returnAmount > stake + 0.0001) return { status: 'won', inferred: true };
    if (Math.abs(returnAmount - stake) < 0.01 && stake > 0) return { status: 'void', inferred: true };
    if (returnAmount <= 0.0001) return { status: 'lost', inferred: true };
  }

  return { status: 'unknown', inferred: false };
}

/** Compute profit/return consistently, filling whichever value is missing. */
function reconcileMoney(
  status: BetStatus,
  stake: number,
  odds: number,
  profit: number,
  returnAmount: number,
  hasProfit: boolean,
  hasReturn: boolean,
): { profit: number; returnAmount: number } {
  let p = profit;
  let r = returnAmount;

  if (!hasReturn) {
    if (hasProfit) r = p + stake;
    else if (status === 'won') r = odds > 0 ? stake * odds : stake;
    else if (status === 'void') r = stake;
    else if (status === 'lost') r = 0;
    else r = 0;
  }
  if (!hasProfit) {
    if (status === 'pending' || status === 'unknown') p = 0;
    else p = r - stake;
  }
  return { profit: p, returnAmount: r };
}

export interface NormalizeResult {
  bets: Bet[];
  warnings: string[];
}

/** Rows whose Service/Account/Bookie is really a cashflow entry, not a bet. */
const NON_BET = /^(withdrawal|deposit|bank|transfer|adjustment|payout|top ?up|balance|rollover)$/i;

/**
 * Locate the real header row. Many sheets have title/label rows above the
 * table, so we scan the first rows and pick the one that maps to the most
 * canonical fields (rather than blindly assuming row 0).
 */
function findHeaderRow(rows: string[][]): number {
  const scan = Math.min(rows.length, 20);
  let bestRow = 0;
  let bestScore = -1;
  for (let i = 0; i < scan; i++) {
    const { index } = mapHeaders((rows[i] ?? []).map((h) => String(h ?? '')));
    const score = Object.keys(index).length;
    if (score > bestScore) { bestScore = score; bestRow = i; }
    if (score >= 6) break; // a clearly strong header row — stop early
  }
  return bestRow;
}

/** Turn raw sheet rows into normalized Bet records (header row auto-detected). */
export function normalizeRows(rows: string[][]): NormalizeResult {
  const warnings: string[] = [];
  if (!rows.length) return { bets: [], warnings: ['The worksheet is empty.'] };

  const headerRowIdx = findHeaderRow(rows);
  const headers = (rows[headerRowIdx] ?? []).map((h) => String(h ?? ''));
  const { index, missing } = mapHeaders(headers);
  if (headerRowIdx > 0) {
    warnings.push(`Header row detected on row ${headerRowIdx + 1} (rows above it were skipped).`);
  }
  if (missing.length) {
    warnings.push(
      `Optional column(s) not found and skipped safely: ${missing.join(', ')}.`,
    );
  }

  const mappedIdx = new Set(Object.values(index));
  // Bound "extra" capture to the mapped table width so side summary tables
  // (e.g. embedded stats blocks far to the right) don't pollute records.
  const mappedList = [...mappedIdx];
  const minCol = mappedList.length ? Math.min(...mappedList) : 0;
  const maxCol = mappedList.length ? Math.max(...mappedList) : headers.length - 1;

  const get = (row: string[], field: string): string => {
    const i = index[field];
    return i === undefined ? '' : String(row[i] ?? '').trim();
  };

  const bets: Bet[] = [];
  let skippedCashflow = 0;
  let skippedBlank = 0;
  for (let r = headerRowIdx + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => String(c ?? '').trim() === '')) continue;

    const service = get(row, 'service');
    const account = get(row, 'account');
    const platform = get(row, 'betPlatform');
    // Skip cashflow / non-bet bookkeeping rows.
    if (NON_BET.test(service) || NON_BET.test(account) || NON_BET.test(platform)) {
      skippedCashflow++;
      continue;
    }

    const stake = parseNumber(get(row, 'stake'));
    const odds = parseNumber(get(row, 'odds'));

    const profitRaw = get(row, 'profit');
    const returnRaw = get(row, 'returnAmount');
    const hasProfit = profitRaw !== '';
    const hasReturn = returnRaw !== '';
    const profit0 = parseNumber(profitRaw);
    const return0 = parseNumber(returnRaw);

    const statusRaw = get(row, 'status');
    const { status, inferred } = resolveStatus(
      statusRaw, profit0, return0, stake, hasProfit, hasReturn,
    );
    const { profit, returnAmount } = reconcileMoney(
      status, stake, odds, profit0, return0, hasProfit, hasReturn,
    );

    // Structurally empty row (a spacer or stray cell): nothing identifies a
    // bet and there is no money attached, so it would only ever show up as an
    // "Unknown" line with zeros.
    if (!get(row, 'selection') && !get(row, 'event') && stake === 0 && profit === 0 && returnAmount === 0) {
      skippedBlank++;
      continue;
    }

    const extra: Record<string, string> = {};
    headers.forEach((h, i) => {
      if (i >= minCol && i <= maxCol && !mappedIdx.has(i) && h.trim()) {
        const v = String(row[i] ?? '').trim();
        if (v) extra[h.trim()] = v;
      }
    });

    bets.push({
      id: `bet-${r}`,
      date: parseDate(get(row, 'date')),
      service: service || 'Unknown',
      account: account || 'Unknown',
      betPlatform: platform || 'Unknown',
      sport: get(row, 'sport') || 'Unknown',
      league: get(row, 'league') || '',
      event: get(row, 'event') || '',
      betType: get(row, 'betType') || 'Unknown',
      selection: get(row, 'selection') || '',
      stake,
      odds,
      status,
      statusRaw: statusRaw || (inferred ? `${status} (inferred)` : ''),
      returnAmount,
      profit,
      notes: get(row, 'notes'),
      statusInferred: inferred,
      extra,
    });
  }

  if (skippedCashflow > 0) {
    warnings.push(`Ignored ${skippedCashflow} non-bet row(s) (deposits/withdrawals/bank).`);
  }
  if (skippedBlank > 0) {
    warnings.push(`Ignored ${skippedBlank} empty row(s).`);
  }
  if (!bets.length) warnings.push('No data rows found beneath the header row.');
  return { bets, warnings };
}
