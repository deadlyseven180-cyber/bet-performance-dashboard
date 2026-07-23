import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { LayoutDashboard, LineChart, Trophy, Table2, FileDown, Settings, Target, X } from 'lucide-react';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/charts', label: 'Charts', icon: LineChart },
  { to: '/rankings', label: 'Rankings', icon: Trophy },
  { to: '/history', label: 'Bet History', icon: Table2 },
  { to: '/reports', label: 'Reports', icon: FileDown },
  { to: '/settings', label: 'Data Source', icon: Settings },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Target className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">BetMetrics</p>
              <p className="text-[11px] text-slate-400">Performance Dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 lg:hidden"><X className="h-5 w-5" /></button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )
              }
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <p className="text-[11px] leading-relaxed text-slate-400">
            Read-only. Google Sheets is the single source of truth — this app never edits your data.
          </p>
        </div>
      </aside>
    </>
  );
}
