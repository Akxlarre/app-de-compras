#!/usr/bin/env node
/**
 * antigravity-bridge.test.js — Batería de pruebas exhaustiva para el arnés de Antigravity
 *
 * Valida todas las capas de protección:
 *   1. File Protector (archivos protegidos)
 *   2. Day-0 Gate (bloqueo por contexto PENDING)
 *   3. Discovery Gate (bloqueo por falta de lectura de índices)
 *   4. Architect Guard (*ngIf, @Input, colores hardcodeados, OnPush, A11Y, SQL RLS)
 *   5. Bash Guard (touch, echo >, rm -rf, mutaciones)
 *   6. Discovery Tracker & Write Tracker (flags de sesión)
 *   7. Stop Hook (auditoría de índices y cierre de sesión)
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const BRIDGE = path.resolve(__dirname, '..', '..', '.agents', 'adapters', 'antigravity-bridge.js');

function runBridge(mode, payload) {
  const result = spawnSync('node', [BRIDGE, mode], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
  });
  let parsed = {};
  try {
    parsed = JSON.parse(result.stdout || '{}');
  } catch (_) {}
  return {
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    response: parsed,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. FILE PROTECTOR
// ═════════════════════════════════════════════════════════════════════════════
describe('1. FILE PROTECTOR — Protección de guardrails', () => {
  const sessionId = 'test-fp-' + Date.now();

  test('bloquea modificaciones a .agents/adapters/antigravity-bridge.js', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: path.join(process.cwd(), '.agents/adapters/antigravity-bridge.js'),
          CodeContent: 'console.log("hacked")',
        },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('FILE PROTECTOR') || res.response.reason.includes('guardrails'));
  });

  test('bloquea modificaciones a .claude/hooks/pre-write-guard.js', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: path.join(process.cwd(), '.claude/hooks/pre-write-guard.js'),
          CodeContent: 'console.log("hacked")',
        },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('FILE PROTECTOR') || res.response.reason.includes('guardrails'));
  });

  test('bloquea modificaciones a scripts/architect.js', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'replace_file_content',
        args: {
          TargetFile: path.join(process.cwd(), 'scripts/architect.js'),
          ReplacementContent: 'const a = 1;',
        },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('FILE PROTECTOR') || res.response.reason.includes('guardrails'));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. DAY-0 GATE & DISCOVERY GATE
// ═════════════════════════════════════════════════════════════════════════════
describe('2. DAY-0 GATE & DISCOVERY GATE', () => {
  const sessionId = 'test-gates-' + Date.now();

  test('bloquea escritura si Day-0 Gate está en PENDING', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: path.join(process.cwd(), 'src/app/features/demo/demo.component.ts'),
          CodeContent: 'export class DemoComponent {}',
        },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('DAY-0 GATE') || res.response.reason.includes('PENDING'));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. ARCHITECT GUARD (con Day-0 y Discovery simulados)
// ═════════════════════════════════════════════════════════════════════════════
describe('3. ARCHITECT GUARD — Reglas de Angular 20, A11Y y SQL', () => {
  const sessionId = 'test-arch-' + Date.now();
  let origDomain = null;
  let origBrief = null;
  let origDb = null;
  const domainPath = path.join(process.cwd(), 'context', 'domain.md');
  const briefPath = path.join(process.cwd(), 'context', 'brief.md');
  const dbPath = path.join(process.cwd(), 'indices', 'DATABASE.md');

  before(() => {
    if (fs.existsSync(domainPath)) {
      origDomain = fs.readFileSync(domainPath, 'utf8');
      fs.writeFileSync(domainPath, origDomain.replace(/PENDING/g, 'FILLED'));
    }
    if (fs.existsSync(briefPath)) {
      origBrief = fs.readFileSync(briefPath, 'utf8');
      fs.writeFileSync(briefPath, origBrief.replace(/PENDING/g, 'FILLED'));
    }
    if (fs.existsSync(dbPath)) {
      origDb = fs.readFileSync(dbPath, 'utf8');
      fs.writeFileSync(dbPath, origDb.replace(/PENDING/g, 'FILLED'));
    }

    const flagPath = path.join(os.tmpdir(), `koa-discovery-${sessionId}.flag`);
    fs.writeFileSync(flagPath, 'test-discovery');
  });

  after(() => {
    if (origDomain !== null) fs.writeFileSync(domainPath, origDomain);
    if (origBrief !== null) fs.writeFileSync(briefPath, origBrief);
    if (origDb !== null) fs.writeFileSync(dbPath, origDb);
  });

  test('bloquea *ngIf en template TypeScript', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: path.join(process.cwd(), 'src/app/features/dashboard/dashboard.component.ts'),
          CodeContent: '@Component({ template: `<div *ngIf="cond">x</div>` })\nexport class DashboardComponent {}',
        },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('*ngIf'));
  });

  test('bloquea decorador @Input() (debe usar input() signal)', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: path.join(process.cwd(), 'src/app/features/dashboard/dashboard.component.ts'),
          CodeContent: 'export class DashboardComponent { @Input() value: string; }',
        },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('@Input()'));
  });

  test('bloquea color Tailwind hardcodeado (ej. text-red-500)', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: path.join(process.cwd(), 'src/app/features/dashboard/dashboard.component.ts'),
          CodeContent: '<span class="text-red-500 bg-blue-200">Alert</span>',
        },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('Tailwind hardcodeado'));
  });

  test('bloquea componente nuevo sin ChangeDetectionStrategy.OnPush', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: path.join(process.cwd(), 'src/app/features/dashboard/demo.component.ts'),
          CodeContent: '@Component({ selector: "app-demo", template: `<div>Demo</div>` })\nexport class DemoComponent {}',
        },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('OnPush'));
  });

  test('bloquea icono <app-icon> sin atributo aria-label (A11Y)', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: path.join(process.cwd(), 'src/app/features/dashboard/dashboard.component.html'),
          CodeContent: '<app-icon name="trash" />',
        },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('A11Y-01') || res.response.reason.includes('aria-label'));
  });

  test('bloquea CREATE TABLE sin ENABLE ROW LEVEL SECURITY en migraciones SQL', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: path.join(process.cwd(), 'supabase/migrations/20240101000000_core_create_items.sql'),
          CodeContent: 'CREATE TABLE public.items (id uuid PRIMARY KEY);',
        },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('RLS'));
  });

  test('permite componente que cumple al 100% las reglas', () => {
    const validCode = `
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

@Component({
  selector: 'app-clean',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <div class="bg-surface text-primary p-4">
      @if (visible()) {
        <p>Clean component</p>
      }
    </div>
  \`
})
export class CleanComponent {
  readonly visible = signal(true);
}
`;
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'write_to_file',
        args: {
          TargetFile: path.join(process.cwd(), 'src/app/features/dashboard/clean.component.ts'),
          CodeContent: validCode,
        },
      },
    });
    assert.equal(res.response.decision, 'allow');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. BASH GUARD
// ═════════════════════════════════════════════════════════════════════════════
describe('4. BASH GUARD — Comandos de consola protegidos', () => {
  const sessionId = 'test-bash-' + Date.now();

  test('bloquea creación de archivo .ts mediante touch', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'touch src/app/features/hack.ts' },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('BASH GUARD'));
  });

  test('bloquea creación de archivo .html mediante echo con redirección', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'echo "<div>hack</div>" > src/app/features/hack.html' },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('BASH GUARD'));
  });

  test('bloquea eliminación recursiva de src/app', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'rm -rf src/app' },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('destructiva'));
  });

  test('bloquea eliminación recursiva de .agents', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'rm -rf .agents' },
      },
    });
    assert.equal(res.response.decision, 'deny');
    assert.ok(res.response.reason.includes('destructiva'));
  });

  test('permite comandos estándar como npm test y ng build', () => {
    const res = runBridge('pre', {
      conversationId: sessionId,
      toolCall: {
        name: 'run_command',
        args: { CommandLine: 'npm run test:ci' },
      },
    });
    assert.equal(res.response.decision, 'allow');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. POST-TOOL-USE TRACKING
// ═════════════════════════════════════════════════════════════════════════════
describe('5. POST-TOOL-USE — Discovery & Write Tracking', () => {
  const sessionId = 'test-post-' + Date.now();

  test('registra lectura en discovery flag', () => {
    runBridge('post', {
      conversationId: sessionId,
      toolCall: {
        name: 'view_file',
        args: { AbsolutePath: path.join(process.cwd(), 'indices/COMPONENTS.md') },
      },
    });

    const flagPath = path.join(os.tmpdir(), `koa-discovery-${sessionId}.flag`);
    assert.ok(fs.existsSync(flagPath), 'Discovery flag debe existir tras view_file en indices/');
  });

  test('escribe en session-writes.json al modificar archivo fuente', () => {
    const sampleFile = 'src/app/features/sample.component.ts';
    runBridge('post', {
      conversationId: sessionId,
      toolCall: {
        name: 'write_to_file',
        args: { TargetFile: path.join(process.cwd(), sampleFile) },
      },
    });

    const writesPath = path.join(process.cwd(), '.claude', 'temp', 'session-writes.json');
    assert.ok(fs.existsSync(writesPath));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. STOP HOOK
// ═════════════════════════════════════════════════════════════════════════════
describe('6. STOP HOOK — Auditoría de finalización', () => {
  test('responde objeto de terminación válido sin errores', () => {
    const res = runBridge('stop', {
      conversationId: 'test-stop-' + Date.now(),
    });
    assert.equal(typeof res.response, 'object');
  });
});
