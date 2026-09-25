# 🛒 App de Compras (Grocery Family App)

Una aplicación de compras premium, diseñada para uso "Pulgar-First" a una sola mano mientras empujas el carrito del supermercado. Combina un diseño ultra-fluido (Ionic + Tailwind v4) con sincronización en tiempo real (Supabase) para familias.

## Características Principales

- **Diseño Pulgar-First**: Steppers gigantes y modales tipo Bottom Sheet para poder añadir cantidades e ítems con una sola mano sin esfuerzo.
- **Sincronización Familiar (Realtime)**: La lista se actualiza al instante si tu pareja o compañero añade o tacha un producto desde su teléfono.
- **Inicio Rápido & Plantillas**: Recicla compras pasadas o guarda plantillas (ej. "Aseo", "Asado del Domingo") para armar tu lista en 1 segundo.
- **Catálogo Inteligente ("Tus Esenciales")**: Aprende lo que compras y te lo sugiere visualmente al abrir el buscador.
- **Escáner de Boletas con IA (OCR)**: Integración con Gemini 1.5 Pro vía Edge Functions para leer tickets del supermercado y registrar gastos *(en desarrollo)*.
- **Modo Oscuro Elegante (Frosted Glass)**: UI moderna utilizando componentes flotantes, desenfoques de fondo (backdrop-blur) y acentos en color Esmeralda (`--brand-crimson`).

---

## Tech Stack

| Capa | Tecnología |
|---|---|
| Frontend Framework | Angular v20+ (Standalone Components, Signals, Control Flow) |
| UI & Estilos | Tailwind CSS v4 + Ionic Framework (Modales, Gestos) |
| Reactividad | Signals + RxJS (Patrón Facade estricto) |
| Backend & Auth | Supabase (Postgres, Row Level Security, Realtime, Edge Functions) |
| IA (Edge) | Deno + Google Gemini 1.5 Pro (Extracción estructurada OCR) |
| Tests | Vitest + Playwright |

---

## Arquitectura

```text
src/app/
├── core/        Facades, servicios, repositorios, guards, modelos
├── features/    Páginas enrutables (Lista Activa, Perfil, Escáner)
├── shared/      Componentes presentacionales y directivas
└── layout/      Shell con navegación de barra inferior flotante
src/styles/
├── tokens/      Design tokens (fuente única de color, tipografía)
├── layout/      Clases base de estructura
└── vendors/     Overrides de Ionic / PrimeNG
supabase/
└── functions/   Edge Functions (ej. process-receipt). El esquema vive en plataforma-db.
```

### Patrón Facade

La UI **nunca** habla con Supabase directamente. Cada dominio tiene un facade (`ShoppingListFacade`, `FamilyFacade`, `ProductSearchFacade`) que centraliza el estado usando Signals y expone datos síncronos a los templates.

---

## Modelo de Datos

Todas las tablas están protegidas por RLS. El aislamiento se logra mediante `family_id`; los usuarios pertenecen a Familias.

| Tabla | Propósito |
|---|---|
| `families` / `family_members` | Gestión multi-tenant. Agrupa usuarios en familias. |
| `products` | Catálogo de productos. Aprende duraciones estimadas (`estimated_duration_days`). |
| `shopping_lists` | Las listas. Poseen estados: `active`, `completed`, `archived`, `template`. |
| `list_items` | Los ítems de la lista. `is_checked` lanza actualizaciones Realtime. |
| `receipts` | Boletas y tickets (para control de gastos y OCR). |

Las tablas viven en el schema `shop` del proyecto Supabase compartido. El esquema y sus migraciones
están en [plataforma-db](https://github.com/Akxlarre/plataforma-db) (ADR-001): esta app **no** tiene migraciones propias.

---

## Puesta en marcha

### Requisitos

- Node.js 22+
- Supabase CLI (`npx supabase`)

### Pasos

1. Clonar e instalar dependencias:
   ```bash
   git clone https://github.com/Akxlarre/app-de-compras.git
   cd app-de-compras
   npm install --legacy-peer-deps
   ```

2. **Opción A — contra staging (recomendado, sin Docker):** copiar `.env.staging.example` a
   `.env.staging` con la URL y la clave publicable del proyecto de staging, y levantar:
   ```bash
   npm run start:staging   # genera environment.staging.ts (no versionado) y hace ng serve
   ```
   Staging tiene el mismo esquema que producción pero sin datos: crea tu usuario desde la app.

   **Opción B — Supabase local** desde [plataforma-db](https://github.com/Akxlarre/plataforma-db)
   (ahí están las migraciones; expone `shop` en la API local):
   ```bash
   git clone https://github.com/Akxlarre/plataforma-db.git && cd plataforma-db
   npx supabase start   # API en http://localhost:54351
   ```

3. Variables de entorno:
   El archivo `src/environments/environment.ts` apunta a tu servidor local de Supabase (`http://localhost:54351`). 
   Si deseas utilizar los servicios de IA o conectarte a producción, crea un `.env` basado en `.env.example` (nunca commitees el tuyo con claves reales).

4. Levantar la app:
   ```bash
   npm run start
   ```
   Abre `http://localhost:4200` en tu navegador móvil o simula un dispositivo para la mejor experiencia.

---

## Scripts

| Script | Qué hace |
|---|---|
| `npm run start` | Servidor de desarrollo |
| `npm run lint:arch` | Auditoría de reglas de arquitectura exclusivas del proyecto |
| `npm run indices:sync` | Actualiza la memoria institucional (`indices/*.md`) |
| `npm run supabase:start` | Levanta o detiene Supabase local |

---

## Flujo de desarrollo AI-Assisted (Koa Agent Blueprint)

Este proyecto está integrado con la arquitectura **Koa Agent Blueprint** para desarrollo Asistido por IA (Claude Code / Cursor / Windsurf):

- **Guardrails Arquitectónicos**: El CLI bloquea el trabajo si no se leen los índices previamente (Discovery Gate).
- **Memoria Institucional**: La carpeta `indices/` es la fuente de verdad (COMPONENTS.md, SERVICES.md, etc.) y se actualiza al finalizar sesiones.
- **Reglas**: Todas las reglas estrictas de código (uso de `@if`, Signals obligatorios, tokens Tailwind vs hardcoded) están definidas en `AGENTS.md` y `GEMINI.md`.
