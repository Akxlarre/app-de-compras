/**
 * Guardia de coherencia visual y de textos entre pestañas (fix-050). Corre en `npm run test:ci`.
 * Revisa el código fuente (plantillas y tokens), no el DOM: lo que vuelva a aparecer se detecta antes
 * de llegar a staging.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, it, expect } from 'vitest';

const SRC = join(process.cwd(), 'src');
const APP_DIR = join(SRC, 'app');

function collect(dir: string): { path: string; code: string }[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return collect(full);
    if (!/\.(ts|html)$/.test(name) || name.endsWith('.spec.ts')) return [];
    return [{ path: relative(APP_DIR, full).split(sep).join('/'), code: readFileSync(full, 'utf-8') }];
  });
}

const FILES = collect(APP_DIR);
const filesWith = (re: RegExp) => FILES.filter((f) => re.test(f.code)).map((f) => f.path);

describe('coherencia de textos (fix-050, T1–T4)', () => {
  it('ningún encabezado dice "SHOPPING" (T1)', () => {
    expect(filesWith(/>\s*SHOPPING\s*</)).toEqual([]);
  });

  it('los títulos son el nombre de la pestaña (T2)', () => {
    expect(filesWith(/Catálogo Inteligente/)).toEqual([]);
  });

  it('sin abreviaturas ni palabras sueltas para lo mismo (T3)', () => {
    expect(filesWith(/Est\. Costo|En carrito|EN CARRITO|`Comprado \$\{/)).toEqual([]);
  });

  it('mayúscula solo al inicio de las acciones (T4)', () => {
    expect(filesWith(/Cerrar Sesión|Buscar Actualizaciones/)).toEqual([]);
  });
});

describe('coherencia visual (fix-050, V1–V4)', () => {
  const tokens = readFileSync(join(SRC, 'styles', 'tokens', '_variables.scss'), 'utf-8');
  const styles = readFileSync(join(SRC, 'styles.scss'), 'utf-8');

  it('el color de aviso no es el azul de los links (V1)', () => {
    const warning = tokens.match(/--state-warning:\s*([^;]+);/)?.[1].trim();
    expect(warning).toBe('var(--brand-ember)');
  });

  it('las alertas de Ionic no fuerzan MAYÚSCULAS (T4)', () => {
    expect(styles).toMatch(/ion-alert[^{]*\.alert-button[^{]*\{[^}]*text-transform:\s*none/);
  });

  it('filas y tarjetas de superficie usan el mismo radio (V2)', () => {
    const odd = FILES.filter((f) => f.path.startsWith('features/')).flatMap((f) =>
      // Filas y tarjetas (no inputs, que llevan su propio radio).
      [...f.code.matchAll(/<(?:div|li|button|section)\b[^>]*?class="([^"]*)"/g)]
        .map((m) => m[1])
        .filter((c) => /\bbg-surface\b/.test(c) && /\bborder\b/.test(c) && /\brounded-xl\b/.test(c))
        .map(() => f.path)
    );
    expect(odd).toEqual([]);
  });

  it('Catálogo sin el borde de acento suelto (V3)', () => {
    const products = FILES.find((f) => f.path.endsWith('products/products.page.ts'))!;
    expect(products.code).not.toMatch(/card-accent/);
  });

  it('los títulos de sección no van en MAYÚSCULAS (V4)', () => {
    expect(filesWith(/<h3[^>]*\buppercase\b/)).toEqual([]);
  });
});
