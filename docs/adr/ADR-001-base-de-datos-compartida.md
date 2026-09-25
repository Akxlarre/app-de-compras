# ADR-001 — Base de datos compartida entre apps y hub

- **Estado:** propuesto (pendiente de las decisiones marcadas con ❓)
- **Fecha:** 2026-09-25
- **Alcance:** todas las apps del ecosistema (app-de-compras, app-de-entrenamiento, futuras) y el hub

## 1. Contexto

Todas las apps usan **un mismo proyecto de Supabase** (mismas credenciales: `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`, `GEMINI_API_KEY`). Más adelante un **hub** centralizará
información de todas ellas.

Estado actual, revisado en ambos repos:

| Tema | Hoy |
|---|---|
| Migraciones | Cada repo tiene su `supabase/migrations/` y **ninguno las aplica desde CI**: se aplican a mano. |
| Tablas | Todas en `public`. Sin choques de nombres por ahora: compras (`families`, `products`, `shopping_lists`, `list_items`, `receipts`) y entrenamiento (`workouts`, `routines`, `exercises`, `mesocycles*`, `workout_*`, `user_memory`). |
| Compartido | `profiles` + trigger `handle_new_user` (migraciones **duplicadas e idénticas** en los dos repos), `app_updates` (columna `app_target`: `gym` / `shop`), bucket `releases`. |
| Drift | La base real tiene cosas que no están en ninguna migración: por ejemplo la RPC `user_complete_first_login` (entrenamiento la llama). **Las migraciones no describen la base real.** |
| RLS de `profiles` | `SELECT` para **cualquier usuario autenticado**: cualquier usuario de cualquier app lee los emails de todos. |
| Edge Functions | Nombres globales al proyecto: `process-receipt` (compras), `gemini-proxy` y `mcp-server` (entrenamiento). Antes de fix-041, compras desplegaba **su** `mcp-server` y pisaba el de entrenamiento. |
| Entornos | Un solo proyecto (producción). El desarrollo local depende de `supabase start` en cada repo, con esquemas parciales. |

### Problemas que esto trae al crecer

1. **`supabase db push` desde un repo falla o hace daño**: la tabla de historial de migraciones es
   una sola para todo el proyecto, así que cada repo "ve" migraciones remotas que no tiene.
2. **Nadie es dueño de lo común** (`profiles`, `app_updates`, `auth`): cualquier repo puede
   cambiarlo, y dos repos pueden cambiarlo de forma distinta.
3. **Drift silencioso**: lo que se hace a mano en el panel no queda en ningún lado.
4. **Aislamiento débil**: una policy floja en una app expone datos de todas (caso `profiles`).
5. **Choques de nombres** a futuro (tablas, funciones, buckets, Edge Functions).

## 2. Decisión (propuesta)

### D1 — Un repo único dueño de la base de datos

Crear **`plataforma-db`** ❓(nombre). Es el **único** repo con `supabase/migrations/`,
`supabase/config.toml` y `seed.sql`. Las apps (y el hub) **no** tienen migraciones: consumen el
esquema y generan sus tipos.

> ¿Por qué no dentro del hub? El hub es **otra app consumidora**: si fuera dueño de las tablas de
> compras y de entrenamiento, cada cambio en una app obligaría a tocar el repo del hub, y el hub
> quedaría con permisos sobre datos que no le corresponden.

### D2 — Un schema de Postgres por dominio

| Schema | Contenido | Dueño lógico |
|---|---|---|
| `core` | `profiles`, `handle_new_user`, `app_updates`, helpers comunes | plataforma |
| `shop` | familias, catálogo, listas, ítems, boletas | app-de-compras |
| `gym` | rutinas, entrenamientos, mesociclos, ejercicios, memoria | app-de-entrenamiento |
| `hub` | **solo vistas y RPCs de lectura** sobre los otros schemas | hub |

- Cada schema se expone en la API (`[api] schemas` en `config.toml` y *API settings* del panel).
- El cliente de cada app usa su schema: `supabase.schema('shop').from('products')`. Con la capa de
  Repositories (spec 0001) **ese cambio queda confinado a `core/repositories/`**.
- Nombres de Edge Functions y buckets **con prefijo de app**: `shop-process-receipt`, `gym-gemini-proxy`,
  bucket `shop-receipts`. Lo existente se renombra en la fase de cada app.

### D3 — Reglas de RLS del ecosistema

- Toda tabla con RLS, sin excepción (ya es regla de `database.md`).
- `core.profiles`: `SELECT` **solo del propio perfil**. Para mostrar a otros (por ejemplo miembros de
  una familia) se usa una vista o una RPC del dominio que devuelve solo `display_name` y `avatar_url`
  de quienes comparten familia, nunca emails.
- El hub **no** lee tablas de otros schemas directamente: usa vistas `security_invoker = true`
  (respetan la RLS del usuario) o RPCs `SECURITY DEFINER` que devuelven **agregados** del propio usuario
  (por ejemplo gasto del mes, entrenamientos de la semana).
