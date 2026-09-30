/**
 * Iniciales para un avatar (spec 0013, Q42). Con nombres parecidos ("test3", "test4") las dos
 * primeras letras se repetían ("TE"); una palabra con número usa letra + número.
 */
export function initialsOf(displayName: string): string {
  // Tope antes de partir: un display_name enorme no debe crear un arreglo gigante.
  const safe = String(displayName ?? '').slice(0, 200);
  const parts = safe.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

  const word = parts[0];
  const digit = word.slice(1).match(/\d/)?.[0];
  return (digit ? word[0] + digit : word.slice(0, 2)).toUpperCase();
}

/** Tonos de avatar: variables del tema (sin colores fijos). */
export const AVATAR_TONES = [
  'var(--ds-brand)',
  'var(--brand-ember)',
  'var(--brand-gold)',
  'var(--state-error)',
] as const;

/** Tono estable por usuario, para distinguir miembros con iniciales parecidas. */
export function avatarTone(userId: string): (typeof AVATAR_TONES)[number] {
  let hash = 0;
  for (const ch of userId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}
