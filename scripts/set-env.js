#!/usr/bin/env node
/**
 * scripts/set-env.js — Inyecta variables de entorno en un environment*.ts antes del build.
 *
 * Uso en CI/CD (producción):
 *   node scripts/set-env.js && ng build --configuration=production
 *
 * Uso local contra staging (lee .env.staging, que no se versiona):
 *   npm run start:staging   →  node --env-file=.env.staging scripts/set-env.js --target staging
 *
 * Variables requeridas en el entorno:
 *   SUPABASE_URL       — URL del proyecto Supabase (ej: https://xxxx.supabase.co)
 *   SUPABASE_ANON_KEY  — Anon/public (publishable) key del proyecto
 *
 * Si alguna variable falta, el script falla con exit(1) para no hacer build con creds vacías.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const TARGETS = {
  production: { file: 'environment.prod.ts', production: true },
  staging: { file: 'environment.staging.ts', production: false },
};

const targetArg = process.argv.indexOf('--target');
const targetName = targetArg === -1 ? 'production' : process.argv[targetArg + 1];
const target = TARGETS[targetName];
if (!target) {
  console.error(`❌  set-env.js: --target desconocido "${targetName}" (${Object.keys(TARGETS).join(', ')}).`);
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envProdPath = path.join(__dirname, '..', 'src', 'environments', target.file);

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('❌  set-env.js: faltan variables de entorno requeridas.');
  console.error('   SUPABASE_URL:', url ? '✓' : '✗ MISSING');
  console.error('   SUPABASE_ANON_KEY:', anonKey ? '✓' : '✗ MISSING');
  console.error('');
  console.error('   Configura estas variables en tu CI/CD o en un archivo .env antes de hacer build.');
  process.exit(1);
}

// GEMINI_API_KEY NO se inyecta acá: iría dentro del APK y quedaría extraíble. Vive como
// secreto del proyecto Supabase y solo la lee la Edge Function `process-receipt`
// (release.yml la publica con `supabase secrets set`).

const content = `export const environment = {
  production: ${target.production},
  supabase: {
    url: '${url}',
    anonKey: '${anonKey}',
  },
};
`;

fs.writeFileSync(envProdPath, content, 'utf8');
console.log(`✅  ${target.file} configurado correctamente.`);
console.log('   SUPABASE_URL:', url);
console.log('   SUPABASE_ANON_KEY:', anonKey.slice(0, 12) + '...');
