import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';
import clsx from 'clsx';

type ToastKind = 'success' | 'error' | 'info' | 'warning';
interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastCtx {
  push: (kind: ToastKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const Ctx = createContext<ToastCtx | null>(null);

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = ++counter;
    setToasts((t) => [...t, { id, kind, title, message }]);
    setTimeout(() => remove(id), 4500);
  }, [remove]);

  const api: ToastCtx = {
    push,
    success: (t, m) => push('success', t, m),
    error: (t, m) => push('error', t, m),
    info: (t, m) => push('info', t, m),
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => remove(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};
const ACCENT = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  warning: 'text-amber-500',
  info: 'text-brand-500',
};

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const Icon = ICONS[toast.kind];
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 4200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div
      className={clsx(
        'card pointer-events-auto flex items-start gap-3 p-3.5 shadow-lg transition-all',
        leaving ? 'translate-x-4 opacity-0' : 'animate-fade-in',
      )}
      role="status"
    >
      <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', ACCENT[toast.kind])} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{toast.message}</p>}
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
