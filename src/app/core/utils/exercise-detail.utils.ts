/**
 * Lógica del detalle de ejercicio. Antes vivía duplicada en el Catálogo
 * y en el selector de ejercicios (spec 0007).
 */

/** Ícono de Lucide que representa el ejercicio, por músculo o categoría. */
export function getExerciseIcon(muscle: string, category: string): string {
  const m = (muscle || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (m.includes('pecho') || m.includes('chest')) return 'shield-check';
  if (m.includes('espalda') || m.includes('back')) return 'layers';
  // Unión de las dos copias anteriores: el selector reconocía además
  // cuádriceps, hamstring, calves y deltoid.
  if (
    m.includes('pierna') ||
    m.includes('cuádriceps') ||
    m.includes('quad') ||
    m.includes('femoral') ||
    m.includes('isquio') ||
    m.includes('hamstring') ||
    m.includes('pantorrilla') ||
    m.includes('calves')
  )
    return 'activity';
  if (m.includes('hombro') || m.includes('shoulder') || m.includes('deltoid')) return 'dumbbell';
  if (m.includes('bíceps') || m.includes('bicep')) return 'activity';
  if (m.includes('tríceps') || m.includes('tricep')) return 'activity';
  if (m.includes('abdom') || m.includes('core')) return 'circle';
  if (m.includes('glúteo') || m.includes('glute')) return 'circle';
  if (c.includes('cardio')) return 'activity';
  return 'dumbbell';
}

/**
 * Parte las instrucciones en pasos. Acepta saltos de línea reales y los
 * literales que llegan de la base (`\n`, `/n`), y quita la numeración o
 * los guiones del comienzo.
 */
export function parseInstructions(text: string | undefined): string[] {
  if (!text) return [];
  const normalized = text
    .replace(/\\n/g, '\n')
    .replace(/\/n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  return normalized
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => s.replace(/^(\d+[\.\)]|\-|\*|Paso\s*\d+:?)\s*/i, ''));
}

/** Nombre de la fase de un paso según su posición. */
export function getStepPhase(index: number, total: number): { label: string } {
  if (index === 0) return { label: 'Posición Inicial' };
  if (index === total - 1) return { label: 'Finalización' };
  return { label: `Paso ${index + 1}` };
}

/** True si no hay traducción al español o si es igual al original. */
export function isUntranslated(es: string | undefined, en: string | undefined): boolean {
  if (!es) return true;
  return es.trim() === en?.trim();
}
