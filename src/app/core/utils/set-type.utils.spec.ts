import { nombreTipoSerie } from './set-type.utils';

describe('nombreTipoSerie', () => {
  it('nombra completo cada tipo de serie', () => {
    expect(nombreTipoSerie('normal')).toBe('Normal');
    expect(nombreTipoSerie('warmup')).toBe('Calentamiento');
    expect(nombreTipoSerie('dropset')).toBe('Drop set');
    expect(nombreTipoSerie('failure')).toBe('Al fallo');
  });

  it('trata un tipo ausente o desconocido como serie normal', () => {
    expect(nombreTipoSerie(undefined)).toBe('Normal');
    expect(nombreTipoSerie('')).toBe('Normal');
    expect(nombreTipoSerie('superserie')).toBe('Normal');
  });
});
