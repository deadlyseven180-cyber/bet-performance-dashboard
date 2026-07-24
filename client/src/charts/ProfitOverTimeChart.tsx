import { useMemo } from 'react';
import {
  Area, Bar, CartesianGrid, ComposedChart, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Bet, Granularity } from '@/types';
import { profitOverTime } from '@/services/analytics';
import { useChartColors, profitFill, BRAND } from './chartTheme';
import { makeTooltip } from './ChartTooltip';
import { money, moneyCompact } from '@/utils/format';
import { EmptyState } from '@/components/ui/primitives';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { LineChart as LineIcon } from 'lucide-react';

const TT = makeTooltip((v, name) => (name === 'Cumulative' || name === 'Period Profit' ? money(v) : String(v)));

export type ProfitMode = 'both' | 'cumulative' | 'period';

export function ProfitOverTimeChart({ bets, granularity, mode = 'both', height = 360 }: {
  bets: Bet[]; granularity: Granularity; mode?: ProfitMode; height?: number;
}) {
  const c = useChartColors();
  const isMobile = useIsMobile();
  const data = useMemo(() => profitOverTime(bets, granularity), [bets, granularity]);

  if (!data.length) {
    return <EmptyState icon={<LineIcon className="h-10 w-10" />} title="No settled bets in range" message="Adjust filters or sync data to see profit over time." />;
  }

  return (
    <ResponsiveContainer width="100%" height={isMobile ? Math.min(height, 260) : height}>
      <ComposedChart data={data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND} stopOpacity={0.35} />
            <stop offset="100%" stopColor={BRAND} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: c.axis, fontSize: isMobile ? 9 : 11 }}
          tickLine={false}
          axisLine={{ stroke: c.grid }}
          minTickGap={isMobile ? 24 : 8}
        />
        <YAxis tickFormatter={moneyCompact} tick={{ fill: c.axis, fontSize: isMobile ? 9 : 11 }} tickLine={false} axisLine={false} width={isMobile ? 44 : 54} />
        <Tooltip content={<TT />} cursor={{ fill: c.grid, opacity: 0.4 }} />
        <Legend wrapperStyle={{ fontSize: 12, color: c.text }} />
        {mode !== 'cumulative' && (
          <Bar dataKey="profit" name="Period Profit" radius={[4, 4, 0, 0]} maxBarSize={38}>
            {data.map((d, i) => <Cell key={i} fill={profitFill(d.profit)} fillOpacity={0.85} />)}
          </Bar>
        )}
        {mode !== 'period' && (
          <Area type="monotone" dataKey="cumulative" name="Cumulative" stroke={BRAND} strokeWidth={2.5} fill="url(#cumFill)" />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
