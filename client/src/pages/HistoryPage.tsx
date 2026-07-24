import { useData } from '@/context/DataContext';
import { SectionCard } from '@/components/ui/primitives';
import { BetHistoryTable } from '@/components/history/BetHistoryTable';
import { ErrorBanner } from '@/components/dashboard/StatusBanners';
import { exportCsv } from '@/services/export';
import { useToast } from '@/components/ui/Toast';
import { Download } from 'lucide-react';

export function HistoryPage() {
  const { filteredBets, bets } = useData();
  const toast = useToast();

  return (
    <div className="space-y-5">
      <ErrorBanner />
      <SectionCard
        title="Bet History"
        subtitle={`${filteredBets.length} of ${bets.length} records • read-only • use the filter bar above to refine`}
        action={
          <button
            className="btn-ghost text-xs"
            onClick={() => { exportCsv(filteredBets); toast.success('Exported', 'CSV downloaded for the filtered records.'); }}
          >
            <Download className="h-4 w-4" /> CSV
          </button>
        }
        bodyClassName="pt-2"
      >
        <BetHistoryTable bets={filteredBets} />
      </SectionCard>
    </div>
  );
}
