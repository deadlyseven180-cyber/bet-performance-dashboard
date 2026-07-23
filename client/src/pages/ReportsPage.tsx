import { FileSpreadsheet, FileText, FileType, Download } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { SectionCard } from '@/components/ui/primitives';
import { ErrorBanner } from '@/components/dashboard/StatusBanners';
import { exportCsv, exportExcel, exportPdf } from '@/services/export';
import { useToast } from '@/components/ui/Toast';
import { countActiveFilters } from '@/services/filters';
import { money, percent } from '@/utils/format';

export function ReportsPage() {
  const { filteredBets, filters } = useData();
  const a = useAnalytics();
  const toast = useToast();
  const activeFilters = countActiveFilters(filters);

  const formats = [
    {
      key: 'excel', title: 'Excel Workbook', desc: 'Summary + full bet ledger across two sheets (.xlsx).',
      icon: FileSpreadsheet, tone: 'text-emerald-500',
      run: () => { exportExcel(filteredBets, a.kpis); toast.success('Excel exported', `${filteredBets.length} bets included.`); },
    },
    {
      key: 'csv', title: 'CSV File', desc: 'Raw bet records — perfect for re-importing or pivot tables.',
      icon: FileText, tone: 'text-sky-500',
      run: () => { exportCsv(filteredBets); toast.success('CSV exported', `${filteredBets.length} bets included.`); },
    },
    {
      key: 'pdf', title: 'PDF Report', desc: 'Presentation-ready summary with KPIs and bet table.',
      icon: FileType, tone: 'text-rose-500',
      run: () => { exportPdf(filteredBets, a.kpis); toast.success('PDF exported', 'Report generated.'); },
    },
  ];

  return (
    <div className="space-y-5">
      <ErrorBanner />

      <SectionCard title="Export Reports" subtitle="Every export respects the filters currently applied above.">
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/40">
          <Stat label="Bets in report" value={String(filteredBets.length)} />
          <Divider />
          <Stat label="Net Profit" value={money(a.kpis.netProfit)} />
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
              <button onClick={f.run} className="btn-primary mt-4 w-full">
                <Download className="h-4 w-4" /> Export
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
  return <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />;
}
