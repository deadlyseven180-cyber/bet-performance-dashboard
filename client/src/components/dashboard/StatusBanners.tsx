import { AlertTriangle, WifiOff, ShieldAlert, Clock, FileX, RefreshCw, Info } from 'lucide-react';
import { useData } from '@/context/DataContext';

/** Friendly, actionable error banner keyed off the API error code. */
export function ErrorBanner() {
  const { error, errorCode, refresh, syncStatus } = useData();
  if (!error || syncStatus !== 'error') return null;

  const map: Record<string, { icon: typeof AlertTriangle; hint: string }> = {
    NETWORK: { icon: WifiOff, hint: 'Check your connection and confirm the API server is running.' },
    NOT_FOUND: { icon: FileX, hint: 'The configured spreadsheet could not be found.' },
    FORBIDDEN: { icon: ShieldAlert, hint: 'Access to the spreadsheet was denied.' },
    UNAUTHENTICATED: { icon: ShieldAlert, hint: 'The Google connection needs to be re-authorised by the owner.' },
    NOT_AUTHENTICATED: { icon: ShieldAlert, hint: 'The Google connection is not set up yet.' },
    RATE_LIMITED: { icon: Clock, hint: 'Google API limit reached — wait a moment before refreshing.' },
    NO_SPREADSHEET: { icon: Info, hint: 'No spreadsheet is configured on the server.' },
  };
  const { icon: Icon, hint } = map[errorCode ?? ''] ?? { icon: AlertTriangle, hint: 'Try refreshing, or review your data source settings.' };

  return (
    <div className="card mb-4 flex items-start gap-3 border-rose-200 bg-rose-50 p-4 dark:border-rose-500/30 dark:bg-rose-500/10">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</p>
        <p className="mt-0.5 text-xs text-rose-600/80 dark:text-rose-300/70">{hint}</p>
      </div>
      <button onClick={() => refresh()} className="btn-ghost border-rose-200 text-rose-700 dark:border-rose-500/30 dark:text-rose-300">
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>
  );
}

export function WarningBanner() {
  const { warnings, syncStatus } = useData();
  if (syncStatus === 'error' || !warnings.length) return null;
  return (
    <div className="card mb-4 flex items-start gap-3 border-amber-200 bg-amber-50 p-3.5 dark:border-amber-500/30 dark:bg-amber-500/10">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <ul className="space-y-0.5 text-xs text-amber-700 dark:text-amber-300">
        {warnings.map((w, i) => <li key={i}>{w}</li>)}
      </ul>
    </div>
  );
}
