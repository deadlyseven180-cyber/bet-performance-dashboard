import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { LayoutDashboard, LineChart, Trophy, Table2, FileDown, Settings, Crosshair, X } from 'lucide-react';
import { useData } from '@/context/DataContext';

/**
 * "Data Source" is an owner-only admin screen (it can re-point the app at a
 * different spreadsheet), so it is only present when running locally in dev.
 * The hosted/shared build omits it entirely — nav item AND route.
 */
export const ADMIN_UI = import.meta.env.DEV;

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tracker', label: 'Bet Tracker', icon: Crosshair },
  { to: '/charts', label: 'Charts', icon: LineChart },
  { to: '/rankings', label: 'Rankings', icon: Trophy },
  { to: '/history', label: 'Bet History', icon: Table2 },
  { to: '/reports', label: 'Reports', icon: FileDown },
  ...(ADMIN_UI ? [{ to: '/settings', label: 'Data Source', icon: Settings }] : []),
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { payload } = useData();
  const title = payload?.meta.spreadsheetTitle;

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            {/* Drawn mark rather than a stock icon */}
            <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden>
              <rect width="32" height="32" rx="3" className="fill-slate-900 dark:fill-slate-800" />
              <path d="M12.2 4h7.6l-2.2 4.4h-3.2z" className="fill-brand-400" />
              <path
                d="M13.6 8.9C9 11.5 5.8 16.1 5.8 20.3 5.8 24.7 10.4 28 16 28s10.2-3.3 10.2-7.7c0-4.2-3.2-8.8-7.8-11.4z"
                className="fill-brand-400"
              />
              <path d="M16 13.8v10.6" strokeWidth="1.8" strokeLinecap="round" className="stroke-slate-900 dark:stroke-slate-800" />
              <path
                d="M18.9 16.5c0-1.2-1.3-2.1-2.9-2.1s-2.9.9-2.9 2.1 1.3 1.8 2.9 2.2 2.9 1 2.9 2.2-1.3 2.1-2.9 2.1-2.9-.9-2.9-2.1"
                fill="none" strokeWidth="1.8" strokeLinecap="round" className="stroke-slate-900 dark:stroke-slate-800"
              />
            </svg>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-semibold tracking-tight text-slate-800 dark:text-slate-100">
                {title || 'Syndicate'}
              </p>
              <p className="label-micro">Performance Terminal</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 lg:hidden"><X className="h-5 w-5" /></button>
        </div>

        <nav className="flex-1 space-y-0.5 py-2 pr-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2.5 border-l-2 px-3 py-2 text-[13px] font-medium transition-colors',
                  isActive
                    ? 'border-brand-400 bg-slate-100 text-slate-900 dark:bg-slate-800/60 dark:text-slate-50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <p className="label-micro leading-relaxed">
            Read-only · source: Google Sheets
          </p>
        </div>
      </aside>
    </>
  );
}
