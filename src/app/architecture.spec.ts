/**
 * Guardia arquitectónica (fitness functions) — corre en `npm run test:ci`, y por lo tanto en CI.
 *
 * Capas: UI (features/ shared/ layout/) → Facade → Repository → SupabaseService.
 * `scripts/architect.js` solo detecta imports de `@supabase/supabase-js` en la UI; estas reglas
 * cierran el resto de caminos por los que el acceso a datos se escapaba de `core/repositories/`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, it, expect } from 'vitest';

const APP_DIR = join(process.cwd(), 'src', 'app');

interface SourceFile {
  /** Ruta relativa a `src/app`, con `/`. */
  path: string;
  /** Código sin comentarios (para que un ejemplo en un JSDoc no cuente como violación). */
  code: string;
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

function collectSources(dir: string): SourceFile[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return collectSources(full);
    if (!name.endsWith('.ts') || name.endsWith('.spec.ts')) return [];
    return [
      {
        path: relative(APP_DIR, full).split(sep).join('/'),
        code: stripComments(readFileSync(full, 'utf-8')),
      },
    ];
  });
}

const SOURCES = collectSources(APP_DIR);

const isUi = (p: string) => /^(features|shared|layout)\//.test(p);
const isRepository = (p: string) => p.startsWith('core/repositories/');
const isSupabaseService = (p: string) => p === 'core/services/infrastructure/supabase.service.ts';
const isFacade = (p: string) => p.startsWith('core/facades/');

const importsFrom = (code: string, pattern: RegExp) =>
  [...code.matchAll(/import\s[\s\S]*?from\s+['"]([^'"]+)['"]/g)].some(([, spec]) =>
    pattern.test(spec)
  );

const usesSupabaseService = (code: string) => importsFrom(code, /supabase\.service$/);
const usesRepository = (code: string) => importsFrom(code, /repositories\//);
/** `.client` de SupabaseService: `x.supabase.client`, `inject(SupabaseService).client`, etc. */
const touchesClient = (code: string) =>
  /\bsupabase\s*\.\s*client\b|inject\(\s*SupabaseService\s*\)\s*\.\s*client\b/.test(code);

function violations(predicate: (f: SourceFile) => boolean): string[] {
  return SOURCES.filter(predicate).map((f) => f.path);
}

describe('Arquitectura: acceso a datos', () => {
  it('encuentra el código fuente (sanity check)', () => {
    expect(SOURCES.length).toBeGreaterThan(20);
  });

  it('(a) solo core/repositories y SupabaseService tocan `supabase.client`', () => {
    expect(
      violations(
        (f) => touchesClient(f.code) && !isRepository(f.path) && !isSupabaseService(f.path)
      )
    ).toEqual([]);
  });

  it('(b) la UI no importa SupabaseService ni Repositories', () => {
    expect(
      violations((f) => isUi(f.path) && (usesSupabaseService(f.code) || usesRepository(f.code)))
    ).toEqual([]);
  });

  it('(c) los facades usan Repositories, no SupabaseService (salvo AuthFacade: sesión)', () => {
    expect(
      violations(
        (f) =>
          isFacade(f.path) &&
          f.path !== 'core/facades/auth.facade.ts' &&
          usesSupabaseService(f.code)
      )
    ).toEqual([]);
  });

  it('(e) un facade no importa otros facades (componer en el Smart Component)', () => {
    expect(
      violations(
        (f) =>
          isFacade(f.path) &&
          [...f.code.matchAll(/import\s[\s\S]*?from\s+['"]([^'"]+)['"]/g)].some(
            ([, spec]) => /\.facade$/.test(spec) && !/base\.facade$/.test(spec)
          )
      )
    ).toEqual([]);
  });

  it('(f) los environment*.ts solo tienen configuración pública (van dentro del bundle/APK)', () => {
    // Todo lo que esté en environment.ts termina en el JS que descarga el usuario. Las API keys
    // privadas (Gemini, service_role, …) viven como secretos de Supabase / Edge Functions.
    const envDir = join(process.cwd(), 'src', 'environments');
    const allowed = new Set(['production', 'supabase', 'url', 'anonKey']);
    const offending = readdirSync(envDir)
      .filter((f) => /^environment.*\.ts$/.test(f))
      .flatMap((f) => {
        const code = stripComments(readFileSync(join(envDir, f), 'utf-8'));
        return [...code.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)]
          .map(([, key]) => key)
          .filter((key) => !allowed.has(key))
          .map((key) => `${f}: ${key}`);
      });
    expect(offending).toEqual([]);
  });

  it('(d) @supabase/supabase-js solo en repositories, infraestructura y models', () => {
    expect(
      violations(
        (f) =>
          importsFrom(f.code, /^@supabase\/supabase-js$/) &&
          !isRepository(f.path) &&
          !f.path.startsWith('core/services/infrastructure/') &&
          !f.path.startsWith('core/models/')
      )
    ).toEqual([]);
  });
});
