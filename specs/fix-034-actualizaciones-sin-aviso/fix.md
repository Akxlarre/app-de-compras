# Fix: "Buscar Actualizaciones" no responde nada

> id: fix-034-actualizaciones-sin-aviso
> refs: detectado al verificar Perfil (0005).
> status: done
> created: 2026-09-18
> closed: 2026-09-18
>
> **Cierre.** Los 3 tests de búsqueda manual fallaron antes del cambio y
> pasan después; los 3 de silencio (versión nueva y búsqueda automática)
> siguen verdes. Suite: 108 tests en verde. Build compila. En navegador,
> tocar "Buscar Actualizaciones" con la app al día muestra "Estás al día"
> como toast informativo.
>
> **Pasa a fix-035:** el toast informativo sale con borde azul
> (`#2563eb`, de PrimeNG, no de Eclipse) y los toasts aparecen encima de
> la barra de sesión, tapándola. Pasa con cualquier toast de la app.

## Síntoma

En Perfil, tocar "Buscar Actualizaciones" no da ninguna respuesta
visible salvo que haya una versión nueva:

- **al día**: nada;
- **la consulta falla**: nada. `AppUpdateFacade` guarda el error en un
  signal que ninguna vista muestra;
- **sin build nativo**: nada.

> **Corrección al verificar.** Se supuso que en web se caía en "sin build
> nativo". No es así: en web `getCurrentBuild()` devuelve un build, y el
> caso mudo que se veía era "al día". El caso "sin build nativo" sigue
> existiendo en el código y queda cubierto por test.

El usuario no sabe si tocó, si buscó, ni qué encontró.

## Causa raíz

`checkForUpdates()` sirve a dos llamadores con necesidades opuestas:
`app.component` la corre sola al arrancar, donde el silencio es lo
correcto, y Perfil la corre porque el usuario la pidió, donde hace falta
respuesta. La función no distingue uno de otro, así que calla siempre.

## Cambio

1. **`AppUpdateFacade.checkForUpdates(origen)`**: recibe
   `'auto' | 'manual'` (por defecto `'auto'`). Solo en manual avisa con
   un toast los tres casos mudos: al día, falla y sin build nativo. Si
   hay versión nueva no hace falta toast, porque ya aparece el modal de
   actualización. En automático sigue callada, como hoy.
2. **`profile.page.ts`**: llama con `'manual'`.

El texto nuevo va en voseo, que es el registro decidido.

## Test de Regresión

- **Unit** (`app-update.facade.spec.ts`): en manual, un toast por cada
  caso mudo y ninguno si hay versión nueva; en automático, ningún toast.
- `npm run test:ci` + `ng build`.
- Navegador: tocar "Buscar Actualizaciones" con la app al día muestra
  "Estás al día" como aviso informativo, no verde (el verde es para lo
  logrado).
