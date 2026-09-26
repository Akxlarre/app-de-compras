/** Alfabeto de los códigos de invitación (sin 0/O/1/I). Igual que `shop.new_invite_code()`. */
const INVITE_CODE = /^[A-HJ-NP-Z2-9]{8}$/;

/**
 * Código tal como se guarda: mayúsculas, sin guiones ni espacios.
 * @returns null si no son 8 caracteres válidos (así no se consulta la BD por un error de tipeo).
 */
export function normalizeInviteCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return INVITE_CODE.test(code) ? code : null;
}

/** `ABCDEFGH` → `ABCD-EFGH`, más fácil de leer y dictar. */
export function formatInviteCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}
