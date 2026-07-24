import type { Bet, BetStatus, Granularity } from '@/types';

/**
 * The analytics engine. Pure functions over an array of normalized Bets —
 * completely decoupled from Google Sheets. Every calculation the dashboard
 * needs lives here, so it can be unit-tested and reused (e.g. server-side)
 * without any UI dependency.
 */

const isSettled = (b: Bet) => b.status === 'won' || b.status === 'lost' || b.status === 'void';
const isDecided = (b: Bet) => b.status === 'won' || b.status === 'lost'; // excludes void for win rate

export interface Kpis {
  totalBets: number;
  pending: number;
  won: number;
  lost: number;
  void: number;
  winRate: number; // %
  totalStake: number;
  settledStake: number;
  pendingStake: number;
  totalReturns: number;
  netProfit: number;
  roi: number; // %
  avgOdds: number;
  avgStake: number;
  largestWin: number;
  largestLoss: number;
  longestWinStreak: number;
  longestLossStreak: number;
}

export function computeKpis(bets: Bet[]): Kpis {
  let won = 0, lost = 0, voidCount = 0, pending = 0;
  let totalStake = 0, settledStake = 0, pendingStake = 0;
  let totalReturns = 0, netProfit = 0;
  let oddsSum = 0, oddsCount = 0;
  let largestWin = 0, largestLoss = 0;

  for (const b of bets) {
    totalStake += b.stake;
    if (b.odds > 0) { oddsSum += b.odds; oddsCount++; }

    switch (b.status) {
      case 'won': won++; break;
      case 'lost': lost++; break;
      case 'void': voidCount++; break;
      case 'pending': pending++; break;
      default: break;
    }

    if (b.status === 'pending' || b.status === 'unknown') {
      pendingStake += b.stake;
    } else {
      settledStake += b.stake;
      totalReturns += b.returnAmount;
      netProfit += b.profit;
      if (b.profit > largestWin) largestWin = b.profit;
      if (b.profit < largestLoss) largestLoss = b.profit;
    }
  }

  const decided = won + lost;
  const winRate = decided > 0 ? (won / decided) * 100 : 0;
  const roi = settledStake > 0 ? (netProfit / settledStake) * 100 : 0;

  const { longestWinStreak, longestLossStreak } = computeStreaks(bets);

  return {
    totalBets: bets.length,
    pending, won, lost, void: voidCount,
    winRate,
    totalStake,
    settledStake,
    pendingStake,
    totalReturns,
    netProfit,
    roi,
    avgOdds: oddsCount > 0 ? oddsSum / oddsCount : 0,
    avgStake: bets.length > 0 ? totalStake / bets.length : 0,
    largestWin,
    largestLoss,
    longestWinStreak,
    longestLossStreak,
  };
}

/** Longest winning / losing streaks, ordered chronologically. */
export function computeStreaks(bets: Bet[]): { longestWinStreak: number; longestLossStreak: number } {
  const ordered = [...bets]
    .filter((b) => b.status === 'won' || b.status === 'lost')
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  let winStreak = 0, lossStreak = 0, maxWin = 0, maxLoss = 0;
  for (const b of ordered) {
    if (b.status === 'won') {
      winStreak++; lossStreak = 0;
      if (winStreak > maxWin) maxWin = winStreak;
    } else {
      lossStreak++; winStreak = 0;
      if (lossStreak > maxLoss) maxLoss = lossStreak;
    }
  }
  return { longestWinStreak: maxWin, longestLossStreak: maxLoss };
}

// ── Time series ──────────────────────────────────────────────────────────
export interface TimePoint {
  period: string;
  label: string;
  profit: number;
  cumulative: number;
  stake: number;
  bets: number;
}

