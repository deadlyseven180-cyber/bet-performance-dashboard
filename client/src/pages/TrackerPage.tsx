import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Target, CalendarDays, Share2, Loader2, Cloud } from 'lucide-react';
import clsx from 'clsx';
import { useData } from '@/context/DataContext';
import { useTrackerConfig, type ManualBet } from '@/hooks/useTrackerConfig';
import { useToast } from '@/components/ui/Toast';
import { groupDuplicateBets, betGroupKey, distinctValues, type BetGroup } from '@/services/analytics';
import { shareText } from '@/services/captureShare';
import { SectionCard } from '@/components/ui/primitives';
import { ErrorBanner } from '@/components/dashboard/StatusBanners';
import { money, moneyKpi, formatDate, decimalOdds, STATUS_LABEL, STATUS_STYLE, profitColor } from '@/utils/format';

const DEFAULT_UNIT_SIZE = 1000;
const UNIT_PRESETS = [0.25, 0.5, 1, 1.5, 2, 3];
const REASON_PRESETS = [
  'Line moved', 'Odds dropped', 'Account limited', 'Bookie suspended',
  'Max bet reached', 'No time / missed', 'Bet not available',
];

/** Whole dollars, no cents, for a compact chat report. */
const rep = (n: number) => `$${Math.round(n).toLocaleString('en-AU')}`;

/**
 * Name to show in the report. For labelled multis ("BET 16 : Daicos/Smith/…")
 * just show the label ("BET 16 :") — the full leg list is noise in a chat.
 */
