import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar, ADMIN_UI } from './Sidebar';
import { Topbar } from './Topbar';
import { GlobalFilterBar } from '@/components/filters/GlobalFilterBar';

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/tracker': 'Bet Tracker',
  '/charts': 'Charts & Analytics',
  '/rankings': 'Rankings',
  '/history': 'Bet History',
  '/reports': 'Reports & Export',
  // '/settings' is admin-only; added below so the hosted build omits it.
  ...(ADMIN_UI ? { '/settings': 'Data Source' } : {}),
};

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { pathname } = useLocation();
  const title = TITLES[pathname] ?? 'Dashboard';
  const showFilters = pathname !== '/settings';

  return (
    <div className="min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setSidebarOpen(true)} title={title} />
        {showFilters && <GlobalFilterBar />}
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
