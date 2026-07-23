import { Menu, Moon, Sun, RefreshCw, Clock3 } from 'lucide-react';
import clsx from 'clsx';
import { useData } from '@/context/DataContext';
import { useTheme } from '@/hooks/useTheme';
import { SyncStatusPill } from './SyncStatusPill';

export function Topbar({ onMenu, title }: { onMenu: () => void; title: string }) {
  const { refresh, syncStatus, autoRefresh, setAutoRefresh } = useData();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      <button onClick={onMenu} className="text-slate-500 lg:hidden"><Menu className="h-5 w-5" /></button>
      <h1 className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <SyncStatusPill />

        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          title="Auto-refresh every 60 seconds"
          className={clsx(
            'btn-ghost px-2.5 py-1.5 text-xs',
            autoRefresh && 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300',
          )}
        >
          <Clock3 className="h-4 w-4" />
          <span className="hidden md:inline">Auto {autoRefresh ? 'On' : 'Off'}</span>
        </button>

        <button
          onClick={() => refresh()}
          disabled={syncStatus === 'loading'}
          className="btn-primary px-2.5 py-1.5 text-xs"
        >
          <RefreshCw className={clsx('h-4 w-4', syncStatus === 'loading' && 'animate-spin')} />
          <span className="hidden md:inline">Refresh</span>
        </button>

        <button onClick={toggle} className="btn-ghost px-2.5 py-2" title="Toggle theme">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
