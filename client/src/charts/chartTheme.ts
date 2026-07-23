import { useEffect, useState } from 'react';

/** Categorical palette — readable on both light and dark backgrounds. */
export const CATEGORICAL = [
  '#3b63f6', '#0ea5e9', '#14b8a6', '#8b5cf6', '#f59e0b',
  '#ec4899', '#22c55e', '#ef4444', '#64748b', '#a855f7',
];

export const POSITIVE = '#10b981';
export const NEGATIVE = '#f43f5e';
export const NEUTRAL = '#94a3b8';
export const BRAND = '#3b63f6';

export const profitFill = (v: number) => (v >= 0 ? POSITIVE : NEGATIVE);

/** Subscribe to the document's dark-mode class so charts recolour on toggle. */
export function useIsDark(): boolean {
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains('dark')),
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export function useChartColors() {
  const dark = useIsDark();
  return {
    dark,
    grid: dark ? '#1e293b' : '#eef2f7',
    axis: dark ? '#64748b' : '#94a3b8',
    text: dark ? '#cbd5e1' : '#475569',
    tooltipBg: dark ? '#0f172a' : '#ffffff',
    tooltipBorder: dark ? '#1e293b' : '#e2e8f0',
  };
}
