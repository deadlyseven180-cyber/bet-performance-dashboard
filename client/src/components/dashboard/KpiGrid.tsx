import {
  Layers, Clock, Trophy, TrendingDown, Ban, Percent, Wallet, ArrowDownToLine,
  DollarSign, Gauge, Dices, Coins,
} from 'lucide-react';
import type { Kpis } from '@/services/analytics';
import { KpiCard } from './KpiCard';
import { money, percent, number as fmtNum, decimalOdds } from '@/utils/format';

export function KpiGrid({ kpis, loading }: { kpis: Kpis; loading?: boolean }) {
  const cards = [
    { label: 'Total Bets', value: fmtNum(kpis.totalBets), icon: Layers, tone: 'brand' as const },
    { label: 'Pending', value: fmtNum(kpis.pending), sub: money(kpis.pendingStake) + ' at risk', icon: Clock, tone: 'neutral' as const },
    { label: 'Won', value: fmtNum(kpis.won), icon: Trophy, tone: 'positive' as const },
    { label: 'Lost', value: fmtNum(kpis.lost), icon: TrendingDown, tone: 'negative' as const },
    { label: 'Void', value: fmtNum(kpis.void), icon: Ban, tone: 'neutral' as const },
    { label: 'Win Rate', value: percent(kpis.winRate), sub: 'of decided bets', icon: Percent, tone: 'neutral' as const },
    { label: 'Total Stake', value: money(kpis.totalStake), icon: Wallet, tone: 'neutral' as const },
    { label: 'Total Returns', value: money(kpis.totalReturns), icon: ArrowDownToLine, tone: 'neutral' as const },
    { label: 'Net Profit', value: money(kpis.netProfit), icon: DollarSign, tone: kpis.netProfit >= 0 ? 'positive' as const : 'negative' as const },
    { label: 'ROI', value: percent(kpis.roi), sub: 'on settled stake', icon: Gauge, tone: kpis.roi >= 0 ? 'positive' as const : 'negative' as const },
    { label: 'Avg Odds', value: decimalOdds(kpis.avgOdds), icon: Dices, tone: 'neutral' as const },
    { label: 'Avg Stake', value: money(kpis.avgStake), icon: Coins, tone: 'neutral' as const },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {cards.map((c) => (
        <KpiCard key={c.label} {...c} loading={loading} />
      ))}
    </div>
  );
}
