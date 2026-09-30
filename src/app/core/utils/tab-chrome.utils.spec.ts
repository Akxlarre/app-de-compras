import { describe, expect, it } from 'vitest';
import { tabChromeFor } from './tab-chrome.utils';

describe('tabChromeFor (spec 0013)', () => {
  it('las pestañas se marcan a sí mismas y muestran la barra', () => {
    expect(tabChromeFor('/app/active')).toEqual({ tab: 'active', hideBar: false });
    expect(tabChromeFor('/app/receipt')).toEqual({ tab: 'receipt', hideBar: false });
    expect(tabChromeFor('/app/products')).toEqual({ tab: 'products', hideBar: false });
    expect(tabChromeFor('/app/profile')).toEqual({ tab: 'profile', hideBar: false });
  });

  it('Historial cuelga de Mi Lista (Q18)', () => {
    expect(tabChromeFor('/app/history')).toEqual({ tab: 'active', hideBar: false });
  });

  it('en el cierre de compra la barra se oculta (Q29, Q34)', () => {
    expect(tabChromeFor('/app/close')).toEqual({ tab: 'active', hideBar: true });
  });

  it('ignora query y fragmento', () => {
    expect(tabChromeFor('/app/history?x=1#y')).toEqual({ tab: 'active', hideBar: false });
  });

  it('una ruta desconocida no marca pestaña', () => {
    expect(tabChromeFor('/login')).toEqual({ tab: null, hideBar: false });
  });
});
