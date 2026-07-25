import { useEffect, useState } from 'react';
import { Database, Link2, RefreshCw, Clock, CheckCircle2, FileSpreadsheet, Table2, Lock } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { sheetsApi, type AuthStatus } from '@/api/sheets';
import { SectionCard, Badge } from '@/components/ui/primitives';
import { money } from '@/utils/format';

/**
 * Owner-only, local-only admin screen. The data source is LOCKED to a single
 * spreadsheet + worksheet by the server; it can't be changed from the UI. To
 * point the app at a different tab, change WORKSHEET_NAME in the server .env.
 */
export function SettingsPage() {
  const { config, payload, refresh, syncedAt, recordCount } = useData();
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  useEffect(() => { sheetsApi.authStatus().then(setAuth).catch(() => setAuth(null)); }, []);

  const worksheet = config?.worksheet ?? payload?.meta.worksheet ?? '—';

  return (
    <div className="space-y-5">
      <SectionCard title="Connection" subtitle="How the dashboard reads your betting data">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <Database className="h-3.5 w-3.5" /> Source: {config?.dataSource?.toUpperCase() ?? '…'}
          </Badge>
          {auth?.connected ? (
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Connected
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Not connected</Badge>
          )}
          <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Read-only</Badge>
          <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Lock className="h-3.5 w-3.5" /> Locked to one tab</Badge>
        </div>

        {config?.dataSource === 'oauth' && auth && !auth.connected && (
          <a href="/api/auth/google" className="btn-primary mt-4 inline-flex">
            <Link2 className="h-4 w-4" /> Connect Google Account
          </a>
        )}
      </SectionCard>

      <SectionCard title="Data source" subtitle="Fixed by the server for security — the app can only ever read this one tab">
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoTile icon={FileSpreadsheet} label="Spreadsheet" value={payload?.meta.spreadsheetTitle ?? '—'} />
          <InfoTile icon={Table2} label="Worksheet (locked)" value={worksheet} />
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p>
            The app is hard-locked to the <b>{worksheet}</b> tab. No other tab in the spreadsheet is ever read or exposed — not
            here, not on the hosted site, and not in the shared config database. To read a different tab, change
            <code className="mx-1 rounded bg-white px-1 dark:bg-black/30">WORKSHEET_NAME</code> in the server’s
            <code className="mx-1 rounded bg-white px-1 dark:bg-black/30">.env</code> and restart.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Sync" subtitle="Live auto-sync every 10 seconds">
        <div className="grid gap-4 sm:grid-cols-3">
          <InfoTile icon={FileSpreadsheet} label="Spreadsheet" value={payload?.meta.spreadsheetTitle ?? '—'} />
          <InfoTile icon={Clock} label="Last Sync" value={syncedAt ? new Date(syncedAt).toLocaleString('en-AU') : 'Never'} />
          <InfoTile icon={Database} label="Records Loaded" value={String(recordCount)} />
        </div>
        <button onClick={() => refresh()} className="btn-ghost mt-4"><RefreshCw className="h-4 w-4" /> Sync now</button>
      </SectionCard>

      {payload && payload.bets.length > 0 && (
        <SectionCard title="Detected Columns" subtitle="The importer maps your headers automatically — nothing is hardcoded">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sample record parsed: <b>{payload.bets[0].event || payload.bets[0].selection || 'row 1'}</b> — stake {money(payload.bets[0].stake)},
            status <b>{payload.bets[0].status}</b>{payload.bets[0].statusInferred ? ' (inferred from profit/return)' : ''}.
          </p>
        </SectionCard>
      )}
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center gap-2 text-slate-400"><Icon className="h-4 w-4" /><span className="text-xs">{label}</span></div>
      <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={value}>{value}</p>
    </div>
  );
}
