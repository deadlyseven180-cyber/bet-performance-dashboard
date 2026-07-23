import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

export function SectionCard({
  title, subtitle, action, children, className, bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={clsx('card animate-fade-in', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={clsx('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('animate-spin', className)} />;
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={clsx('chip', className)}>{children}</span>;
}

export function EmptyState({ icon, title, message, action }: {
  icon?: ReactNode; title: string; message?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-slate-300 dark:text-slate-600">{icon}</div>}
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        {message && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{message}</p>}
      </div>
      {action}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            value === o.value
              ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-300'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
