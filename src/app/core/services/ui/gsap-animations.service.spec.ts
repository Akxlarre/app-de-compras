import { TestBed } from '@angular/core/testing';
import { GsapAnimationsService } from './gsap-animations.service';

/**
 * Arma una raíz de vista con bloques marcados, como la que produce una
 * página real: la clase de tier va en la raíz y los bloques llevan
 * data-anim.
 */
function montarVista(claseTier: string): HTMLElement {
  const root = document.createElement('div');
  root.className = claseTier;
  root.innerHTML = `
    <div data-anim="ceremonia">ceremonia</div>
    <div data-anim="bloque">uno</div>
    <div data-anim="bloque">dos</div>
  `;
  document.body.appendChild(root);
  return root;
}

/** Ningún bloque puede quedar con opacidad inline en 0. */
function hayBloquesInvisibles(root: HTMLElement): boolean {
  return [...root.querySelectorAll<HTMLElement>('[data-anim]')].some((el) => {
    const op = el.style.opacity;
    return op !== '' && parseFloat(op) < 0.99;
  });
}

/**
 * El servicio resuelve la preferencia de movimiento en su constructor
 * leyendo `window.matchMedia`, que el setup de tests define como no
 * configurable — no se puede sustituir. Se escribe la bandera interna,
 * que es exactamente lo que consulta la rama bajo prueba.
 */
function crearServicio(reduceMotion: boolean): GsapAnimationsService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [GsapAnimationsService] });
  const service = TestBed.inject(GsapAnimationsService);
  (service as unknown as { prefersReducedMotion: boolean }).prefersReducedMotion = reduceMotion;
  return service;
}

describe('GsapAnimationsService', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('should be created', () => {
    expect(crearServicio(false)).toBeTruthy();
  });

  describe('animateTierEnter', () => {
    it('no deja nada invisible cuando el usuario pidió movimiento reducido', () => {
      const service = crearServicio(true);
      const root = montarVista('tier-ceremonia');

      service.animateTierEnter(root);

      expect(hayBloquesInvisibles(root)).toBe(false);
    });

    it('no anima en tier-dato: durante la sesión activa nada se mueve', () => {
      const service = crearServicio(false);
      const root = montarVista('tier-dato');

      service.animateTierEnter(root);

      expect(hayBloquesInvisibles(root)).toBe(false);
    });

    it('revela el contenido aunque la animación nunca termine', () => {
      vi.useFakeTimers();
      const service = crearServicio(false);
      const root = montarVista('tier-ceremonia');

      service.animateTierEnter(root);

      // Este es el bug que se midió en navegador: la timeline se
      // interrumpe por un re-render y los bloques quedan congelados en
      // opacity 0. La red de seguridad tiene que revelarlos igual.
      vi.advanceTimersByTime(3000);

      expect(hayBloquesInvisibles(root)).toBe(false);
    });

    it('tolera una raíz nula sin romper la vista', () => {
      const service = crearServicio(false);

      expect(() => service.animateTierEnter(null)).not.toThrow();
      expect(() => service.animateTierEnter(undefined)).not.toThrow();
    });

    it('tolera una raíz sin bloques marcados', () => {
      const service = crearServicio(false);
      const root = document.createElement('div');
      root.className = 'tier-trabajo';
      document.body.appendChild(root);

      expect(() => service.animateTierEnter(root)).not.toThrow();
    });
  });

  /** Lista con dos filas cuya posición vertical se controla (jsdom no calcula layout). */
  function montarLista(): {
    list: HTMLElement;
    a: HTMLElement;
    b: HTMLElement;
    tops: Map<HTMLElement, number>;
  } {
    const list = document.createElement('div');
    const a = document.createElement('div');
    const b = document.createElement('div');
    list.append(a, b);
    document.body.appendChild(list);
    const tops = new Map<HTMLElement, number>([
      [a, 0],
      [b, 80],
    ]);
    for (const el of [a, b]) {
      el.getBoundingClientRect = () =>
        ({ top: tops.get(el)!, left: 0, width: 300, height: 80 } as DOMRect);
    }
    return { list, a, b, tops };
  }

  describe('runViewTransition (spec 0013, Q5)', () => {
    type Doc = Document & { startViewTransition?: unknown };
    afterEach(() => {
      delete (document as Doc).startViewTransition;
      document.documentElement.className = '';
    });

    it('sin View Transitions en el navegador, solo aplica el cambio', async () => {
      const update = vi.fn().mockResolvedValue(true);

      await crearServicio(false).runViewTransition('vt-login-enter', update);

      expect(update).toHaveBeenCalledTimes(1);
    });

    it('con movimiento reducido no hay transición', async () => {
      const start = vi.fn();
      (document as Doc).startViewTransition = start;
      const update = vi.fn().mockResolvedValue(true);

      await crearServicio(true).runViewTransition('vt-login-enter', update);

      expect(start).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledTimes(1);
    });

    it('envuelve el cambio en una transición y marca el documento mientras dura', async () => {
      let finish!: () => void;
      const finished = new Promise<void>((r) => (finish = r));
      (document as Doc).startViewTransition = vi.fn((cb: () => Promise<unknown>) => {
        void cb();
        return { finished };
      });
      const update = vi.fn().mockResolvedValue(true);

      await crearServicio(false).runViewTransition('vt-login-enter', update);

      expect(update).toHaveBeenCalledTimes(1);
      expect(document.documentElement.classList.contains('vt-login-enter')).toBe(true);
      finish();
      await finished;
      await Promise.resolve();
      expect(document.documentElement.classList.contains('vt-login-enter')).toBe(false);
    });
  });

  describe('animateListReorder (spec 0013, Q3)', () => {
    it('invierte la posición en el mismo tick del cambio: no se pinta un frame en el lugar nuevo', () => {
      const service = crearServicio(false);
      const { list, a, tops } = montarLista();
      const change = vi.fn(() => {
        tops.set(a, 80); // a baja al final (marcado)
      });

      service.animateListReorder(list, change);

      expect(change).toHaveBeenCalledTimes(1);
      // Sin esperar requestAnimationFrame: a ya está desplazado a su posición vieja (−80px).
      expect(a.style.transform).toContain('-80px');
    });

    it('con movimiento reducido solo aplica el cambio', () => {
      const service = crearServicio(true);
      const { list, a, tops } = montarLista();
      const change = vi.fn(() => tops.set(a, 80));

      service.animateListReorder(list, change);

      expect(change).toHaveBeenCalledTimes(1);
      expect(a.style.transform).toBe('');
    });

    it('lista vacía: solo aplica el cambio', () => {
      const service = crearServicio(false);
      const list = document.createElement('div');
      const change = vi.fn();

      service.animateListReorder(list, change);

      expect(change).toHaveBeenCalledTimes(1);
    });
  });
});
