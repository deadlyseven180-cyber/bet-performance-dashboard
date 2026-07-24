import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SectionCard } from '@/components/ui/primitives';
import { BetHistoryTable } from '@/components/history/BetHistoryTable';
import { ErrorBanner } from '@/components/dashboard/StatusBanners';
import { useToast } from '@/components/ui/Toast';
import { moneyKpi, profitColor } from '@/utils/format';

export function HistoryPage() {
  const { filteredBets, bets } = useData();
  const a = useAnalytics();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  // Export libs are heavy (~380KB) — load them only when actually exporting.
  const onExport = async () => {
    setBusy(true);
    try {
      const { exportCsv } = await import('@/services/export');
      exportCsv(filteredBets);
      toast.success('Exported', 'CSV downloaded for the filtered records.');
    } catch {
      toast.error('Export failed', 'Could not generate the CSV.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <ErrorBanner />
      {/* Totals for exactly what's on screen, so you don't have to switch tabs */}
      <div className="card grid grid-cols-2 gap-px overflow-hidden bg-slate-100 sm:grid-cols-4 dark:bg-slate-800">
        {[
          { label: 'Bets shown', value: filteredBets.length.toLocaleString(), tone: '' },
          { label: 'Staked', value: moneyKpi(a.kpis.totalStake), tone: '' },
          { label: 'Returned', value: moneyKpi(a.kpis.totalReturns), tone: '' },
          { label: 'Profit', value: `${a.kpis.netProfit > 0 ? '+' : ''}${moneyKpi(a.kpis.netProfit)}`, tone: profitColor(a.kpis.netProfit) },
        ].map((s) => (
          <div key={s.label} className="bg-white px-4 py-3 dark:bg-slate-900">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{s.label}</p>
            <p className={`mt-0.5 truncate text-sm font-bold tabular-nums ${s.tone || 'text-slate-800 dark:text-slate-100'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <SectionCard
        title="Bet History"
        subtitle={`${filteredBets.length.toLocaleString()} of ${bets.length.toLocaleString()} rows • ${a.kpis.totalBets.toLocaleString()} logical bets after merging repeat placements • read-only`}
        action={
          <button className="btn-ghost text-xs" onClick={onExport} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} CSV
          </button>
        }
        bodyClassName="pt-2"
      >
        <BetHistoryTable bets={filteredBets} dims={a.dims} />
      </SectionCard>
    </div>
  );
}
