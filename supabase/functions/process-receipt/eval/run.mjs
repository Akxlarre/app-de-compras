// Evalúa process-receipt contra el set de boletas transcritas (specs/0007-ocr-boletas).
//
//   node supabase/functions/process-receipt/eval/run.mjs [filtro]
//
// Llama a la función en STAGING (URL y key pública de .env.staging) con la cuenta de prueba
// (EVAL_EMAIL / EVAL_PASSWORD). Las fotos viven en eval/fotos (git-ignored); los casos en eval/casos.
// Acepta la respuesta vieja ({ items: [{ name, price }] }) y la nueva ({ lines: [...] }).
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../../..');
const { createClient } = createRequire(join(ROOT, 'package.json'))('@supabase/supabase-js');

const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.staging'), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.split(/=(.*)/s).slice(0, 2).map((s) => s.trim()))
);
const email = process.env.EVAL_EMAIL;
const password = process.env.EVAL_PASSWORD;
if (!email || !password) throw new Error('Faltan EVAL_EMAIL / EVAL_PASSWORD (cuenta de prueba de staging).');

const sb = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
const { error: loginError } = await sb.auth.signInWithPassword({ email, password });
if (loginError) throw loginError;

const MIME = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg' };
const filtro = process.argv[2] ?? '';
const casos = readdirSync(join(HERE, 'casos')).filter((f) => f.endsWith('.json') && f.includes(filtro)).sort();

/** Normaliza la respuesta a líneas de producto/descuento con total de línea. */
function lineasDe(data) {
  if (Array.isArray(data?.lines)) return data.lines;
  // Contrato viejo: solo nombre y "precio unitario" (en la práctica, a veces el total de línea).
  return (data?.items ?? []).map((i) => ({ raw_text: i.name, kind: 'product', line_total: i.price, unit_price: i.price, legible: true }));
}

const resultados = [];
for (const archivo of casos) {
  const caso = JSON.parse(readFileSync(join(HERE, 'casos', archivo), 'utf8'));
  const foto = readFileSync(join(HERE, 'fotos', caso.foto));
  const ext = caso.foto.split('.').pop().toLowerCase();
  const t0 = Date.now();
  const { data, error } = await sb.functions.invoke('process-receipt', {
    body: { imageBase64: foto.toString('base64'), mimeType: MIME[ext] ?? 'image/jpeg' },
  });
  const ms = Date.now() - t0;
  if (error) {
    const detalle = await error.context?.text?.().catch(() => '');
    resultados.push({ caso: caso.caso, error: `${error.message} ${detalle}`.trim(), ms });
    console.log(`✗ ${caso.caso}: ${error.message} ${detalle}`);
    continue;
  }

  const leidas = lineasDe(data);
  const esperadas = caso.lines.filter((l) => l.kind === 'product' && l.legible && !l.dudoso);
  // Una línea esperada está bien si alguna leída (sin reusar) trae su total de línea exacto.
  const libres = leidas.filter((l) => l.kind !== 'discount');
  let bien = 0;
  for (const e of esperadas) {
    const i = libres.findIndex((l) => l.line_total === e.line_total);
    if (i >= 0) { bien++; libres.splice(i, 1); }
  }
  const suma = leidas.reduce((s, l) => s + (typeof l.line_total === 'number' ? l.line_total : 0), 0);
  const totalLeido = typeof data?.total === 'number' ? data.total : suma;
  const ilegibles = caso.lines.some((l) => !l.legible);
  const marcoIlegibles = leidas.some((l) => l.legible === false);

  const r = {
    caso: caso.caso,
    ms,
    lineas_bien: bien,
    lineas_esperadas: esperadas.length,
    lineas_leidas: leidas.length,
    total_esperado: caso.total,
    total_leido: totalLeido,
    total_ok: totalLeido === caso.total,
    ...(ilegibles ? { marco_ilegibles: marcoIlegibles } : {}),
  };
  resultados.push({ ...r, respuesta: data });
  console.log(
    `${r.total_ok ? '✓' : '·'} ${caso.caso.padEnd(28)} líneas ${bien}/${esperadas.length} (leyó ${leidas.length})` +
      `  total ${totalLeido} vs ${caso.total}${ilegibles ? `  ilegibles marcados: ${marcoIlegibles}` : ''}  ${ms} ms`
  );
}

const ok = resultados.filter((r) => !r.error);
const lineasBien = ok.reduce((s, r) => s + r.lineas_bien, 0);
const lineasEsperadas = ok.reduce((s, r) => s + r.lineas_esperadas, 0);
console.log(
  `\nLíneas bien: ${lineasBien}/${lineasEsperadas} (${Math.round((100 * lineasBien) / (lineasEsperadas || 1))} %)` +
    ` · Totales ok: ${ok.filter((r) => r.total_ok).length}/${ok.length} · Errores: ${resultados.length - ok.length}`
);

mkdirSync(join(HERE, 'resultados'), { recursive: true });
const salida = join(HERE, 'resultados', `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
writeFileSync(salida, JSON.stringify(resultados, null, 2));
console.log(`Detalle: ${salida}`);