function periodKey(dateIso: string, g: Granularity): { key: string; label: string } {
  const d = new Date(dateIso + 'T00:00:00Z');
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (g === 'monthly') {
    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    return { key, label: d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit', timeZone: 'UTC' }) };
  }
  if (g === 'weekly') {
    // ISO-ish week: Monday start.
    const tmp = new Date(Date.UTC(y, m, d.getUTCDate()));
    const day = (tmp.getUTCDay() + 6) % 7;
    tmp.setUTCDate(tmp.getUTCDate() - day);
    const key = tmp.toISOString().slice(0, 10);
    return { key, label: tmp.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', timeZone: 'UTC' }) };
  }
  const key = dateIso;
  return { key, label: d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', timeZone: 'UTC' }) };
}

export function profitOverTime(bets: Bet[], g: Granularity): TimePoint[] {
  const map = new Map<string, TimePoint>();
  for (const b of bets) {
    if (!b.date || b.status === 'pending' || b.status === 'unknown') continue;
    const { key, label } = periodKey(b.date, g);
    const existing = map.get(key) ?? { period: key, label, profit: 0, cumulative: 0, stake: 0, bets: 0 };
    existing.profit += b.profit;
    existing.stake += b.stake;
    existing.bets += 1;
    map.set(key, existing);
  }
  const points = [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
  let cum = 0;
  for (const p of points) { cum += p.profit; p.cumulative = cum; }
  return points;
}

// ── Group breakdowns / rankings ──────────────────────────────────────────
export interface GroupStat {
  key: string;
  bets: number;
  settled: number;
  won: number;
  lost: number;
  stake: number;
  returns: number;
  profit: number;
  roi: number;
  winRate: number;
  avgOdds: number;
}

export function groupBy(bets: Bet[], field: keyof Bet): GroupStat[] {
  const map = new Map<string, Bet[]>();
  for (const b of bets) {
    const raw = b[field];
    const key = (raw == null || raw === '' ? 'Unknown' : String(raw));
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(b);
  }

  const stats: GroupStat[] = [];
  for (const [key, group] of map) {
    let won = 0, lost = 0, settled = 0, stake = 0, returns = 0, profit = 0, oddsSum = 0, oddsCount = 0;
    for (const b of group) {
      stake += b.stake;
      if (b.odds > 0) { oddsSum += b.odds; oddsCount++; }
      if (isSettled(b)) {
        settled++;
        returns += b.returnAmount;
        profit += b.profit;
        if (b.status === 'won') won++;
        if (b.status === 'lost') lost++;
      }
    }
    const decided = won + lost;
    stats.push({
      key,
      bets: group.length,
      settled,
      won,
      lost,
      stake,
      returns,
      profit,
      roi: stake > 0 ? (profit / stake) * 100 : 0,
      winRate: decided > 0 ? (won / decided) * 100 : 0,
      avgOdds: oddsCount > 0 ? oddsSum / oddsCount : 0,
    });
  }
  return stats;
}

export type RankMetric = 'profit' | 'roi' | 'winRate';

export function rankGroups(stats: GroupStat[], metric: RankMetric, dir: 'desc' | 'asc' = 'desc'): GroupStat[] {
  const sorted = [...stats].sort((a, b) => b[metric] - a[metric]);
  return dir === 'asc' ? sorted.reverse() : sorted;
}

// ── Distributions ────────────────────────────────────────────────────────
export interface Bucket {
  label: string;
  count: number;
  profit: number;
  stake: number;
}

const ODDS_BANDS: [number, number, string][] = [
  [1, 1.5, '1.00–1.50'],
  [1.5, 2.0, '1.50–2.00'],
  [2.0, 3.0, '2.00–3.00'],
  [3.0, 5.0, '3.00–5.00'],
  [5.0, 10.0, '5.00–10.0'],
  [10.0, Infinity, '10.0+'],
];

export function oddsDistribution(bets: Bet[]): {
  buckets: Bucket[];
  avg: number;
  highest: number;
  lowest: number;
} {
  const buckets: Bucket[] = ODDS_BANDS.map(([, , label]) => ({ label, count: 0, profit: 0, stake: 0 }));
  let sum = 0, count = 0, highest = 0, lowest = Infinity;
  for (const b of bets) {
    if (b.odds <= 0) continue;
    sum += b.odds; count++;
    if (b.odds > highest) highest = b.odds;
    if (b.odds < lowest) lowest = b.odds;
    const idx = ODDS_BANDS.findIndex(([lo, hi]) => b.odds >= lo && b.odds < hi);
    if (idx >= 0) {
      buckets[idx].count++;
      buckets[idx].stake += b.stake;
      if (isSettled(b)) buckets[idx].profit += b.profit;
    }
  }
  return {
    buckets,
    avg: count > 0 ? sum / count : 0,
    highest: highest || 0,
    lowest: lowest === Infinity ? 0 : lowest,
  };
}

export function stakeDistribution(bets: Bet[]): { buckets: Bucket[]; avg: number } {
  const stakes = bets.map((b) => b.stake).filter((s) => s > 0);
  if (!stakes.length) return { buckets: [], avg: 0 };
  const max = Math.max(...stakes);
  const bandSize = Math.max(1, Math.ceil(max / 6 / 10) * 10);
  const buckets: Bucket[] = [];
  for (let i = 0; i < 6; i++) {
    const lo = i * bandSize;
    const hi = (i + 1) * bandSize;
    buckets.push({ label: `${lo}–${hi}`, count: 0, profit: 0, stake: 0 });
  }
  for (const b of bets) {
    if (b.stake <= 0) continue;
    let idx = Math.floor(b.stake / bandSize);
    if (idx >= buckets.length) idx = buckets.length - 1;
    buckets[idx].count++;
    buckets[idx].stake += b.stake;
    if (isSettled(b)) buckets[idx].profit += b.profit;
  }
  const avg = stakes.reduce((a, s) => a + s, 0) / stakes.length;
  return { buckets, avg };
}

// ── Drawdown ─────────────────────────────────────────────────────────────
export interface DrawdownPoint {
  label: string;
  cumulative: number;
  /** Distance below the running peak — always <= 0. */
  drawdown: number;
}

/**
 * Peak-to-trough decline of the cumulative profit curve. For a syndicate the
 * worst drawdown is as important as the headline profit: it's the losing run
 * you had to survive.
 */
export function drawdownSeries(points: TimePoint[]): { series: DrawdownPoint[]; maxDrawdown: number } {
  let peak = 0;
  let maxDrawdown = 0;
  const series = points.map((p) => {
    if (p.cumulative > peak) peak = p.cumulative;
    const dd = p.cumulative - peak;
    if (dd < maxDrawdown) maxDrawdown = dd;
    return { label: p.label, cumulative: p.cumulative, drawdown: dd };
  });
  return { series, maxDrawdown };
}

// ── Odds edge: are we beating the book? ──────────────────────────────────
export interface OddsEdgeRow {
  label: string;
  /** Win rate the market implies (1/odds, averaged over the band). */
  implied: number;
  /** Win rate actually achieved. */
  actual: number;
  bets: number;
  profit: number;
}

export function oddsEdge(bets: Bet[]): OddsEdgeRow[] {
  const rows: OddsEdgeRow[] = ODDS_BANDS.map(([, , label]) => ({ label, implied: 0, actual: 0, bets: 0, profit: 0 }));
  const impliedSum = new Array(ODDS_BANDS.length).fill(0);
  const decided = new Array(ODDS_BANDS.length).fill(0);
  const won = new Array(ODDS_BANDS.length).fill(0);

  for (const b of bets) {
    if (b.odds <= 1) continue;
    const i = ODDS_BANDS.findIndex(([lo, hi]) => b.odds >= lo && b.odds < hi);
    if (i < 0) continue;
    rows[i].bets++;
    impliedSum[i] += 1 / b.odds;
    if (isSettled(b)) rows[i].profit += b.profit;
    if (b.status === 'won' || b.status === 'lost') {
      decided[i]++;
      if (b.status === 'won') won[i]++;
    }
  }

  return rows.map((r, i) => ({
    ...r,
    implied: r.bets > 0 ? (impliedSum[i] / r.bets) * 100 : 0,
    actual: decided[i] > 0 ? (won[i] / decided[i]) * 100 : 0,
  })).filter((r) => r.bets > 0);
}

// ── Monthly summary table ────────────────────────────────────────────────
export interface MonthRow {
  month: string;
  label: string;
  bets: number;
  stake: number;
  returns: number;
  profit: number;
  roi: number;
  winRate: number;
}

export function monthlySummary(bets: Bet[]): MonthRow[] {
  const map = new Map<string, MonthRow>();
  for (const b of bets) {
    if (!b.date) continue;
    const month = b.date.slice(0, 7);
    let row = map.get(month);
    if (!row) {
      const d = new Date(month + '-01T00:00:00Z');
      row = {
        month,
        label: d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
        bets: 0, stake: 0, returns: 0, profit: 0, roi: 0, winRate: 0,
      };
      map.set(month, row);
    }
    row.bets++;
    row.stake += b.stake;
    if (isSettled(b)) {
      row.returns += b.returnAmount;
      row.profit += b.profit;
    }
  }
  const rows = [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
  for (const r of rows) {
    const inMonth = bets.filter((b) => b.date?.startsWith(r.month));
    const won = inMonth.filter((b) => b.status === 'won').length;
    const lost = inMonth.filter((b) => b.status === 'lost').length;
    r.roi = r.stake > 0 ? (r.profit / r.stake) * 100 : 0;
    r.winRate = won + lost > 0 ? (won / (won + lost)) * 100 : 0;
  }
  return rows;
}

// ── Distinct value helpers (for filter option lists) ─────────────────────
/**
 * Which dimensions actually carry data in this spreadsheet. Sheets vary wildly
 * — a column that is entirely blank should not produce an empty chart, filter
 * or table column. The UI reads this so it adapts itself to the source data,
 * and features reappear automatically if the column is populated later.
 */
export interface Dimensions {
  service: boolean;
  account: boolean;
  betPlatform: boolean;
  sport: boolean;
  league: boolean;
  betType: boolean;
  event: boolean;
  selection: boolean;
  notes: boolean;
}

export function availableDimensions(bets: Bet[]): Dimensions {
  const has = (f: keyof Bet): boolean => {
    let seen: string | null = null;
    for (const b of bets) {
      const v = b[f];
      if (v == null) continue;
      const s = String(v).trim();
      if (!s || s === 'Unknown') continue;
      if (seen === null) seen = s;
      else if (seen !== s) return true; // at least two distinct real values
    }
    return seen !== null; // a single real value still counts as present
  };
  return {
    service: has('service'), account: has('account'), betPlatform: has('betPlatform'),
    sport: has('sport'), league: has('league'), betType: has('betType'),
    event: has('event'), selection: has('selection'), notes: has('notes'),
  };
}

/**
 * Data-entry cleanup: bookmaker names sometimes get typed into the Sport
 * column. Rather than hardcoding a bookie list, we treat any sport value that
 * also appears as a betting platform in this same dataset as mis-entered.
 */
export function cleanSportNoise(bets: Bet[]): Bet[] {
  const platforms = new Set(
    bets.map((b) => b.betPlatform.trim().toLowerCase()).filter((p) => p && p !== 'unknown'),
  );
  if (!platforms.size) return bets;
  let changed = false;
  const out = bets.map((b) => {
    if (platforms.has(b.sport.trim().toLowerCase())) {
      changed = true;
      return { ...b, sport: 'Unknown' };
    }
    return b;
  });
  return changed ? out : bets;
}

/**
 * Keep the top N groups and roll everything else into a single "Other" row, so
 * a long tail (e.g. 125 accounts) doesn't silently hide half the data.
 */
export function withOther(stats: GroupStat[], topN: number): GroupStat[] {
  const sorted = [...stats].sort((a, b) => b.profit - a.profit);
  if (sorted.length <= topN) return sorted;
  const head = sorted.slice(0, topN);
  const tail = sorted.slice(topN);
  const other = tail.reduce<GroupStat>((acc, g) => ({
    key: `Other (${tail.length})`,
    bets: acc.bets + g.bets,
    settled: acc.settled + g.settled,
    won: acc.won + g.won,
    lost: acc.lost + g.lost,
    stake: acc.stake + g.stake,
    returns: acc.returns + g.returns,
    profit: acc.profit + g.profit,
    roi: 0, winRate: 0, avgOdds: 0,
  }), { key: 'Other', bets: 0, settled: 0, won: 0, lost: 0, stake: 0, returns: 0, profit: 0, roi: 0, winRate: 0, avgOdds: 0 });
  other.roi = other.stake > 0 ? (other.profit / other.stake) * 100 : 0;
  other.winRate = other.won + other.lost > 0 ? (other.won / (other.won + other.lost)) * 100 : 0;
  return [...head, other];
}

export function distinctValues(bets: Bet[], field: keyof Bet): string[] {
  const set = new Set<string>();
  for (const b of bets) {
    const v = b[field];
    if (v != null && v !== '') set.add(String(v));
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export const STATUS_OPTIONS: BetStatus[] = ['won', 'lost', 'void', 'pending', 'unknown'];
export { isSettled, isDecided };
