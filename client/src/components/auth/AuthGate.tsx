import { useEffect, useState, type ReactNode, type FormEvent } from 'react';
import { Lock, Target, Loader2, AlertCircle } from 'lucide-react';
import { sessionApi } from '@/api/sheets';
import { ApiError } from '@/api/client';

/**
 * Gates the whole app behind a shared password when the server requires one
 * (APP_PASSWORD set — i.e. public deployments). When no password is configured
 * the gate is transparent and renders children immediately.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'locked' | 'open'>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    sessionApi.get()
      .then((s) => setState(!s.authRequired || s.authenticated ? 'open' : 'locked'))
      .catch(() => setState('open')); // if the check fails, don't hard-lock the UI
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await sessionApi.login(password);
      setState('open');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  if (state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    );
  }

  if (state === 'locked') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <div className="card w-full max-w-sm p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <Target className="h-6 w-6" />
            </span>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Bet Performance Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This dashboard is private. Enter the password to continue.</p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="input pl-9"
              />
            </div>
            {error && (
              <p className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </p>
            )}
            <button type="submit" disabled={submitting || !password} className="btn-primary w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Unlock
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
