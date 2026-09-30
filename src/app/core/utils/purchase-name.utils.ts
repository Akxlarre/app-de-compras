/**
 * Nombre visible de una compra (spec 0012). La BD guarda "Lista de compras" (o los nombres
 * viejos) hasta que alguien la renombra; mientras tanto se muestra la fecha local de la compra.
 */
export const AUTO_LIST_NAMES: readonly string[] = [
  'Lista de compras',
  'Compra de la Semana',
  'Compra Inteligente',
  'Compra sin lista',
];

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function isAutoListName(name: string): boolean {
  return AUTO_LIST_NAMES.includes(name.trim());
}

/** "mié 30 sep" (con el año si no es el actual), en hora local. */
function dayLabel(date: Date, now: Date): string {
  const base = `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? base : `${base} ${date.getFullYear()}`;
}

function timeLabel(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(
    2,
    '0'
  )}`;
}

/** "Compra del mié 30 sep" para nombres automáticos; si no, el nombre que puso el usuario. */
export function purchaseTitle(name: string, completedAt: string, now: Date = new Date()): string {
  if (!isAutoListName(name)) return name;
  const prefix = name.trim() === 'Compra sin lista' ? 'Compra sin lista del' : 'Compra del';
  return `${prefix} ${dayLabel(new Date(completedAt), now)}`;
}

/** Títulos de varias compras; las automáticas que coinciden (mismo día) llevan la hora. */
export function disambiguateTitles(
  purchases: { name: string; completedAt: string }[],
  now: Date = new Date()
): string[] {
  const titles = purchases.map((p) => purchaseTitle(p.name, p.completedAt, now));
  const counts = new Map<string, number>();
  purchases.forEach((p, i) => {
    if (isAutoListName(p.name)) counts.set(titles[i], (counts.get(titles[i]) ?? 0) + 1);
  });
  return purchases.map((p, i) =>
    isAutoListName(p.name) && (counts.get(titles[i]) ?? 0) > 1
      ? `${titles[i]} · ${timeLabel(new Date(p.completedAt))}`
      : titles[i]
  );
}
