import { useEffect, useState } from 'react';

/** Subscribe to a CSS media query from JS (for props CSS can't reach, e.g. Recharts sizing). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Phone-sized viewport (below Tailwind's `sm` breakpoint). */
export const useIsMobile = () => useMediaQuery('(max-width: 639px)');
