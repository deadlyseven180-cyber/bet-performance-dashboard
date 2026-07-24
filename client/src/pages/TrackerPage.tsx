import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Target, CalendarDays } from 'lucide-react';
import clsx from 'clsx';
import { useData } from '@/context/DataContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { groupDuplicateBets, distinctValues, type BetGroup } from '@/services/analytics';
import { SectionCard } from '@/components/ui/primitives';
import { ErrorBanner } from '@/components/dashboard/StatusBanners';
import { money, moneyKpi, formatDate, decimalOdds, STATUS_LABEL, STATUS_STYLE, profitColor } from '@/utils/format';

const DEFAULT_SERVICES = ['60% Dude', 'SAIYAN', 'Lyno'];
const DEFAULT_TARGETS: Record<string, number> = { '60% Dude': 3000, SAIYAN: 1500, Lyno: 2000 };
const DEFAULT_TARGET = 1000;

/**
 * Per-service bet tracker. For each tracked service on a chosen day it groups
 * that day's bets (same rules as everywhere else — one tip across accounts is
 * one bet), sums how much was actually placed, and compares it to a target
 * stake to show how much is still missing per bet.
 */
export function TrackerPage() {
  const { bets } = useData();
  const [services, setServices] = useLocalStorage<string[]>('tracker.services', DEFAULT_SERVICES);
  const [targets, setTargets] = useLocalStorage<Record<string, number>>('tracker.targets', DEFAULT_TARGETS);
  const [editing, setEditing] = useState(false);

  // Days that any tracked service has bets on, newest first; default to latest.
  const days = useMemo(() => {
    const set = new Set<string>();
    for (const b of bets) if (b.date && services.includes(b.service)) set.add(b.date);
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [bets, services]);

  const [dayIdx, setDayIdx] = useState(0);
  const day = days[Math.min(dayIdx, Math.max(0, days.length - 1))] ?? null;

  const targetFor = (svc: string) => (targets[svc] ?? DEFAULT_TARGET);
  const allServices = useMemo(() => distinctValues(bets, 'service'), [bets]);
  const addable = allServices.filter((s) => !services.includes(s));

  return (
    <div className="space-y-5">
      <ErrorBanner />

      {/* Controls: day navigation + config toggle */}
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

        <button onClick={() => setEditing((e) => !e)} className={clsx('btn-ghost', editing && 'border-brand-300 text-brand-700 dark:text-brand-300')}>
          <Target className="h-4 w-4" /> Services & targets
        </button>
      </div>

      {editing && (
        <SectionCard title="Tracked services" subtitle="Set the target total stake per bet for each service">
          <div className="space-y-2">
            {services.map((svc) => (
              <div key={svc} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{svc}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-400">$</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={targetFor(svc)}
                    onChange={(e) => setTargets((t) => ({ ...t, [svc]: Number(e.target.value) || 0 }))}
                    className="input w-28 py-1 text-sm"
                  />
                  <span className="text-xs text-slate-400">target / bet</span>
                </div>
                <button
                  onClick={() => setServices((s) => s.filter((x) => x !== svc))}
                  className="ml-auto text-slate-400 hover:text-rose-500"
                  title="Stop tracking this service"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {addable.length > 0 && (
            <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Plus className="h-4 w-4 text-slate-400" />
              <select
                className="input w-auto py-1.5 text-sm"
                value=""
                onChange={(e) => { if (e.target.value) setServices((s) => [...s, e.target.value]); }}
              >
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

      {day && services.map((svc) => (
        <ServiceDay key={svc} service={svc} day={day} bets={bets} target={targetFor(svc)} />
      ))}
    </div>
  );
}

function ServiceDay({ service, day, bets, target }: {
  service: string; day: string; bets: import('@/types').Bet[]; target: number;
}) {
  const groups = useMemo(
    () => groupDuplicateBets(bets.filter((b) => b.service === service && b.date === day)),
    [bets, service, day],
  );

  const totals = useMemo(() => {
    let placed = 0, missing = 0, profit = 0;
    for (const g of groups) {
      placed += g.stake;
      missing += Math.max(0, target - g.stake);
      profit += g.status === 'pending' || g.status === 'unknown' ? 0 : g.profit;
    }
    return { placed, missing, profit, target: groups.length * target };
  }, [groups, target]);

  return (
    <SectionCard
      title={service}
      subtitle={`${groups.length} bet${groups.length === 1 ? '' : 's'} · target ${moneyKpi(target)} each`}
      action={
        <div className="flex items-center gap-4 text-right">
          <Stat label="Placed" value={moneyKpi(totals.placed)} />
          <Stat label="Missing" value={moneyKpi(totals.missing)} tone={totals.missing > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'} />
          <Stat label="P/L" value={`${totals.profit > 0 ? '+' : ''}${moneyKpi(totals.profit)}`} tone={profitColor(totals.profit)} />
        </div>
      }
      bodyClassName="pt-2"
    >
      {groups.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No bets for {service} on this day.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-[0.08em] text-slate-400 dark:border-slate-800">
                <th className="py-2 pr-2 font-medium">Bet</th>
                <th className="py-2 pr-2 text-right font-medium">Accounts</th>
                <th className="py-2 pr-2 text-right font-medium">Placed</th>
                <th className="py-2 pr-2 text-right font-medium">Target</th>
                <th className="py-2 pr-2 text-right font-medium">Missing</th>
                <th className="py-2 pr-1 text-right font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => <BetRow key={g.id} g={g} target={target} />)}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function BetRow({ g, target }: { g: BetGroup; target: number }) {
  const [open, setOpen] = useState(false);
  const missing = Math.max(0, target - g.stake);
  const pct = target > 0 ? Math.min(100, (g.stake / target) * 100) : 100;

  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer border-b border-slate-50 hover:bg-brand-50/40 dark:border-slate-800/60 dark:hover:bg-slate-800/50"
        title="Click to see each account's placement"
      >
        <td className="max-w-[280px] py-2 pr-2">
          <span className="block truncate font-medium text-slate-700 dark:text-slate-200" title={g.selection}>{g.selection || '—'}</span>
          {/* fill bar: how close placed is to target */}
          <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <span className={clsx('block h-full rounded-full', missing > 0 ? 'bg-amber-400' : 'bg-emerald-500')} style={{ width: `${pct}%` }} />
          </span>
        </td>
        <td className="py-2 pr-2 text-right tabular-nums text-slate-500">{g.placements}</td>
        <td className="py-2 pr-2 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200">{money(g.stake)}</td>
        <td className="py-2 pr-2 text-right tabular-nums text-slate-400">{money(target)}</td>
        <td className={clsx('py-2 pr-2 text-right tabular-nums font-semibold', missing > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
          {missing > 0 ? money(missing) : '✓ full'}
        </td>
        <td className="py-2 pr-1 text-right">
          <span className={clsx('chip', STATUS_STYLE[g.status])}>{STATUS_LABEL[g.status]}</span>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-800/30">
          <td colSpan={6} className="px-3 py-2">
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
