import { describe, it, expect } from 'vitest';
import { daysSince, formatDaysAgo } from './date.utils';

describe('daysSince', () => {
  const now = new Date(2026, 8, 25, 10, 0); // 25 sept, 10:00 local

  it('cuenta días de calendario, no bloques de 24 horas', () => {
    expect(daysSince(new Date(2026, 8, 25, 0, 5).toISOString(), now)).toBe(0);
    expect(daysSince(new Date(2026, 8, 24, 23, 55).toISOString(), now)).toBe(1);
    expect(daysSince(new Date(2026, 8, 15, 12, 0).toISOString(), now)).toBe(10);
  });

  it('una fecha futura cuenta como hoy', () => {
    expect(daysSince(new Date(2026, 8, 26).toISOString(), now)).toBe(0);
  });
});

describe('formatDaysAgo', () => {
  it.each([
    [0, 'hoy'],
    [1, 'ayer'],
    [2, 'hace 2 días'],
    [30, 'hace 30 días'],
  ])('%i → "%s"', (days, text) => {
    expect(formatDaysAgo(days)).toBe(text);
  });
});
