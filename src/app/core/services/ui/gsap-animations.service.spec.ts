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
});
