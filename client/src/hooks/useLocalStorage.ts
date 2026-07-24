import { useCallback, useEffect, useState } from 'react';

/** State that persists to localStorage (so tracker config survives reloads). */
export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw != null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value]);

  const set = useCallback((v: T | ((p: T) => T)) => setValue(v), []);
  return [value, set];
}
