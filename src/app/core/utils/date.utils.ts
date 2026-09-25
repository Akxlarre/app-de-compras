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
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(
    locale,
    options ?? { year: 'numeric', month: 'long', day: 'numeric' },
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
 * Capitalizes the first letter of a string.
 */
export function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
