import { useEffect, useState } from 'react';
import { Database, Link2, RefreshCw, Clock, CheckCircle2, FileSpreadsheet, ExternalLink, Table2 } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { sheetsApi, type AuthStatus } from '@/api/sheets';
import { SectionCard, Badge } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { money } from '@/utils/format';

export function SettingsPage() {
  const { config, payload, spreadsheetId, worksheet, setSource, refresh, autoRefresh, setAutoRefresh, syncedAt, recordCount } = useData();
  const toast = useToast();
  const [sid, setSid] = useState(spreadsheetId);
  const [ws, setWs] = useState(worksheet);
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  useEffect(() => { sheetsApi.authStatus().then(setAuth).catch(() => setAuth(null)); }, []);
  useEffect(() => { setSid(spreadsheetId); setWs(worksheet); }, [spreadsheetId, worksheet]);

  const isMock = config?.dataSource === 'mock';
  const worksheets = payload?.meta.worksheets ?? [];

  const apply = async () => {
    setSource(sid.trim(), ws.trim());
    await refresh();
  };

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
        </div>

        {isMock && (
          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-200">
            <p className="font-semibold">You're viewing sample data.</p>
            <p className="mt-1 text-xs text-brand-700/80 dark:text-brand-200/80">
              To connect your own Google Sheet, set <code className="rounded bg-white/60 px-1 dark:bg-black/20">DATA_SOURCE</code> in the server
              <code className="rounded bg-white/60 px-1 dark:bg-black/20">.env</code> to <code>service</code>, <code>apikey</code> or <code>oauth</code>,
              then add credentials. See the README for the 2-minute setup.
            </p>
          </div>
        )}

        {config?.dataSource === 'oauth' && auth && !auth.connected && (
          <a href="/api/auth/google" className="btn-primary mt-4 inline-flex">
            <Link2 className="h-4 w-4" /> Connect Google Account
          </a>
        )}
      </SectionCard>

      <SectionCard title="Spreadsheet" subtitle="Point the dashboard at any spreadsheet and worksheet tab">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Spreadsheet ID</label>
            <input
              value={sid}
              onChange={(e) => setSid(e.target.value)}
              placeholder={isMock ? 'mock-spreadsheet' : '1AbC…the long id from the sheet URL'}
              className="input"
              disabled={isMock}
            />
            <p className="mt-1 text-xs text-slate-400">Found in the URL: docs.google.com/spreadsheets/d/<b>SPREADSHEET_ID</b>/edit</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Worksheet / Tab</label>
            {worksheets.length > 0 ? (
              <select value={ws} onChange={(e) => setWs(e.target.value)} className="input" disabled={isMock}>
                {!worksheets.includes(ws) && ws && <option value={ws}>{ws}</option>}
                {worksheets.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            ) : (
              <input value={ws} onChange={(e) => setWs(e.target.value)} placeholder="Sheet1" className="input" disabled={isMock} />
            )}
            <p className="mt-1 text-xs text-slate-400 flex items-center gap-1"><Table2 className="h-3 w-3" /> The exact tab name at the bottom of your sheet.</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={apply} disabled={isMock} className="btn-primary"><RefreshCw className="h-4 w-4" /> Apply & Sync</button>
          {sid && !isMock && (
            <a href={`https://docs.google.com/spreadsheets/d/${sid}`} target="_blank" rel="noreferrer" className="btn-ghost">
              <ExternalLink className="h-4 w-4" /> Open in Sheets
            </a>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Sync" subtitle="Manual refresh and 60-second auto-sync">
        <div className="grid gap-4 sm:grid-cols-3">
          <InfoTile icon={FileSpreadsheet} label="Spreadsheet" value={payload?.meta.spreadsheetTitle ?? '—'} />
          <InfoTile icon={Clock} label="Last Sync" value={syncedAt ? new Date(syncedAt).toLocaleString('en-AU') : 'Never'} />
          <InfoTile icon={Database} label="Records Loaded" value={String(recordCount)} />
        </div>

        <label className="mt-5 flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Automatic refresh</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Re-read the sheet every 60 seconds in the background.</p>
          </div>
          <button
            role="switch"
            aria-checked={autoRefresh}
            onClick={() => { setAutoRefresh(!autoRefresh); toast.info(autoRefresh ? 'Auto-refresh off' : 'Auto-refresh on'); }}
            className={`relative h-6 w-11 rounded-full transition-colors ${autoRefresh ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </label>

        <button onClick={() => refresh()} className="btn-ghost mt-4"><RefreshCw className="h-4 w-4" /> Refresh now</button>
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
