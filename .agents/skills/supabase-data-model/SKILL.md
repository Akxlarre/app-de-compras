---
name: supabase-data-model
description: >
  Trabajar con Supabase: tablas, migraciones SQL, RLS, queries, servicios que accedan a la BD.
  Activar cuando se creen o modifiquen migraciones SQL, se agreguen tablas/columnas/índices/policies,
  se implementen servicios Angular que consulten Supabase, o se configure Realtime.
  Consultar SIEMPRE indices/DATABASE.md antes de crear o modificar esquema.
  Respetar RLS en TODAS las tablas nuevas.
user-invocable: false
allowed-tools: Read, Edit, Write, Glob, Grep
paths:
  - "supabase/**"
  - "src/app/core/facades/**/*.ts"
  - "src/app/core/services/supabase*"
---

# Skill: supabase-data-model

## Cuándo activar

- Crear o modificar migraciones SQL en `supabase/migrations/`
- Añadir tablas, columnas, índices o políticas RLS
- Implementar servicios Angular que consulten Supabase
- Configurar Realtime subscriptions
- Documentar cambios en el modelo de datos en `indices/DATABASE.md`

## Referencias del proyecto

| Recurso | Ubicación |
|---|---|
| Índice de tablas | `indices/DATABASE.md` |
| SupabaseService | `src/app/core/services/supabase.service.ts` |
| Migraciones | `supabase/migrations/` |

## Convención de migraciones

```
YYYYMMDDHHMMSS_<dominio>_<tipo>_<descripcion>.sql

Ejemplos:
20250301120000_auth_create_profiles.sql
20250301130000_products_add_category_column.sql
```

Scripts deben ser **idempotentes**:

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);
```

## Patrón de query en Angular

```typescript
// CORRECTO: SOLO en core/repositories/*.repository.ts — nunca en Facades, servicios ni UI.
// src/app/architecture.spec.ts (test:ci) falla si supabase.client aparece fuera de ahí.
async findAll(): Promise<Tabla[]> {
  const { data, error } = await this.supabase.client
    .from('tabla')
    .select('*, relacion(columna)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Tabla[] | null) ?? [];
}
```

## Realtime

```typescript
// En el Repository: devuelve la función de baja
watchAll(onChange: () => void): () => void {
  const client = this.supabase.client;
  const channel = client
    .channel('tabla-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tabla' }, () => onChange())
    .subscribe();
  return () => { client.removeChannel(channel); };
}

// En el Facade: this.stop = this.repo.watchAll(() => this.refreshSilently());
// y en dispose(): this.stop?.();
```

## RLS — Checklist para tabla nueva

- [ ] `ALTER TABLE x ENABLE ROW LEVEL SECURITY;`
- [ ] Policy SELECT definida
- [ ] Policy INSERT definida con `WITH CHECK`
- [ ] Policy UPDATE definida
- [ ] Policy DELETE definida (o bloqueada explícitamente)
- [ ] Documentada en `indices/DATABASE.md`
