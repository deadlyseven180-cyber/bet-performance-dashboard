import { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Bet } from '@/types';
import { oddsDistribution, stakeDistribution } from '@/services/analytics';
import { useChartColors, BRAND, profitFill } from './chartTheme';
import { makeTooltip } from './ChartTooltip';
import { money, moneyCompact, number as fmtNum } from '@/utils/format';
import { useIsMobile } from '@/hooks/useMediaQuery';

const StakeTT = makeTooltip((v, name) => (name === 'Bets' ? fmtNum(v) : money(v)));
const OddsTT = makeTooltip((v, name) => (name === 'Bets' ? fmtNum(v) : money(v)));

/** Stake distribution — frequency bars with an overlaid profit line. */
export function StakeDistributionChart({ bets }: { bets: Bet[] }) {
  const c = useChartColors();
  const { buckets } = useMemo(() => stakeDistribution(bets), [bets]);
  const isMobile = useIsMobile();
  return (
    <ResponsiveContainer width="100%" height={isMobile ? 230 : 260}>
      <ComposedChart data={buckets} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: c.axis, fontSize: isMobile ? 9 : 10 }} tickLine={false} axisLine={{ stroke: c.grid }} />
        <YAxis yAxisId="l" tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
        <YAxis yAxisId="r" orientation="right" tickFormatter={moneyCompact} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
        <Tooltip content={<StakeTT />} cursor={{ fill: c.grid, opacity: 0.4 }} />
        <Bar yAxisId="l" dataKey="count" name="Bets" fill={BRAND} fillOpacity={0.8} radius={[5, 5, 0, 0]} maxBarSize={46} />
        <Line yAxisId="r" type="monotone" dataKey="profit" name="Profit" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Odds distribution — frequency bars coloured by profitability of the band. */
export function OddsDistributionChart({ bets }: { bets: Bet[] }) {
  const c = useChartColors();
  const { buckets } = useMemo(() => oddsDistribution(bets), [bets]);
  const isMobile = useIsMobile();
  return (
    <ResponsiveContainer width="100%" height={isMobile ? 230 : 260}>
      <BarChart data={buckets} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: c.axis, fontSize: isMobile ? 9 : 10 }} tickLine={false} axisLine={{ stroke: c.grid }} />
        <YAxis tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={36} />
        <Tooltip content={<OddsTT />} cursor={{ fill: c.grid, opacity: 0.4 }} />
        <Bar dataKey="count" name="Bets" radius={[5, 5, 0, 0]} maxBarSize={54}>
          {buckets.map((b, i) => <Cell key={i} fill={profitFill(b.profit)} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