function reportName(selection: string): string {
  const m = selection.match(/^\s*bet\b[\s#:.\-]*(\d+)\b/i);
  return m ? `BET ${m[1]} :` : selection.trim();
}

/**
 * Build the plain-text report for a day — bets short of target (plus manual
 * not-placed ones, each with its reason if given), and separately overstaked
 * bets, grouped by service. This is what Share copies to the group chat.
 */
function buildMissingReport(opts: {
  day: string; services: string[]; bets: import('@/types').Bet[];
  unitSizes: Record<string, number>; betUnits: Record<string, number>;
  manualBets: ManualBet[]; reasons: Record<string, string>; defaultUnitSize: number; title?: string;
}): string {
  const { day, services, bets, unitSizes, betUnits, manualBets, reasons, defaultUnitSize, title } = opts;
  const missBlocks: string[] = [];
  const overBlocks: string[] = [];
  let grandMiss = 0;
  let grandOver = 0;
  const why = (key: string) => (reasons[key]?.trim() ? ` — ${reasons[key].trim()}` : '');

  for (const svc of services) {
    const unit = unitSizes[svc] ?? defaultUnitSize;
    const groups = groupDuplicateBets(bets.filter((b) => b.service === svc && b.date === day));
    const missLines: string[] = [];
    const overLines: string[] = [];
    let svcMiss = 0;
    let svcOver = 0;

    for (const g of groups) {
      const t = unit * (betUnits[betGroupKey(g)] ?? 1);
      const missing = t - g.stake;
      const over = g.stake - t;
      if (missing > 0.5) {
        missLines.push(`• ${reportName(g.selection)} need ${rep(missing)} more (${rep(g.stake)}/${rep(t)})${why(betGroupKey(g))}`);
        svcMiss += missing;
      } else if (over > 0.5) {
        overLines.push(`• ${reportName(g.selection)} +${rep(over)} over (${rep(g.stake)}/${rep(t)})`);
        svcOver += over;
      }
    }
    for (const m of manualBets.filter((x) => x.day === day && x.service === svc)) {
      const t = unit * m.units;
      missLines.push(`• ${m.name} NOT PLACED (${rep(t)})${why(m.id)}`);
      svcMiss += t;
    }

    if (missLines.length) { grandMiss += svcMiss; missBlocks.push(`${svc} — missing ${rep(svcMiss)}\n${missLines.join('\n')}`); }
    if (overLines.length) { grandOver += svcOver; overBlocks.push(`${svc} — over ${rep(svcOver)}\n${overLines.join('\n')}`); }
  }

  if (!missBlocks.length && !overBlocks.length) {
    return `✅ All bets fully placed — ${formatDate(day)}${title ? `\n${title}` : ''}`;
  }
  const out: string[] = [`📋 BET REPORT — ${formatDate(day)}`];
  if (title) out.push(title);
  if (missBlocks.length) out.push('', '⚠️ MISSING', ...missBlocks.map((b) => `\n${b}`), '', `TOTAL MISSING: ${rep(grandMiss)}`);
  if (overBlocks.length) out.push('', '🔵 OVERSTAKED', ...overBlocks.map((b) => `\n${b}`), '', `TOTAL OVER: ${rep(grandOver)}`);
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Per-service bet tracker. Config (services, unit sizes, per-bet units, manual
 * bets, reasons) lives in a shared store so every device and viewer sees the
 * same thing. Each service has a 1-unit stake; each bet has a unit multiplier;
 * target = unitSize × units and "missing" = target − placed.
 */
export function TrackerPage() {
  const { bets, payload } = useData();
  const toast = useToast();
  const { cfg, update, shared } = useTrackerConfig();
  const { services, unitSizes, betUnits, manualBets, reasons } = cfg;

  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);

  const setServices = (fn: (s: string[]) => string[]) => update((p) => ({ ...p, services: fn(p.services) }));
  const setUnitSizes = (fn: (s: Record<string, number>) => Record<string, number>) => update((p) => ({ ...p, unitSizes: fn(p.unitSizes) }));
  const setUnits = (key: string, units: number) => update((p) => ({ ...p, betUnits: { ...p.betUnits, [key]: units } }));
  const setReason = (key: string, text: string) => update((p) => {
    const next = { ...p.reasons };
    if (text.trim()) next[key] = text; else delete next[key];
    return { ...p, reasons: next };
  });

  const days = useMemo(() => {
    const set = new Set<string>();
    for (const b of bets) if (b.date && services.includes(b.service)) set.add(b.date);
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [bets, services]);

  const [dayIdx, setDayIdx] = useState(0);
  const day = days[Math.min(dayIdx, Math.max(0, days.length - 1))] ?? null;
  const unitSizeFor = (svc: string) => (unitSizes[svc] ?? DEFAULT_UNIT_SIZE);

  const addManual = (svc: string, name: string, units: number) => {
    if (!day || !name.trim()) return;
    const id = `${day}|${svc}|${name}|${Math.round(Math.random() * 1e9)}`;
    update((p) => ({ ...p, manualBets: [...p.manualBets, { id, day, service: svc, name: name.trim(), units }] }));
  };
  const removeManual = (id: string) => update((p) => ({ ...p, manualBets: p.manualBets.filter((m) => m.id !== id) }));

  const allServices = useMemo(() => distinctValues(bets, 'service'), [bets]);
  const addable = allServices.filter((s) => !services.includes(s));

  const shareReport = async () => {
    if (!day || sharing) return;
    setSharing(true);
    try {
      const report = buildMissingReport({
        day, services, bets, unitSizes, betUnits, manualBets, reasons,
        defaultUnitSize: DEFAULT_UNIT_SIZE, title: payload?.meta.spreadsheetTitle,
      });
      const result = await shareText(report, `missing-bets-${day}`);
      toast.success(
        result === 'shared' ? 'Ready to share' : result === 'copied' ? 'Report copied' : 'Report saved',
        result === 'copied' ? 'Paste it straight into your group chat.'
          : result === 'downloaded' ? 'Saved as a .txt file.' : 'Pick your group chat to send it.',
      );
    } catch (err) {
      toast.error('Share failed', err instanceof Error ? err.message : 'Could not build the report.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-5">
      <ErrorBanner />
      <datalist id="unit-presets">{UNIT_PRESETS.map((u) => <option key={u} value={u} />)}</datalist>
      <datalist id="reason-presets">{REASON_PRESETS.map((r) => <option key={r} value={r} />)}</datalist>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setDayIdx((i) => Math.min(days.length - 1, i + 1))} disabled={dayIdx >= days.length - 1} className="btn-ghost px-2 py-1.5" title="Previous day">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 rounded border border-slate-200 px-3 py-1.5 dark:border-slate-800">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">{day ? formatDate(day) : 'No data'}</span>
            {dayIdx === 0 && day && <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">Latest</span>}
          </div>
          <button onClick={() => setDayIdx((i) => Math.max(0, i - 1))} disabled={dayIdx <= 0} className="btn-ghost px-2 py-1.5" title="Next day">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {shared && (
            <span className="hidden items-center gap-1 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 sm:flex" title="Config is shared across all devices and viewers">
              <Cloud className="h-3.5 w-3.5" /> Shared
            </span>
          )}
          <button onClick={shareReport} disabled={sharing || !day} className="btn-primary" title="Copy a report of missing & overstaked bets to share">
            {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Share report
          </button>
          <button onClick={() => setEditing((e) => !e)} className={clsx('btn-ghost', editing && 'border-brand-300 text-brand-700 dark:text-brand-300')}>
            <Target className="h-4 w-4" /> Services & unit size
          </button>
        </div>
      </div>

      {editing && (
        <SectionCard title="Tracked services" subtitle="Set the value of one full unit (1u) per service. Shared across everyone.">
          <div className="space-y-2">
            {services.map((svc) => (
              <div key={svc} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{svc}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-400">$</span>
                  <input
                    type="number" min={0} step={100}
                    value={unitSizeFor(svc)}
                    onChange={(e) => setUnitSizes((t) => ({ ...t, [svc]: Number(e.target.value) || 0 }))}
                    className="input no-spinner w-28 py-1 text-sm tabular-nums"
                  />
                  <span className="text-xs text-slate-400">= 1u</span>
                </div>
                <button onClick={() => setServices((s) => s.filter((x) => x !== svc))} className="ml-auto text-slate-400 hover:text-rose-500" title="Stop tracking this service">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          {addable.length > 0 && (
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Plus className="h-4 w-4 text-slate-400" />
              <select className="input w-auto py-1.5 text-sm" value="" onChange={(e) => { if (e.target.value) setServices((s) => [...s, e.target.value]); }}>
                <option value="">Add a service to track…</option>
                {addable.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </SectionCard>
      )}

      {!day && (
        <SectionCard><p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">No bets found for the tracked services yet.</p></SectionCard>
      )}

      {day && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3 rounded border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{payload?.meta.spreadsheetTitle ?? 'Bet Tracker'}</p>
              <p className="label-micro">Bet tracker · {formatDate(day)}</p>
            </div>
            <DayTotal services={services} day={day} bets={bets} unitSizes={unitSizes} betUnits={betUnits} manualBets={manualBets} defaultUnitSize={DEFAULT_UNIT_SIZE} />
          </div>

          {services.map((svc) => (
            <ServiceDay
              key={svc}
              service={svc}
              day={day}
              bets={bets}
              unitSize={unitSizeFor(svc)}
              betUnits={betUnits}
              reasons={reasons}
              setUnits={setUnits}
              setReason={setReason}
              manual={manualBets.filter((m) => m.service === svc && m.day === day)}
              onAddManual={(name, units) => addManual(svc, name, units)}
              onRemoveManual={removeManual}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Grand total across all tracked services. */
function DayTotal({ services, day, bets, unitSizes, betUnits, manualBets, defaultUnitSize }: {
  services: string[]; day: string; bets: import('@/types').Bet[];
  unitSizes: Record<string, number>; betUnits: Record<string, number>; manualBets: ManualBet[]; defaultUnitSize: number;
}) {
  const { placed, missing, over } = useMemo(() => {
    let placed = 0, missing = 0, over = 0;
    for (const svc of services) {
      const unit = unitSizes[svc] ?? defaultUnitSize;
      const groups = groupDuplicateBets(bets.filter((b) => b.service === svc && b.date === day));
      for (const g of groups) {
        const t = unit * (betUnits[betGroupKey(g)] ?? 1);
        placed += g.stake;
        missing += Math.max(0, t - g.stake);
        over += Math.max(0, g.stake - t);
      }
    }
    for (const m of manualBets) {
      if (m.day !== day || !services.includes(m.service)) continue;
      missing += (unitSizes[m.service] ?? defaultUnitSize) * m.units;
    }
    return { placed, missing, over };
  }, [services, day, bets, unitSizes, betUnits, manualBets, defaultUnitSize]);

  return (
    <div className="flex items-center gap-4 text-right">
      <div><p className="label-micro">Placed</p><p className="text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">{moneyKpi(placed)}</p></div>
      <div><p className="label-micro">Missing</p><p className={clsx('text-sm font-bold tabular-nums', missing > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>{moneyKpi(missing)}</p></div>
      {over > 0 && <div><p className="label-micro">Over</p><p className="text-sm font-bold tabular-nums text-sky-600 dark:text-sky-400">{moneyKpi(over)}</p></div>}
    </div>
  );
}

function ServiceDay({ service, day, bets, unitSize, betUnits, reasons, setUnits, setReason, manual, onAddManual, onRemoveManual }: {
  service: string; day: string; bets: import('@/types').Bet[];
  unitSize: number; betUnits: Record<string, number>; reasons: Record<string, string>;
  setUnits: (key: string, units: number) => void; setReason: (key: string, text: string) => void;
  manual: ManualBet[]; onAddManual: (name: string, units: number) => void; onRemoveManual: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [units, setLocalUnits] = useState(1);

  const groups = useMemo(
    () => groupDuplicateBets(bets.filter((b) => b.service === service && b.date === day)),
    [bets, service, day],
  );

  const totals = useMemo(() => {
    let placed = 0, missing = 0, over = 0, profit = 0, target = 0;
    for (const g of groups) {
      const t = unitSize * (betUnits[betGroupKey(g)] ?? 1);
      placed += g.stake;
      target += t;
      missing += Math.max(0, t - g.stake);
      over += Math.max(0, g.stake - t);
      profit += g.status === 'pending' || g.status === 'unknown' ? 0 : g.profit;
    }
    for (const m of manual) { target += unitSize * m.units; missing += unitSize * m.units; }
    return { placed, missing, over, profit, target };
  }, [groups, unitSize, betUnits, manual]);

  const submit = () => {
    if (!name.trim()) return;
    onAddManual(name, units);
    setName(''); setLocalUnits(1); setAdding(false);
  };

  return (
    <SectionCard
      title={service}
      subtitle={`${groups.length} bet${groups.length === 1 ? '' : 's'} · 1u = ${moneyKpi(unitSize)}`}
      action={
        <div className="flex items-center gap-4 text-right">
          <Stat label="Placed" value={moneyKpi(totals.placed)} />
          <Stat label="Target" value={moneyKpi(totals.target)} />
          <Stat label="Missing" value={moneyKpi(totals.missing)} tone={totals.missing > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'} />
          {totals.over > 0 && <Stat label="Over" value={moneyKpi(totals.over)} tone="text-sky-600 dark:text-sky-400" />}
          <Stat label="P/L" value={`${totals.profit > 0 ? '+' : ''}${moneyKpi(totals.profit)}`} tone={profitColor(totals.profit)} />
        </div>
      }
      bodyClassName="pt-2"
    >
      {groups.length === 0 && manual.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No bets for {service} on this day.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-[0.08em] text-slate-400 dark:border-slate-800">
                <th className="py-2 pr-2 font-medium">Bet</th>
                <th className="py-2 pr-2 text-right font-medium">Accounts</th>
                <th className="py-2 pr-2 text-right font-medium">Placed</th>
                <th className="py-2 pr-2 text-center font-medium">Units</th>
                <th className="py-2 pr-2 text-right font-medium">Target</th>
                <th className="py-2 pr-2 text-right font-medium">Missing / Over</th>
                <th className="py-2 pr-1 text-right font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const key = betGroupKey(g);
                return (
                  <BetRow
                    key={g.id}
                    g={g}
                    unitSize={unitSize}
                    units={betUnits[key] ?? 1}
                    reason={reasons[key] ?? ''}
                    onUnits={(u) => setUnits(key, u)}
                    onReason={(t) => setReason(key, t)}
                  />
                );
              })}
              {manual.map((m) => (
                <ManualRow
                  key={m.id}
                  m={m}
                  unitSize={unitSize}
                  reason={reasons[m.id] ?? ''}
                  onReason={(t) => setReason(m.id, t)}
                  onRemove={() => onRemoveManual(m.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        {adding ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Bet that was missed (e.g. Bont 25+)"
              className="input min-w-[200px] flex-1 py-1.5 text-sm"
            />
            <input
              type="number" min={0} step={0.25} value={units}
              onChange={(e) => setLocalUnits(Math.max(0, Number(e.target.value)))}
              className="input no-spinner w-16 py-1.5 text-center text-sm tabular-nums"
              list="unit-presets" title="Units"
            />
            <span className="text-xs text-slate-400">u = {moneyKpi(unitSize * units)}</span>
            <button onClick={submit} className="btn-primary py-1.5">Add</button>
            <button onClick={() => { setAdding(false); setName(''); }} className="btn-ghost py-1.5">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="btn-ghost text-xs">
            <Plus className="h-3.5 w-3.5" /> Add missed / not-placed bet
          </button>
        )}
      </div>
    </SectionCard>
  );
}

/** Compact reason picker shown on bets that aren't fully placed. */
function ReasonInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      list="reason-presets"
      placeholder="Reason it's short…"
      className="input mt-1.5 w-full py-0.5 text-[11px]"
      title="Why this bet couldn't be fully placed"
    />
  );
}

function ManualRow({ m, unitSize, reason, onReason, onRemove }: {
  m: ManualBet; unitSize: number; reason: string; onReason: (t: string) => void; onRemove: () => void;
}) {
  const target = unitSize * m.units;
  return (
    <tr className="border-b border-amber-100 bg-amber-50/40 dark:border-amber-500/20 dark:bg-amber-500/5">
      <td className="max-w-[260px] py-2 pr-2">
        <span className="flex items-center gap-1.5">
          <span className="block truncate font-medium text-slate-700 dark:text-slate-200" title={m.name}>{m.name}</span>
          <button onClick={onRemove} className="text-slate-400 hover:text-rose-500" title="Remove"><X className="h-3 w-3" /></button>
        </span>
        <ReasonInput value={reason} onChange={onReason} />
      </td>
      <td className="py-2 pr-2 text-right tabular-nums text-slate-400">0</td>
      <td className="py-2 pr-2 text-right tabular-nums text-slate-400">{money(0)}</td>
      <td className="py-2 pr-2 text-center tabular-nums text-slate-500">{m.units}u</td>
      <td className="py-2 pr-2 text-right tabular-nums text-slate-400">{money(target)}</td>
      <td className="py-2 pr-2 text-right tabular-nums font-semibold text-amber-600 dark:text-amber-400">{money(target)}</td>
      <td className="py-2 pr-1 text-right">
        <span className="chip bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Not placed</span>
      </td>
    </tr>
  );
}

function BetRow({ g, unitSize, units, reason, onUnits, onReason }: {
  g: BetGroup; unitSize: number; units: number; reason: string; onUnits: (u: number) => void; onReason: (t: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const target = unitSize * units;
  const missing = Math.max(0, target - g.stake);
  const over = Math.max(0, g.stake - target);
  const pct = target > 0 ? Math.min(100, (g.stake / target) * 100) : 100;
  const barTone = missing > 0 ? 'bg-amber-400' : over > 0 ? 'bg-sky-500' : 'bg-emerald-500';

  return (
    <>
      <tr className="border-b border-slate-50 hover:bg-brand-50/40 dark:border-slate-800/60 dark:hover:bg-slate-800/50">
        <td className="max-w-[260px] py-2 pr-2 align-top">
          <span className="block cursor-pointer truncate font-medium text-slate-700 dark:text-slate-200" title={g.selection} onClick={() => setOpen((o) => !o)}>{g.selection || '—'}</span>
          <span className="mt-1 block h-1 w-full cursor-pointer overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" onClick={() => setOpen((o) => !o)}>
            <span className={clsx('block h-full rounded-full', barTone)} style={{ width: `${pct}%` }} />
          </span>
          {/* Reason only for bets that aren't fully placed */}
          {missing > 0 && <ReasonInput value={reason} onChange={onReason} />}
        </td>
        <td className="cursor-pointer py-2 pr-2 text-right align-top tabular-nums text-slate-500" onClick={() => setOpen((o) => !o)}>{g.placements}</td>
        <td className="cursor-pointer py-2 pr-2 text-right align-top tabular-nums font-medium text-slate-700 dark:text-slate-200" onClick={() => setOpen((o) => !o)}>{money(g.stake)}</td>
        <td className="py-2 pr-2 align-top">
          <div className="flex items-center justify-center gap-1">
            <input
              type="number" min={0} step={0.25} value={units}
              onChange={(e) => onUnits(Math.max(0, Number(e.target.value)))}
              className="input no-spinner w-14 px-1.5 py-1 text-center text-xs tabular-nums"
              list="unit-presets" title="Units required for this bet"
            />
            <span className="text-xs text-slate-400">u</span>
          </div>
        </td>
        <td className="py-2 pr-2 text-right align-top tabular-nums text-slate-400">{money(target)}</td>
        <td
          className={clsx('py-2 pr-2 text-right align-top tabular-nums font-semibold',
            missing > 0 ? 'text-amber-600 dark:text-amber-400' : over > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400')}
          title={over > 0 ? `Overstaked by ${money(over)}` : missing > 0 ? `Short by ${money(missing)}` : 'Fully placed'}
        >
          {missing > 0 ? money(missing) : over > 0 ? `+${money(over)}` : '✓ full'}
        </td>
        <td className="cursor-pointer py-2 pr-1 text-right align-top" onClick={() => setOpen((o) => !o)}>
          <span className={clsx('chip', STATUS_STYLE[g.status])}>{STATUS_LABEL[g.status]}</span>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
          <td colSpan={7} className="px-3 py-2">
            <table className="w-full text-xs">
              <tbody>
                {g.members.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100 first:border-0 dark:border-slate-800/60">
                    <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{m.account || '—'}</td>
                    <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400">{m.betPlatform || '—'}</td>
                    <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-300">{m.selection}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-slate-500">{money(m.stake)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums text-slate-500">{decimalOdds(m.odds)}</td>
                    <td className="py-1.5 text-right"><span className={clsx('chip', STATUS_STYLE[m.status])}>{STATUS_LABEL[m.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <p className={clsx('text-sm font-bold tabular-nums', tone || 'text-slate-700 dark:text-slate-200')}>{value}</p>
    </div>
  );
}
