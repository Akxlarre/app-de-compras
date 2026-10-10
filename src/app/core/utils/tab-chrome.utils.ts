/** Pestaña marcada y visibilidad de la barra para una URL (spec 0013, 0016). */
export interface TabChrome {
  tab: string | null;
  hideBar: boolean;
}

const TABS = ['active', 'purchases', 'products', 'profile'];

/** Pantallas que no son pestaña: a cuál pertenecen y si ocultan la barra. */
const SUB_PAGES: Record<string, TabChrome> = {
  // El cierre es un flujo: sin barra que invite a salir a mitad (Q34, 0016 D3).
  close: { tab: 'purchases', hideBar: true },
};

export function tabChromeFor(url: string): TabChrome {
  const path = url.split(/[?#]/)[0];
  const segment = path.match(/^\/app\/([^/]+)/)?.[1];
  if (!segment) return { tab: null, hideBar: false };
  if (TABS.includes(segment)) return { tab: segment, hideBar: false };
  return SUB_PAGES[segment] ?? { tab: null, hideBar: false };
}
