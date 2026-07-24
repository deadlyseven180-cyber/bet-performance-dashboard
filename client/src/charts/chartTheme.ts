import { useEffect, useState } from 'react';

/** Categorical palette — readable on both light and dark backgrounds. */
export const CATEGORICAL = [
  '#e8b923', '#5fb3c9', '#c98a5f', '#8f9bb3', '#7fbf8a',
  '#c96f6f', '#9a8fc9', '#c9b45f', '#6f8fa8', '#a8926f',
];

/** Profit/loss stay green/red; the gold accent is never used for either. */
export const POSITIVE = '#2fbf87';
export const NEGATIVE = '#e5575a';
export const NEUTRAL = '#79838f';
export const BRAND = '#e8b923';

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
    grid: dark ? '#1b222b' : '#e6e9ec',
    axis: dark ? '#586371' : '#aeb6bf',
    text: dark ? '#aeb6bf' : '#3d4652',
    tooltipBg: dark ? '#0f141a' : '#ffffff',
    tooltipBorder: dark ? '#28303a' : '#d5dade',
  };
}
