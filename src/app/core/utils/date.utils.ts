/**
 * Locale por defecto para la aplicación (Chile).
 */
export const DEFAULT_LOCALE = 'es-CL';

/**
 * Formats a Date to ISO date string (YYYY-MM-DD).
 */
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Formats a Date using Intl.DateTimeFormat with Chilean locale support.
 *
 * @param date - Date object or ISO string
 * @param locale - BCP 47 locale (default: 'es-CL')
 * @param options - Intl.DateTimeFormatOptions (default: year numeric, month long, day numeric)
 */
export function formatDate(
  date: Date | string,
  locale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(
    locale,
    options ?? { year: 'numeric', month: 'long', day: 'numeric' }
  ).format(d);
}

/**
 * Formats a date using Chilean conventions (e.g. 'sábado, 12 de septiembre de 2026').
 */
export function formatChileanDate(
  date: Date | string,
  style: 'full' | 'long' | 'medium' | 'short' = 'long'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, { dateStyle: style }).format(d);
}

/**
 * Formats a date with time for Chile (e.g. '12 sept, 20:00').
 */
export function formatChileanDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Días de calendario (hora local) entre una fecha y `now`: ayer a las 23:55 cuenta 1 aunque
 * hayan pasado minutos. Una fecha futura cuenta 0.
 */
export function daysSince(iso: string, now: Date = new Date()): number {
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((day(now) - day(new Date(iso))) / 86_400_000);
  return Math.max(0, days);
}

/** 0 → 'hoy', 1 → 'ayer', n → 'hace n días'. */
export function formatDaysAgo(days: number): string {
  if (days <= 0) return 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
