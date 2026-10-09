import { describe, expect, it } from 'vitest';
import { tabChromeFor } from './tab-chrome.utils';

describe('tabChromeFor (spec 0013, 0016)', () => {
  it('las pestañas se marcan a sí mismas y muestran la barra', () => {
    expect(tabChromeFor('/app/active')).toEqual({ tab: 'active', hideBar: false });
    expect(tabChromeFor('/app/purchases')).toEqual({ tab: 'purchases', hideBar: false });
    expect(tabChromeFor('/app/products')).toEqual({ tab: 'products', hideBar: false });
    expect(tabChromeFor('/app/profile')).toEqual({ tab: 'profile', hideBar: false });
  });

  it('el detalle de una compra cuelga de Compras (0016 AC1)', () => {
    expect(tabChromeFor('/app/purchases/abc')).toEqual({ tab: 'purchases', hideBar: false });
  });

  it('el cierre oculta la barra y cuelga de Compras (Q34, 0016 D3)', () => {
    expect(tabChromeFor('/app/close')).toEqual({ tab: 'purchases', hideBar: true });
  });

  it('ignora query y fragmento', () => {
    expect(tabChromeFor('/app/purchases?x=1#y')).toEqual({ tab: 'purchases', hideBar: false });
  });

  it('Boletas e Historial ya no son pantallas (redirigen a Compras)', () => {
    expect(tabChromeFor('/app/receipt').tab).toBeNull();
    expect(tabChromeFor('/app/history').tab).toBeNull();
  });

  it('una ruta desconocida no marca pestaña', () => {
    expect(tabChromeFor('/login')).toEqual({ tab: null, hideBar: false });
  });
});
