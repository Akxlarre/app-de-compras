#!/usr/bin/env node
/**
 * antigravity-bridge.js — Adaptador Universal de Hooks para Antigravity / Gemini
 *
 * Conecta los eventos de ciclo de vida de Antigravity (PreToolUse, PostToolUse, Stop)
 * con los guardrails existentes de Koa Blueprint (.claude/hooks/).
 *
 * Convierte:
 *   - Stdin de Antigravity -> Stdin simulado de Claude Code
 *   - Exit codes de Claude (exit 2 / stderr) -> JSON de Antigravity { decision: "deny", reason: "..." }
 *   - Stop audit -> { decision: "continue", reason: "..." } si faltan índices o ACs
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const mode = process.argv[2] || 'pre';

// Limite de 10 MB para stdin
const MAX_STDIN_BYTES = 10 * 1024 * 1024;
let rawInput = '';
let dataSize = 0;

process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => {
  dataSize += Buffer.byteLength(chunk, 'utf-8');
  if (dataSize > MAX_STDIN_BYTES) {
    emitAllow();
    process.exit(0);
  }
  rawInput += chunk;
});

process.stdin.on('end', () => {
  try {
    const payload = rawInput ? JSON.parse(rawInput) : {};
    const sessionId = payload.conversationId || process.env.CLAUDE_SESSION_ID || 'agy-default';

    if (mode === 'pre') {
      handlePreToolUse(payload, sessionId);
    } else if (mode === 'post') {
      handlePostToolUse(payload, sessionId);
    } else if (mode === 'stop') {
      handleStop(payload, sessionId);
    } else {
      emitAllow();
    }
  } catch (err) {
    // Fail-open ante cualquier error inesperado
    emitAllow();
  }
});

function emitAllow() {
  if (mode === 'stop') {
    process.stdout.write(JSON.stringify({}));
  } else {
    process.stdout.write(JSON.stringify({ decision: 'allow' }));
  }
  process.exit(0);
}

function emitDeny(reason) {
  process.stdout.write(
    JSON.stringify({
      decision: 'deny',
      reason: reason || 'Bloqueado por guardrails de arquitectura.',
    })
  );
  process.exit(0);
}

function emitContinue(reason) {
  process.stdout.write(
    JSON.stringify({
      decision: 'continue',
      reason: reason || 'Faltan tareas obligatorias antes de terminar.',
    })
  );
  process.exit(0);
}

function runClaudeHook(scriptRelPath, claudePayload, sessionId) {
  const hookFullPath = path.join(cwd, scriptRelPath);
  if (!fs.existsSync(hookFullPath)) return { exitCode: 0, stdout: '', stderr: '' };

  const inputJson = JSON.stringify(claudePayload);
  const result = spawnSync('node', [hookFullPath], {
    cwd,
    input: inputJson,
    encoding: 'utf-8',
    env: {
      ...process.env,
      CLAUDE_SESSION_ID: sessionId,
      TOOL_INPUT: JSON.stringify(claudePayload.tool_input || {}),
    },
  });

  return {
    exitCode: result.status ?? 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

// ─── PreToolUse ─────────────────────────────────────────────────────────────
function handlePreToolUse(payload, sessionId) {
  const toolCall = payload.toolCall || {};
  const toolName = toolCall.name || '';
  const args = toolCall.args || {};

  // 1. Escritura de archivo nuevo o completo (write_to_file)
  if (toolName === 'write_to_file') {
    const targetFile = args.TargetFile || '';
    const content = args.CodeContent || '';

    const claudePayload = {
      tool_name: 'Write',
      tool_input: {
        file_path: targetFile,
        path: targetFile,
        content: content,
        new_string: content,
      },
    };

    const hooks = [
      '.claude/hooks/session-start.js',
      '.claude/hooks/sdd/spec-gate.js',
      '.claude/hooks/pre-write-guard.js',
      '.claude/hooks/sdd/plan-injector.js',
    ];

    for (const hookPath of hooks) {
      const res = runClaudeHook(hookPath, claudePayload, sessionId);
      if (res.exitCode === 2 || res.exitCode !== 0) {
        return emitDeny(res.stderr.trim() || res.stdout.trim());
      }
    }
    return emitAllow();
  }

  // 2. Modificación parcial de archivo (replace_file_content)
  if (toolName === 'replace_file_content') {
    const targetFile = args.TargetFile || '';
    const replacement = args.ReplacementContent || '';

    const claudePayload = {
      tool_name: 'Edit',
      tool_input: {
        file_path: targetFile,
        path: targetFile,
        new_string: replacement,
        target_string: args.TargetContent || '',
      },
    };

    const hooks = [
      '.claude/hooks/session-start.js',
      '.claude/hooks/sdd/spec-gate.js',
      '.claude/hooks/pre-write-guard.js',
      '.claude/hooks/sdd/plan-injector.js',
    ];

    for (const hookPath of hooks) {
      const res = runClaudeHook(hookPath, claudePayload, sessionId);
      if (res.exitCode === 2 || res.exitCode !== 0) {
        return emitDeny(res.stderr.trim() || res.stdout.trim());
      }
    }
    return emitAllow();
  }

  // 3. Ejecución de comandos (run_command)
  if (toolName === 'run_command') {
    const command = args.CommandLine || '';

    const claudePayload = {
      tool_name: 'Bash',
      tool_input: {
        command: command,
      },
    };

    const hooks = [
      '.claude/hooks/session-start.js',
      '.claude/hooks/bash-guard.js',
      '.claude/hooks/spec-diff-check.js',
    ];

    for (const hookPath of hooks) {
      const res = runClaudeHook(hookPath, claudePayload, sessionId);
      if (res.exitCode === 2 || res.exitCode !== 0) {
        return emitDeny(res.stderr.trim() || res.stdout.trim());
      }
    }
    return emitAllow();
  }

  // 4. Otras herramientas (view_file, etc.)
  runClaudeHook('.claude/hooks/session-start.js', { tool_name: toolName, tool_input: args }, sessionId);
  return emitAllow();
}

// ─── PostToolUse ────────────────────────────────────────────────────────────
function handlePostToolUse(payload, sessionId) {
  const toolCall = payload.toolCall || {};
  const toolName = toolCall.name || '';
  const args = toolCall.args || {};

  // 1. Lectura de archivos (view_file -> discovery-tracker)
  if (toolName === 'view_file') {
    const readPath = args.AbsolutePath || '';
    runClaudeHook(
      '.claude/hooks/discovery-tracker.js',
      { tool_name: 'Read', tool_input: { file_path: readPath } },
      sessionId
    );
  }

  // 2. Escritura de archivos (write-tracker + Prettier post-edit)
  if (toolName === 'write_to_file' || toolName === 'replace_file_content') {
    const targetFile = args.TargetFile || '';
    runClaudeHook(
      '.claude/hooks/write-tracker.js',
      { tool_name: 'Write', tool_input: { file_path: targetFile } },
      sessionId
    );
    runClaudeHook(
      '.claude/scripts/post-edit.js',
      { tool_name: 'Write', tool_input: { file_path: targetFile } },
      sessionId
    );
  }

  // 3. Registro de fallos si la herramienta tuvo error
  if (payload.error) {
    runClaudeHook(
      '.claude/hooks/failure-tracker.js',
      {
        tool_name: toolName,
        tool_input: args,
        error: payload.error,
      },
      sessionId
    );
  }

  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

// ─── Stop Hook ──────────────────────────────────────────────────────────────
function handleStop(payload, sessionId) {
  const sessionWritesPath = path.join(cwd, '.claude', 'temp', 'session-writes.json');
  let hasWrites = false;

  if (fs.existsSync(sessionWritesPath)) {
    try {
      const writes = JSON.parse(fs.readFileSync(sessionWritesPath, 'utf-8'));
      if (Array.isArray(writes) && writes.length > 0) {
        hasWrites = true;
        spawnSync('npm', ['run', 'indices:sync', '--silent'], { cwd, shell: true });
      }
    } catch (_) {}
  }

  // Context guardian
  runClaudeHook('.claude/hooks/context-guardian.js', {}, sessionId);

  // Sync Check determinista
  if (hasWrites) {
    try {
      const writes = JSON.parse(fs.readFileSync(sessionWritesPath, 'utf-8'));
      const componentsIndex = fs.existsSync(path.join(cwd, 'indices', 'COMPONENTS.md'))
        ? fs.readFileSync(path.join(cwd, 'indices', 'COMPONENTS.md'), 'utf-8')
        : '';
      const facadesIndex = fs.existsSync(path.join(cwd, 'indices', 'FACADES.md'))
        ? fs.readFileSync(path.join(cwd, 'indices', 'FACADES.md'), 'utf-8')
        : '';

      const missing = [];
      for (const w of writes) {
        const norm = w.replace(/\\/g, '/');
        const compMatch = norm.match(/shared\/components\/([^/]+)\/[^/]+\.component\.ts$/);
        if (compMatch) {
          const compName = compMatch[1];
          if (!componentsIndex.includes(compName) && !componentsIndex.includes(`app-${compName}`)) {
            missing.push(`Componente <app-${compName}> no está en indices/COMPONENTS.md`);
          }
        }
        if (norm.includes('core/services/') && norm.endsWith('.facade.ts')) {
          const baseName = path.basename(norm, '.facade.ts');
          const facadeName = baseName.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('') + 'Facade';
          if (!facadesIndex.includes(facadeName)) {
            missing.push(`Facade ${facadeName} no está en indices/FACADES.md`);
          }
        }
      }

      if (missing.length > 0) {
        return emitContinue(
          'Actualiza los índices del proyecto antes de terminar:\n' +
          missing.map(m => `  • ${m}`).join('\n')
        );
      }
    } catch (_) {}
  }

  // Verificación SDD
  const activeSpecPath = path.join(cwd, 'specs', '.active');
  if (fs.existsSync(activeSpecPath)) {
    try {
      const activeId = fs.readFileSync(activeSpecPath, 'utf-8').trim().split('\n')[0].trim();
      if (activeId && !activeId.startsWith('--bypass') && !activeId.startsWith('hotfix-')) {
        const specFile = path.join(cwd, 'specs', activeId, 'spec.md');
        if (fs.existsSync(specFile)) {
          const specContent = fs.readFileSync(specFile, 'utf-8');
          if (specContent.includes('[ ]') || specContent.includes('PENDING')) {
            return emitContinue(`Track SDD ${activeId} tiene criterios de aceptación pendientes en spec.md.`);
          }
        }
      }
    } catch (_) {}
  }

  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}