- Una app no tiene grants sobre el schema de otra.

### D4 — Un solo pipeline de migraciones

En `plataforma-db`:
- **PR** → `supabase db lint` + levantar la base local con todas las migraciones y correr los tests SQL.
- **Merge a `main`** → `supabase db push` al proyecto (y a staging primero si existe, ❓ D6).
- **Tipos**: `supabase gen types typescript --schema core,shop,gym,hub` se publican como artefacto del
  repo. Cada app copia los tipos de su schema a `src/app/core/models/supabase.types.ts` con un script
  (`npm run db:types`).

### D5 — Congelar migraciones en los repos de apps

Desde que exista `plataforma-db`, las carpetas `supabase/migrations/` de las apps quedan de solo
lectura (historial) y se borran en la fase 1. Un check de CI en cada app falla si alguien agrega una
migración nueva ahí.

### D6 — Entornos ❓

Recomendado: un **segundo proyecto de Supabase para staging** (plan gratuito), con la misma
secuencia de migraciones. Alternativa: Supabase Branching, que es de pago. Sin staging, cada migración
se prueba directo en producción.

## 3. Plan por fases (sin romper las apps publicadas)

| Fase | Qué | Riesgo | Notas |
|---|---|---|---|
| **0** | Aprobar este ADR. No agregar migraciones nuevas en ningún repo de app. | — | Hoy mismo. |
| **1** | Crear `plataforma-db`. **Baseline** con `supabase db dump` de producción (captura el drift, incluida `user_complete_first_login`). Marcar el historial con `supabase migration repair --status applied`. CI de D4. | Bajo | La base no cambia: solo se documenta tal cual está. |
| **2** | `core`: mover `profiles`, `handle_new_user` y `app_updates` a `core` y endurecer la RLS de `profiles` (D3). | Medio | Vistas de compatibilidad en `public` durante la transición (ver abajo). |
| **3** | `shop`: las tablas **nuevas** de compras (por ejemplo `receipt_items` para la feature de boletas) nacen en `shop`. Mover las existentes. | Medio | La feature de boletas puede avanzar en paralelo creando sus tablas en `shop`. |
| **4** | `gym`: igual que la fase 3, para entrenamiento. | Medio | |
| **5** | `hub`: vistas y RPCs de lectura para el hub. | Bajo | Se diseña cuando se defina qué muestra el hub ❓. |

### Cómo mover una tabla sin romper APKs ya instalados

1. `ALTER TABLE public.x SET SCHEMA shop;` (conserva datos, índices, FKs y policies).
2. `CREATE VIEW public.x WITH (security_invoker = true) AS SELECT * FROM shop.x;` — vista simple, así
   que se puede actualizar y **respeta la RLS** del usuario (Postgres 15+). Las versiones viejas siguen
   funcionando.
3. Publicar la versión nueva de la app, que usa `schema('shop')`, con `force_update = true` en
   `app_updates` (el mecanismo ya existe).
4. Cuando todos actualicen, borrar las vistas de compatibilidad.

⚠️ **Realtime no funciona sobre vistas**: durante la ventana entre los pasos 2 y 3, las versiones
viejas pierden la sincronización en vivo de la lista (se siguen refrescando al volver a la pantalla).
Por eso conviene que esa ventana sea corta y con actualización forzada.

## 4. Consecuencias

**A favor**
- Una sola fuente de verdad del esquema; el drift se detecta en PR.
- Aislamiento real entre apps; el hub lee lo que corresponde y nada más.
- Las apps se simplifican: sin migraciones, tipos generados, cambios de schema confinados a Repositories.

**En contra / costos**
- Un repo más, y los cambios de base de datos requieren un PR en `plataforma-db` antes que en la app.
- Fases 2 a 4 requieren publicar versiones con actualización forzada.
- `supabase db push` desde CI necesita `SUPABASE_ACCESS_TOKEN` y la contraseña de la base (`SUPABASE_DB_PASSWORD`) como secrets del repo nuevo.

## 5. Decisiones abiertas ❓

1. **Nombre del repo**: ¿`plataforma-db`? ¿otro?
2. **Staging (D6)**: ¿creamos un segundo proyecto de Supabase?
3. **Hub**: ¿qué información debe mostrar primero? Define las vistas y RPCs de la fase 5.
4. **Auth compartido**: un mismo usuario entra a todas las apps con la misma cuenta (un solo pool de
   `auth.users`). ¿Es lo deseado? Implica que las *Redirect URLs* de Auth deben incluir los dominios
   o esquemas de todas las apps (por ejemplo el `reset-password` de cada una).

## 6. Qué puede hacer el agente y qué no

- **Puede**: escribir las migraciones, la configuración, el CI y los scripts de tipos en `plataforma-db`,
  y adaptar los Repositories de cada app.
- **No puede**: crear el repo en GitHub, crear proyectos de Supabase ni configurar secrets. Eso lo
  hace el dueño. Tampoco puede ejecutar `db dump` o `db push` contra producción sin el access token
  configurado como variable del entorno de la sesión.
