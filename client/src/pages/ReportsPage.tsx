import { useState } from 'react';
import { FileSpreadsheet, FileText, FileType, Download, Loader2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SectionCard } from '@/components/ui/primitives';
import { ErrorBanner } from '@/components/dashboard/StatusBanners';
import { useToast } from '@/components/ui/Toast';
import { countActiveFilters } from '@/services/filters';
import { moneyKpi, percent } from '@/utils/format';

export function ReportsPage() {
  const { filteredBets, filters } = useData();
  const a = useAnalytics();
  const toast = useToast();
  const activeFilters = countActiveFilters(filters);
  const [busy, setBusy] = useState<string | null>(null);

  /**
   * xlsx + jsPDF are ~380KB of the bundle but are only needed here, so they're
   * loaded on demand rather than shipped to every dashboard visitor.
   */
  const run = async (key: string, fn: (m: typeof import('@/services/export')) => void, okTitle: string) => {
    setBusy(key);
    try {
      const mod = await import('@/services/export');
      fn(mod);
      toast.success(okTitle, `${filteredBets.length.toLocaleString()} bets included.`);
    } catch {
      toast.error('Export failed', 'Something went wrong generating the file.');
    } finally {
      setBusy(null);
    }
  };

  const formats = [
    {
      key: 'excel', title: 'Excel Workbook', desc: 'Summary + full bet ledger across two sheets (.xlsx).',
      icon: FileSpreadsheet, tone: 'text-emerald-500',
      run: () => run('excel', (m) => m.exportExcel(filteredBets, a.kpis), 'Excel exported'),
    },
    {
      key: 'csv', title: 'CSV File', desc: 'Raw bet records — perfect for re-importing or pivot tables.',
      icon: FileText, tone: 'text-sky-500',
      run: () => run('csv', (m) => m.exportCsv(filteredBets), 'CSV exported'),
    },
    {
      key: 'pdf', title: 'PDF Report', desc: 'Presentation-ready summary with KPIs and bet table.',
      icon: FileType, tone: 'text-rose-500',
      run: () => run('pdf', (m) => m.exportPdf(filteredBets, a.kpis), 'PDF exported'),
    },
  ];

  return (
    <div className="space-y-5">
      <ErrorBanner />

      <SectionCard title="Export Reports" subtitle="Every export respects the filters currently applied above.">
        <div className="mb-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:flex sm:flex-wrap sm:items-center dark:bg-slate-800/40">
          <Stat label="Bets in report" value={String(filteredBets.length)} />
          <Divider />
          <Stat label="Net Profit" value={moneyKpi(a.kpis.netProfit)} />
          <Divider />
          <Stat label="ROI" value={percent(a.kpis.roi)} />
          <Divider />
          <Stat label="Win Rate" value={percent(a.kpis.winRate)} />
          <Divider />
          <Stat label="Active filters" value={String(activeFilters)} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {formats.map((f) => (
            <div key={f.key} className="flex flex-col rounded-xl border border-slate-200 p-5 transition-shadow hover:shadow-card dark:border-slate-800">
              <f.icon className={`h-8 w-8 ${f.tone}`} />
              <h4 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{f.title}</h4>
              <p className="mt-1 flex-1 text-xs text-slate-500 dark:text-slate-400">{f.desc}</p>
              <button onClick={f.run} disabled={busy !== null} className="btn-primary mt-4 w-full">
                {busy === f.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
function Divider() {
  return <div className="hidden h-8 w-px bg-slate-200 sm:block dark:bg-slate-700" />;
}
