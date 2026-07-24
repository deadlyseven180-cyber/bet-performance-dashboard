import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { GroupStat } from '@/services/analytics';
import { withOther } from '@/services/analytics';
import { useChartColors, profitFill } from './chartTheme';
import { makeTooltip } from './ChartTooltip';
import { money, moneyCompact } from '@/utils/format';
import { EmptyState } from '@/components/ui/primitives';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { BarChart3 } from 'lucide-react';

const TT = makeTooltip((v) => money(v));

/**
 * Horizontal ranked bar chart of profit by group (service, sport, platform…).
 * Everything beyond the top N is rolled into a single "Other" bar so a long
 * tail is represented rather than silently dropped.
 */
export function ProfitByGroupChart({ stats, limit = 10, height }: { stats: GroupStat[]; limit?: number; height?: number }) {
  const c = useChartColors();
  const isMobile = useIsMobile();
  const data = withOther(stats, limit).reverse();

  if (!data.length) {
    return <EmptyState icon={<BarChart3 className="h-10 w-10" />} title="No data" message="No settled bets match the current filters." />;
  }

  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(200, data.length * (isMobile ? 32 : 40) + 20)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: isMobile ? 8 : 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} horizontal={false} />
        <XAxis type="number" tickFormatter={moneyCompact} tick={{ fill: c.axis, fontSize: isMobile ? 9 : 11 }} tickLine={false} axisLine={{ stroke: c.grid }} />
        <YAxis type="category" dataKey="key" width={isMobile ? 76 : 110} tick={{ fill: c.text, fontSize: isMobile ? 9 : 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<TT />} cursor={{ fill: c.grid, opacity: 0.4 }} />
        <Bar dataKey="profit" name="Profit" radius={[0, 5, 5, 0]} maxBarSize={26}>
          {data.map((d, i) => <Cell key={i} fill={profitFill(d.profit)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
