import { useMemo } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { Bet, Granularity } from '@/types';
import type { GroupStat } from '@/services/analytics';
import { drawdownSeries, oddsEdge, profitOverTime } from '@/services/analytics';
import { useChartColors, profitFill, NEGATIVE, BRAND } from './chartTheme';
import { makeTooltip } from './ChartTooltip';
import { money, moneyCompact, percent } from '@/utils/format';
import { EmptyState } from '@/components/ui/primitives';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { Activity } from 'lucide-react';

const MoneyTT = makeTooltip((v) => money(v));
const PctTT = makeTooltip((v) => percent(v));

/**
 * Best → worst in a single view. Replaces having a "top" table and a mirrored
 * "worst" table that say the same thing twice.
 */
export function DivergingProfitChart({ stats, limit = 12, onSelect }: {
  stats: GroupStat[]; limit?: number; onSelect?: (key: string) => void;
}) {
  const c = useChartColors();
  const isMobile = useIsMobile();
  const data = useMemo(
    () => [...stats].sort((a, b) => a.profit - b.profit).slice(0, limit),
    [stats, limit],
  );
  if (!data.length) return <EmptyState icon={<Activity className="h-9 w-9" />} title="No data" />;

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * (isMobile ? 28 : 34) + 30)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: isMobile ? 8 : 20, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} horizontal={false} />
        <XAxis type="number" tickFormatter={moneyCompact} tick={{ fill: c.axis, fontSize: isMobile ? 9 : 11 }} tickLine={false} axisLine={{ stroke: c.grid }} />
        <YAxis type="category" dataKey="key" width={isMobile ? 76 : 120} tick={{ fill: c.text, fontSize: isMobile ? 9 : 11 }} tickLine={false} axisLine={false} />
        <Tooltip content={<MoneyTT />} cursor={{ fill: c.grid, opacity: 0.35 }} />
        <ReferenceLine x={0} stroke={c.axis} />
        <Bar
          dataKey="profit"
          name="Profit"
          radius={3}
          maxBarSize={22}
          onClick={onSelect ? (d: { key?: string }) => d?.key && onSelect(d.key) : undefined}
          cursor={onSelect ? 'pointer' : undefined}
        >
          {data.map((d, i) => <Cell key={i} fill={profitFill(d.profit)} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Underwater curve: how far below the running peak the bankroll sat. */
export function DrawdownChart({ bets, granularity = 'daily' }: { bets: Bet[]; granularity?: Granularity }) {
  const c = useChartColors();
  const isMobile = useIsMobile();
  const { series } = useMemo(
    () => drawdownSeries(profitOverTime(bets, granularity)),
    [bets, granularity],
  );
  if (!series.length) return <EmptyState icon={<Activity className="h-9 w-9" />} title="No settled bets in range" />;

  return (
    <ResponsiveContainer width="100%" height={isMobile ? 200 : 240}>
      <AreaChart data={series} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={NEGATIVE} stopOpacity={0.05} />
            <stop offset="100%" stopColor={NEGATIVE} stopOpacity={0.35} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: c.axis, fontSize: isMobile ? 9 : 11 }} tickLine={false} axisLine={{ stroke: c.grid }} minTickGap={isMobile ? 24 : 8} />
        <YAxis tickFormatter={moneyCompact} tick={{ fill: c.axis, fontSize: isMobile ? 9 : 11 }} tickLine={false} axisLine={false} width={isMobile ? 44 : 54} />
        <Tooltip content={<MoneyTT />} cursor={{ stroke: c.grid }} />
        <Area type="monotone" dataKey="drawdown" name="Drawdown" stroke={NEGATIVE} strokeWidth={2} fill="url(#ddFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/**
 * Actual win rate vs the rate the price implies, per odds band. Bars above the
 * implied line mean you're beating the market at that price.
 */
export function OddsEdgeChart({ bets }: { bets: Bet[] }) {
  const c = useChartColors();
  const isMobile = useIsMobile();
  const data = useMemo(() => oddsEdge(bets), [bets]);
  if (!data.length) return <EmptyState icon={<Activity className="h-9 w-9" />} title="No priced bets in range" />;

  return (
    <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
      <BarChart data={data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: c.axis, fontSize: isMobile ? 9 : 10 }} tickLine={false} axisLine={{ stroke: c.grid }} />
        <YAxis unit="%" tick={{ fill: c.axis, fontSize: isMobile ? 9 : 11 }} tickLine={false} axisLine={false} width={isMobile ? 36 : 44} />
        <Tooltip content={<PctTT />} cursor={{ fill: c.grid, opacity: 0.35 }} />
        <Legend wrapperStyle={{ fontSize: 12, color: c.text }} />
        <Bar dataKey="implied" name="Implied by price" fill={c.dark ? '#475569' : '#cbd5e1'} radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="actual" name="Your win rate" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
