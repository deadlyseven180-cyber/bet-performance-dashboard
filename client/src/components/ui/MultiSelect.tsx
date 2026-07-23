import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import clsx from 'clsx';

export function MultiSelect({
  label, options, selected, onChange, placeholder = 'All',
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between gap-2 text-left"
      >
        <span className={clsx('truncate', selected.length ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400')}>
          {selected.length === 0 ? placeholder : selected.length === 1 ? selected[0] : `${selected.length} selected`}
        </span>
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <X
              className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600"
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
            />
          )}
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[200px] rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {options.length > 6 && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="input mb-1 py-1.5 text-xs"
            />
          )}
          <div className="max-h-56 overflow-auto">
            {filtered.length === 0 && <p className="px-2 py-3 text-center text-xs text-slate-400">No options</p>}
            {filtered.map((o) => {
              const active = selected.includes(o);
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => toggle(o)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <span className="truncate">{o}</span>
                  {active && <Check className="h-4 w-4 text-brand-500" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
