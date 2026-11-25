/**
 * Ranking shared by the Quick Switcher.
 *
 * Pure and dependency-free on purpose: the switcher imports it, and the
 * headless test suite imports it too. Prefix beats word-start beats substring,
 * and ties break towards the earlier match. -1 means "no match".
 */
export function scoreMatch(candidate: string, query: string): number {
  const haystack = candidate.toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!needle) return 0;
  if (haystack === needle) return 100;
  if (haystack.startsWith(needle)) return 80 - Math.min(haystack.length - needle.length, 20) / 10;
  const wordStart = haystack.split(/[\s\-_#@]+/).some((word) => word.startsWith(needle));
  if (wordStart) return 60;
  const index = haystack.indexOf(needle);
  if (index >= 0) return 40 - Math.min(index, 20) / 10;
  return -1;
}
