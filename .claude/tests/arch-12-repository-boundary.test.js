#!/usr/bin/env node
/**
 * ARCH-12 — Repository boundary en pre-write-guard.js
 *
 * Solo core/repositories/ (y SupabaseService) pueden tocar `supabase.client`.
 * La versión anterior solo detectaba `client.from(` en una línea, y el código real encadena
 * en varias (`this.supabase.client\n  .from(`) o usa rpc/channel/functions: nunca disparaba.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const HOOK = path.resolve(__dirname, '..', 'hooks', 'pre-write-guard.js');
const SESSION = 'arch12-test-' + process.pid;
const FLAG = path.join(os.tmpdir(), `koa-discovery-${SESSION}.flag`);

function runHook(filePath, content) {
  const r = spawnSync('node', [HOOK], {
    input: JSON.stringify({
      tool_name: 'Write',
      tool_input: { file_path: filePath, content, new_string: content },
    }),
    encoding: 'utf8',
    cwd: path.resolve(__dirname, '..', '..'),
    env: { ...process.env, CLAUDE_SESSION_ID: SESSION },
  });
  return { exitCode: r.status, stderr: r.stderr || '' };
}

const MULTILINE_QUERY = `
export class XFacade {
  async load() {
    const { data } = await this.supabase.client
      .from('products')
      .select('*');
  }
}`;

describe('ARCH-12 — repository boundary', () => {
  // El Discovery Gate exige haber leído indices/ en la sesión: lo simulamos.
  before(() => fs.writeFileSync(FLAG, 'test'));
  after(() => fs.rmSync(FLAG, { force: true }));

  test('bloquea supabase.client multilínea en un facade', () => {
    const r = runHook('/p/src/app/core/facades/x.facade.ts', MULTILINE_QUERY);
    assert.equal(r.exitCode, 2);
    assert.match(r.stderr, /ARCH-12/);
  });

  test('bloquea rpc en un servicio', () => {
    const r = runHook(
      '/p/src/app/core/services/x.service.ts',
      "await this.supabase.client.rpc('get_or_create_family');",
    );
    assert.equal(r.exitCode, 2);
    assert.match(r.stderr, /ARCH-12/);
  });

  test('bloquea auth vía client en una página', () => {
    const r = runHook(
      '/p/src/app/features/auth/x.page.ts',
      'this.supabase.client.auth.onAuthStateChange(() => {});',
    );
    assert.equal(r.exitCode, 2);
    assert.match(r.stderr, /ARCH-12/);
  });

  test('permite supabase.client dentro de core/repositories/', () => {
    const r = runHook('/p/src/app/core/repositories/x.repository.ts', MULTILINE_QUERY);
    assert.doesNotMatch(r.stderr, /ARCH-12/);
  });

  test('permite supabase.client en supabase.service.ts y en specs', () => {
    const svc = runHook('/p/src/app/core/services/infrastructure/supabase.service.ts', MULTILINE_QUERY);
    const spec = runHook('/p/src/app/core/facades/x.facade.spec.ts', MULTILINE_QUERY);
    assert.doesNotMatch(svc.stderr, /ARCH-12/);
    assert.doesNotMatch(spec.stderr, /ARCH-12/);
  });

  test('no confunde httpClient ni un facade que usa repositories', () => {
    const r = runHook(
      '/p/src/app/core/facades/ok.facade.ts',
      'const rows = await this.repo.findAll(); this.httpClient.get(url);',
    );
    assert.doesNotMatch(r.stderr, /ARCH-12/);
  });
});
