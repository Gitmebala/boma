export function formatKES(amount: number | null | undefined): string {
  const n = amount ?? 0;
  const rounded = Math.round(n);
  return `KES ${rounded.toLocaleString('en-KE')}`;
}

export function formatCompactKES(amount: number | null | undefined): string {
  const n = amount ?? 0;
  if (Math.abs(n) >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `KES ${(n / 1_000).toFixed(1)}K`;
  return formatKES(n);
}

export function formatPct(n: number | null | undefined, digits = 1): string {
  return `${((n ?? 0) * 100).toFixed(digits)}%`;
}

export function daysBetween(a: string | Date, b: string | Date = new Date()): number {
  const d1 = new Date(a).setHours(0, 0, 0, 0);
  const d2 = new Date(b).setHours(0, 0, 0, 0);
  return Math.round((d2 - d1) / 86400000);
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}
