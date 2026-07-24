import { Menu, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { LiveIndicator } from './SyncStatusPill';

export function Topbar({ onMenu, title }: { onMenu: () => void; title: string }) {
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      <button onClick={onMenu} className="text-slate-500 lg:hidden"><Menu className="h-5 w-5" /></button>
      <h1 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-700 dark:text-slate-200">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        <LiveIndicator />
        <button onClick={toggle} className="btn-ghost px-2 py-1.5" title="Toggle theme">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
