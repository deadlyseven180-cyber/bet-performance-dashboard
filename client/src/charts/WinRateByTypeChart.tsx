import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Bet } from '@/types';
import { groupBy } from '@/services/analytics';
import { useChartColors, CATEGORICAL } from './chartTheme';
import { makeTooltip } from './ChartTooltip';
import { percent } from '@/utils/format';
import { EmptyState } from '@/components/ui/primitives';
import { PieChart } from 'lucide-react';

const TT = makeTooltip((v, name) => (name === 'Win Rate' ? percent(v) : String(v)));

export function WinRateByTypeChart({ bets }: { bets: Bet[] }) {
  const c = useChartColors();
  const data = useMemo(
    () => groupBy(bets, 'betType').filter((g) => g.won + g.lost > 0).sort((a, b) => b.winRate - a.winRate),
    [bets],
  );

  if (!data.length) {
    return <EmptyState icon={<PieChart className="h-10 w-10" />} title="No settled bets" message="No decided bets to compute win rate by type." />;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="key" tick={{ fill: c.axis, fontSize: 10 }} tickLine={false} axisLine={{ stroke: c.grid }} interval={0} angle={-12} textAnchor="end" height={50} />
        <YAxis unit="%" domain={[0, 100]} tick={{ fill: c.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip content={<TT />} cursor={{ fill: c.grid, opacity: 0.4 }} />
        <Bar dataKey="winRate" name="Win Rate" radius={[5, 5, 0, 0]} maxBarSize={54}>
          {data.map((_, i) => <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
