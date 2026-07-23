import type { BetStatus } from '@/types';

const currencyFmt = new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', maximumFractionDigits: 2,
});
const compactCurrency = new Intl.NumberFormat('en-AU', {
  style: 'currency', currency: 'AUD', notation: 'compact', maximumFractionDigits: 1,
});

export const money = (n: number): string => currencyFmt.format(Number.isFinite(n) ? n : 0);
export const moneyCompact = (n: number): string => compactCurrency.format(Number.isFinite(n) ? n : 0);
export const signedMoney = (n: number): string => (n > 0 ? '+' : '') + money(n);

export const percent = (n: number, dp = 1): string =>
  `${(Number.isFinite(n) ? n : 0).toFixed(dp)}%`;

export const decimalOdds = (n: number): string => (n > 0 ? n.toFixed(2) : '—');

export const number = (n: number): string =>
  new Intl.NumberFormat('en-AU').format(Number.isFinite(n) ? n : 0);

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.round((Date.now() - then) / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export const STATUS_LABEL: Record<BetStatus, string> = {
  won: 'Won', lost: 'Lost', void: 'Void', pending: 'Pending', unknown: 'Unknown',
};

export const STATUS_STYLE: Record<BetStatus, string> = {
  won: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  lost: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  void: 'bg-slate-200 text-slate-600 dark:bg-slate-700/60 dark:text-slate-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  unknown: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
};

export const profitColor = (n: number): string =>
  n > 0 ? 'text-emerald-600 dark:text-emerald-400'
    : n < 0 ? 'text-rose-600 dark:text-rose-400'
    : 'text-slate-500 dark:text-slate-400';
