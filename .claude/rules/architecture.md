---
paths:
  - "src/app/**/*.ts"
  - "src/app/**/*.html"
---

# Reglas Arquitectónicas

## Estructura de carpetas canónica

```text
src/
├── app/
│   ├── core/
│   │   ├── facades/       # BaseFacade + Facades de dominio (*FacadeService)
│   │   ├── repositories/  # Acceso tipado a Supabase — ÚNICO lugar con .client.from()
│   │   ├── services/      # Servicios transversales (auth, toast, theme, layout…)
│   │   ├── models/        # Interfaces de dominio y DTOs
│   │   ├── utils/         # Funciones puras sin inyección
│   │   ├── guards/        # Route guards
│   │   ├── interceptors/  # HTTP interceptors
│   │   └── directives/    # Directivas de core
│   ├── features/          # Smart Components (páginas enrutables)
│   ├── shared/            # Dumb Components (UI presentacional)
│   └── layout/            # Sidebar, Topbar, Shell
├── styles/
│   ├── tokens/            # SCSS variables — NUNCA hardcodear en componentes
│   └── vendors/           # PrimeNG overrides
supabase/
└── functions/             # Edge Functions de la app (el esquema vive en plataforma-db)
```

## Capas de acceso a datos (de arriba a abajo)

```
UI (features/ shared/)  →  Facade (core/facades/)  →  Repository (core/repositories/)  →  SupabaseService
```

- La UI **NUNCA** inyecta `SupabaseService` ni Repositories directamente.
- Los **Facades** son la única puerta de entrada para la UI. Gestionan estado vía Signals.
- Los **Repositories** son la única capa que toca `supabase.client` (`.from()`, `.rpc()`, `.channel()`, `.storage`, `.functions`). Un método por operación. Retornan tipos de `core/models/` (nunca `{ data, error }`) y **lanzan** el error de Supabase. Realtime: `watchX(id, cb): () => void`.
- `SupabaseService.client` es **solo para Repositories**. `AuthFacade` usa su API de sesión (`signIn`, `onAuthStateChange(cb) → baja`, `updatePassword`, …).
- Un Facade **no** inyecta otro Facade: la composición entre dominios vive en el Smart Component.

### Guardia automática — `src/app/architecture.spec.ts`

Corre en `npm run test:ci` (y en CI). Falla si:

| Regla | Qué detecta |
|---|---|
| (a) | `supabase.client` fuera de `core/repositories/**` o `supabase.service.ts` |
| (b) | `features/`, `shared/` o `layout/` importan `SupabaseService` o un Repository |
| (c) | un facade (salvo `AuthFacade`) importa `SupabaseService` |
| (d) | `@supabase/supabase-js` importado fuera de repositories / infraestructura / models |
| (e) | un facade importa otro facade (salvo `BaseFacade`) |
| (f) | `environment*.ts` con claves que no sean `production`/`supabase.url`/`supabase.anonKey` |
| (g) | un repository de compras usa `client.from/rpc` directo o `schema: 'public'` (compras vive en `shop`; excepción: `profiles`, `app-updates`) |

Si una regla te bloquea, **no la relajes**: crea o amplía el Repository que corresponda.

## Patrón Facade y Núcleo Funcional (Functional Core)

- **SIEMPRE** extender `BaseFacade<T>` de `@core/facades/base.facade` para Facades de dominio.
- **NUNCA** tocar `supabase.client` en un Facade — usar un Repository.
- **NÚCLEO FUNCIONAL (Functional Core):** Extrae la lógica compleja y transformaciones de datos a **funciones puras** en `core/utils/`. Sin `inject()`, sin `signal()`. Testeable instantáneamente sin Angular.

## Funciones Puras (`core/utils/`)

Ubicación obligatoria para lógica de negocio reutilizable que **no depende de estado ni inyecciones**:

```text
core/utils/
├── sales.utils.ts       # Rankings, agregaciones de ventas
├── date.utils.ts        # Formateo, parsing, comparaciones
├── validation.utils.ts  # Validadores de email, RFC, etc.
└── index.ts             # Barrel export
```

### Cuándo crear una util

- Lógica de combinación/agregación que se repite en **2+ Smart Components**
- Cálculos puros (rankings, porcentajes, filtros complejos) que ensucian un `computed()`
- Transformaciones de datos que no requieren estado de Angular

### Cuándo NO crear una util

- Lógica que solo se usa en 1 lugar → dejarla inline en el `computed()` del Smart Component
- Lógica que necesita estado reactivo → pertenece al Facade
- Wrappers triviales de una línea → no agregan valor

### Convenciones

- Archivo: `{dominio}.utils.ts` (kebab-case)
- Funciones: puras, sin side effects, sin `inject()`, sin `signal()`
- Exports: siempre a través del barrel `core/utils/index.ts`
- Tests: cada `*.utils.ts` debe tener su `*.utils.spec.ts` — son las más fáciles de testear

## Detección de cambios

- `changeDetection: ChangeDetectionStrategy.OnPush` en **TODOS** los componentes

## Signals & RxJS

- `signal()` → estado sincrónico UI (contadores, modales, toggles)
- `RxJS` → flujos asíncronos en Servicios
- `toSignal()` → exponer RxJS a templates en el Facade

## Templates

- **PROHIBIDO**: `*ngIf`, `*ngFor`, `ngClass`, `ngStyle`, `@Input()`, `@Output()`
- **OBLIGATORIO**: `@if`, `@for`, `[class.active]`, `[style.width.px]`, `input()`, `output()`

## Smart vs Dumb Components

- **Dumb (`shared/`)**: Solo `input()` y `output()`. Sin inyección de Facades.
- **Smart (`features/`)**: Inyectan Facades. Coordinan Dumb Components.
- **Skeleton colocated**: Cada Dumb que recibe data async tiene su `{nombre}-skeleton.component.ts` al lado

## Clases Semánticas vs Tailwind Genérico

En componentes de presentación (`shared/`), **preferir siempre** las clases semánticas del design system sobre la composición directa de utilities Tailwind:

| Necesidad | CORRECTO | PROHIBIDO |
|---|---|---|
| Número KPI grande | `.kpi-value` | `text-4xl font-bold tracking-tight` |
| Etiqueta de KPI | `.kpi-label` | `text-xs text-gray-500 uppercase` |
| Banner/Hero section | `.surface-hero` | `bg-gradient-to-br from-blue-600 to-purple-600` |
| Overlay glass | `.surface-glass` | `bg-white/90 backdrop-blur-md border` |
| Estado activo/online | `.indicator-live` | `inline-flex gap-2 before:w-2 before:bg-green-500` |

**Regla general**: Tailwind para spacing, sizing y layout (`p-4`, `flex`, `grid`, `w-full`, `gap-3`). Clases semánticas del DS para identidad visual, tipografía dramática y superficies.
