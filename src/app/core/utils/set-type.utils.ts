/**
 * Nombre completo de cada tipo de serie, para `aria-label`: en pantalla
 * el tipo se muestra con una letra y un lector de pantalla necesita la
 * palabra. Lo usan el detalle de sesión y la sesión activa.
 */
const NOMBRES_TIPO_SERIE: Record<string, string> = {
  normal: 'Normal',
  warmup: 'Calentamiento',
  dropset: 'Drop set',
  failure: 'Al fallo',
};

/** Un tipo ausente o desconocido se trata como serie normal. */
export function nombreTipoSerie(tipo: string | null | undefined): string {
  return NOMBRES_TIPO_SERIE[tipo ?? ''] ?? NOMBRES_TIPO_SERIE['normal'];
}
