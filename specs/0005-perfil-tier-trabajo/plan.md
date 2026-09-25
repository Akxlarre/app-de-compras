# Plan técnico — 0005-perfil-tier-trabajo

## Estrategia

Igual que el Catálogo: **Tier 2 resta**. Perfil no compite por
atención. Lo único con identidad es el avatar, y es también lo único
que hoy reprueba contraste.

## Artefactos afectados

| Archivo | Qué cambia |
|---|---|
| `features/profile/profile.page.ts` | Raíz en tier y entrada animada acotada, íconos a Lucide, pisos tipográficos, barrido de colores, avatar |

## Orden

1. Medir en navegador: objetivos táctiles, tamaños de letra, contraste
   del avatar y colores computados. Es la línea base.
2. Raíz `.tier-trabajo` + `animateTierEnter(host)` en `ngAfterViewInit`,
   en lugar del `querySelectorAll` global.
3. `ion-icon` → `app-icon`: `cloud-download`, `settings`,
   `chevron-right`. Se quita `addIcons` de ionicons.
4. "OPCIONES" a `--text-xs` (13px).
5. **Avatar**: fondo ember sólido con iniciales en tinta (7.0:1, el mismo
   par del chip activo). Sale el degradé y sale el resplandor azul. Es el
   único elemento de marca decorativo de la vista, dentro de la regla
   3-2-1.
6. Cerrar sesión: el rojo pasa a `--state-error-bg` y
   `--state-error-border`, con presionado sobre esos mismos tokens.
7. Barrido de respaldos `var(--x, #hex)` y de `rgba()` blancos, a
   `--bg-surface`, `--border-subtle` y `--text-*`. Se quita
   `.page-container` (sin uso) y la regla de fondo propia (la global ya
   pinta la tinta desde fix-028).

## Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| `animateTierEnter` deja algo en opacity 0 | Ya tiene red de seguridad incondicional (0003). Verificar en navegador que todo quede visible |
| El spinner de "Buscar Actualizaciones" pierde su color al quitar el inline | Pasarlo a `color="primary"`, que desde fix-030 es ember |
| Cambiar el avatar se lee como cambio de identidad | Es corrección de contraste; se muestra antes/después al usuario |

## Verificación

```bash
npm run test:ci
ng build
```

Más navegador: re-medir con el mismo script de la línea base.
