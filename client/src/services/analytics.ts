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

// ── Distinct value helpers (for filter option lists) ─────────────────────
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
