# Fix: íconos "brain" y "loader-2" rotos en el creador de mesociclo

> id: fix-021-iconos-brain-loader2
> refs: encontrado durante revisión manual del flujo de Mesociclo (pantalla
>   de "Estrategia de Periodización" y estado "Guardando..." al crear el
>   plan). Usuario autorizó arreglar ("Arreglar los 3 ahora").
> status: done
> created: 2026-09-14
> closed: 2026-09-14

## Síntoma

Consola: `Error: The "brain" icon has not been provided by any available
icon providers` y el mismo error para `"loader-2"`. Los íconos no
renderizan (quedan vacíos) en la tarjeta "Auto-Regulada (RIR/RPE)" del
paso 3 del creador de plan y en el botón "Guardando..." al confirmar la
creación.

## Causa raíz

Mismo patrón que fix-017 (`clipboard-list`, `play`): `icon.component.ts`
declara `brain` y `loader-2` en su set `PROVIDED_ICONS` (asumiendo que
están registrados localmente), pero nunca se agregaron al
`LucideAngularModule.pick({...})` real de `app.config.ts`.

## Auditoría completa realizada

Dado que este es el tercer hallazgo de este mismo patrón en la sesión, se
comparó programáticamente el set completo `PROVIDED_ICONS` (171 nombres)
contra el `pick()` real de `app.config.ts` (78 nombres), con conversión
PascalCase→kebab-case corregida (el intento inicial fallaba con sufijos
numéricos: `Trash2` → `trash2` en vez de `trash-2`).

Resultado: **108 nombres** están en `PROVIDED_ICONS` pero no en `pick()`.
De esos, se cruzó cuáles se usan realmente en algún `.ts`/`.html` del
proyecto (excluyendo los propios archivos de registro de íconos):

- **85** no se usan en ningún lugar del código — quedan como deuda latente
  documentada, no se tocan (agregarlos todos infla el bundle sin
  necesidad).
- **21** se usan exclusivamente dentro de
  `core/services/auth/menu-config.service.ts` — verificado que este
  servicio es **código muerto**: solo lo consume `BreadcrumbService`, que
  a su vez no se inyecta en ningún componente de la app (mismo patrón que
  `dashboard.component.ts`, eliminado en fix-006). Al no renderizarse
  nunca, esos 21 nombres jamás disparan el bug — no se tocan en este fix.
- **2** (`brain`, `loader-2`) se usan en código realmente renderizado:
  `mesocycle-builder.page.ts`. Estos son los únicos que se corrigen acá.

## Cambio

Agregar `Brain` y `Loader2` al import + `pick({...})` de
`LucideAngularModule` en `app.config.ts`, siguiendo el mismo patrón de
fix-017.

## Fuera de alcance

- Los 85 nombres de `PROVIDED_ICONS` sin ningún uso en el código y los 21
  usados solo en `menu-config.service.ts` (código muerto) — no se
  registran en `pick()` porque no hay ningún caso de uso real que lo
  justifique hoy. Si en el futuro se usa cualquiera de esos nombres en un
  `<app-icon>` nuevo, reproducirá este mismo bug — vale la pena que quede
  documentado acá para quien lo encuentre.
- `menu-config.service.ts` / `BreadcrumbService` en sí (código muerto,
  candidato a eliminación tipo fix-006) — no se borra en este fix porque
  el pedido puntual era arreglar íconos rotos, no hacer limpieza de código
  muerto. Se documenta como hallazgo para una spec/fix aparte si se decide
  abordarlo.

## ACs Afectados

Ninguno formal.

## Test de Regresión

Manual en navegador: creado un mesociclo hasta el paso 3 → ícono "brain"
(cerebro) renderiza correctamente junto a "Auto-Regulada (RIR/RPE)" → click
en "Crear Plan" → sin error de "loader-2 icon has not been provided" en
consola (antes del fix aparecía en cada intento).

`npm run test:ci` → 86 tests, 0 fallos. `ng build` (producción) → build
exitoso; se verificó además que `Loader2` es un export válido de
`lucide-angular` (no hay `.d.ts` individual bajo ese nombre en el paquete
instalado, pero el build y el render en runtime lo resuelven sin error).
