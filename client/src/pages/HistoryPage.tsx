import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SectionCard } from '@/components/ui/primitives';
import { BetHistoryTable } from '@/components/history/BetHistoryTable';
import { ErrorBanner } from '@/components/dashboard/StatusBanners';
import { useToast } from '@/components/ui/Toast';

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
      <SectionCard
        title="Bet History"
        subtitle={`${filteredBets.length.toLocaleString()} of ${bets.length.toLocaleString()} records • read-only • use the filter bar above to refine`}
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
