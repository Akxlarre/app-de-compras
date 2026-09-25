# Fix: la entrada animada del Catálogo nunca corre

> id: fix-033-catalogo-entrada-animada
> refs: detectado al migrar Perfil (0005). Corrige lo que se dio por
>   cumplido en AC-01 de 0004.
> status: done
> created: 2026-09-18
> closed: 2026-09-18
>
> **Cierre.** Muestreado cuadro a cuadro al entrar al Catálogo por
> primera vez desde Perfil: los 2 bloques arrancan en `opacity: 0` y
> 10px abajo (t=135ms), animan hasta t=465ms y terminan en `opacity: 1`
> sin estilo en línea residual. Tests: 102 en verde. Build compila.
>
> Queda anotado para el cierre de futuras vistas: verificar que la
> entrada **anima**, no solo que se llama a la función.

## Síntoma

El Catálogo aparece de golpe, sin la entrada de su tier, aunque la spec
0004 cerró AC-01 ("recibe la entrada animada de su tier").

## Causa raíz

`animateTierEnter` anima solo los elementos marcados con
`data-anim="ceremonia"` o `data-anim="bloque"`, y si no encuentra
ninguno sale sin hacer nada. El Catálogo llama a la función en
`ngAfterViewInit`, pero **no tiene ningún bloque marcado**.

Al cerrar 0004 se verificó que la llamada existía, no que animara algo.

## Cambio

`explorer.page.ts`: se marcan con `data-anim="bloque"` sus dos bloques,
el buscador con los chips y la lista de ejercicios.

## Test de Regresión

- Navegador: al entrar al Catálogo desde otra pestaña, los bloques
  arrancan animados (GSAP les pone estilo en línea) y terminan en
  `opacity: 1` sin estilo residual.
- `npm run test:ci` + `ng build`.
