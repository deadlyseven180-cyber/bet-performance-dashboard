import type { TooltipProps } from 'recharts';
import { useChartColors } from './chartTheme';

type Formatter = (value: number, name: string) => string;

export function makeTooltip(formatter: Formatter) {
  return function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
    const c = useChartColors();
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        className="rounded-xl border px-3 py-2 text-xs shadow-lg"
        style={{ background: c.tooltipBg, borderColor: c.tooltipBorder, color: c.text }}
      >
        {label != null && <p className="mb-1 font-semibold">{label}</p>}
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color ?? p.fill }} />
            <span className="text-slate-400">{p.name}:</span>
            <span className="font-semibold tabular-nums">
              {formatter(Number(p.value), String(p.name))}
            </span>
          </div>
        ))}
      </div>
    );
  };
}
