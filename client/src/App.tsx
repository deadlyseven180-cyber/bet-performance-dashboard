import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthGate } from '@/components/auth/AuthGate';
import { DataProvider } from '@/context/DataContext';
import { Layout } from '@/components/layout/Layout';
import { ADMIN_UI } from '@/components/layout/Sidebar';
import { DashboardPage } from '@/pages/DashboardPage';
import { TrackerPage } from '@/pages/TrackerPage';
import { ChartsPage } from '@/pages/ChartsPage';
import { RankingsPage } from '@/pages/RankingsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { SettingsPage } from '@/pages/SettingsPage';

export default function App() {
  return (
    <ToastProvider>
      <AuthGate>
        {/* Router wraps the data layer so filters can sync to the URL */}
        <BrowserRouter>
          <DataProvider>
            <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/tracker" element={<TrackerPage />} />
              <Route path="/charts" element={<ChartsPage />} />
              <Route path="/rankings" element={<RankingsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              {/* Owner-only admin screen — absent from the hosted build */}
              {ADMIN_UI && <Route path="/settings" element={<SettingsPage />} />}
              <Route path="*" element={<DashboardPage />} />
            </Route>
            </Routes>
          </DataProvider>
        </BrowserRouter>
      </AuthGate>
    </ToastProvider>
  );
}
