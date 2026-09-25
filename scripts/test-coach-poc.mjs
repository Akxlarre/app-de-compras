/**
 * Pruebas de Concepto del Coach IA — Gemini Flash
 * 
 * Simula exactamente lo que hace GeminiService: system prompt + tools + mensajes.
 * Evalúa las respuestas y capacidades del modelo sin necesitar UI ni autenticación.
 * 
 * Uso: node scripts/test-coach-poc.mjs
 */

import 'dotenv/config';

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY no está en .env');
  process.exit(1);
}

const URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const MODEL = 'gemini-3.6-flash';

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT (idéntico al de gemini.service.ts)
// ═══════════════════════════════════════════════════════════════
const nowIso = new Date().toISOString();
const nowTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const SYSTEM_PROMPT = `Eres el Coach de Entrenamiento Personal IA de esta aplicación, experto en fisiología del ejercicio, biomecánica y entrenamiento de fuerza e hipertrofia basado en evidencia científica.

⏱️ CONTEXTO TEMPORAL ACTUAL:
- Timestamp UTC: ${nowIso}
- Hora actual local: ${nowTime}

🛠️ HERRAMIENTAS Y REGLAS DE EJECUCIÓN (MCP):
1. Si el usuario pregunta por su sesión actual: Llama a 'obtener_entrenamiento_en_curso'.
2. Para calcular TIEMPO DE DESCANSO: Toma el 'completed_at' de la última serie.
3. GESTIÓN DE RUTINAS: Para crear, busca ejercicios primero con 'buscar_ejercicios', luego 'crear_rutina'.
4. ANÁLISIS: Usa 'analizar_volumen_muscular' y 'analizar_progresion_ejercicio'.
5. FEEDBACK: Verifica 'analizar_historial_feedback' antes de recomendar subir peso.

🎯 FILOSOFÍA:
- Tono: Profesional, directo, motivador pero riguroso.
- RIR 0-1: Máximo esfuerzo. RIR 2-3: Zona óptima hipertrofia. RIR 4+: Submáximo.
- Da pautas accionables de sobrecarga progresiva.

📋 FORMATO: Markdown limpio, tablas para series/rutinas. Concluye con un 'Siguiente paso'.`;

// ═══════════════════════════════════════════════════════════════
// TOOLS DECLARATION (mismas 10 del servicio)
// ═══════════════════════════════════════════════════════════════
const TOOLS = [
  { type: 'function', function: { name: 'obtener_entrenamiento_en_curso', description: 'Obtiene la sesión activa actual del usuario.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'obtener_mis_rutinas', description: 'Lista plantillas de rutinas del usuario con ejercicios.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'obtener_mis_entrenamientos_recientes', description: 'Historial de sesiones pasadas.', parameters: { type: 'object', properties: { limit: { type: 'number' } } } } },
  { type: 'function', function: { name: 'obtener_series_de_entrenamiento', description: 'Series, reps, peso y RIR de un entrenamiento específico.', parameters: { type: 'object', properties: { workout_id: { type: 'string' } }, required: ['workout_id'] } } },
  { type: 'function', function: { name: 'crear_rutina', description: 'Crea una nueva rutina en la BD.', parameters: { type: 'object', properties: { name: { type: 'string' }, notes: { type: 'string' }, exercises: { type: 'array', items: { type: 'object', properties: { exercise_id: { type: 'string' }, order_index: { type: 'number' } }, required: ['exercise_id'] } } }, required: ['name'] } } },
  { type: 'function', function: { name: 'eliminar_rutina', description: 'Elimina una rutina por UUID.', parameters: { type: 'object', properties: { routine_id: { type: 'string' } }, required: ['routine_id'] } } },
  { type: 'function', function: { name: 'analizar_historial_feedback', description: 'Historial de feedback de dolor/técnica.', parameters: { type: 'object', properties: { exercise_id: { type: 'string' }, limit: { type: 'number' } } } } },
  { type: 'function', function: { name: 'buscar_ejercicios', description: 'Busca ejercicios en el catálogo por nombre o músculo.', parameters: { type: 'object', properties: { search: { type: 'string' }, muscle: { type: 'string' }, limit: { type: 'number' } } } } },
  { type: 'function', function: { name: 'analizar_volumen_muscular', description: 'Series efectivas y tonelaje por grupo muscular.', parameters: { type: 'object', properties: { days_ago: { type: 'number' } } } } },
  { type: 'function', function: { name: 'analizar_progresion_ejercicio', description: 'Evolución de 1RM y RIR en un ejercicio.', parameters: { type: 'object', properties: { exercise_id: { type: 'string' } }, required: ['exercise_id'] } } },
];

// ═══════════════════════════════════════════════════════════════
// MOCK TOOL RESPONSES (simulan lo que devolvería el MCP server)
// ═══════════════════════════════════════════════════════════════
const MOCK_TOOL_RESPONSES = {
  obtener_entrenamiento_en_curso: () => JSON.stringify({ active: false, message: 'No hay sesión de entrenamiento activa.' }),
  
  obtener_mis_rutinas: () => JSON.stringify({
    routines: [
      {
        id: 'r-001', name: 'Push Day A', notes: 'Pecho, hombros y tríceps',
        exercises: [
          { name: 'Press Banca', muscle: 'chest', order: 0 },
          { name: 'Press Militar', muscle: 'shoulders', order: 1 },
          { name: 'Fondos en Paralelas', muscle: 'triceps', order: 2 },
          { name: 'Aperturas con Mancuerna', muscle: 'chest', order: 3 },
        ]
      },
      {
        id: 'r-002', name: 'Pull Day A', notes: 'Espalda y bíceps',
        exercises: [
          { name: 'Dominadas', muscle: 'back', order: 0 },
          { name: 'Remo con Barra', muscle: 'back', order: 1 },
          { name: 'Curl Bíceps', muscle: 'biceps', order: 2 },
        ]
      }
    ]
  }),

  obtener_mis_entrenamientos_recientes: () => JSON.stringify({
    workouts: [
      { id: 'w-001', routine_name: 'Push Day A', date: '2026-09-18', duration_min: 62, energy_level: 4, session_rpe: 7.5 },
      { id: 'w-002', routine_name: 'Pull Day A', date: '2026-09-16', duration_min: 55, energy_level: 3, session_rpe: 8 },
      { id: 'w-003', routine_name: 'Push Day A', date: '2026-09-14', duration_min: 58, energy_level: 5, session_rpe: 7 },
      { id: 'w-004', routine_name: 'Pull Day A', date: '2026-09-12', duration_min: 50, energy_level: 4, session_rpe: 7.5 },
    ]
  }),

  analizar_volumen_muscular: () => JSON.stringify({
    period_days: 7,
    muscles: [
      { muscle: 'chest', effective_sets: 12, tonnage_kg: 4800 },
      { muscle: 'back', effective_sets: 10, tonnage_kg: 4200 },
      { muscle: 'shoulders', effective_sets: 6, tonnage_kg: 1800 },
      { muscle: 'biceps', effective_sets: 6, tonnage_kg: 900 },
      { muscle: 'triceps', effective_sets: 6, tonnage_kg: 1200 },
      { muscle: 'legs', effective_sets: 0, tonnage_kg: 0 },
      { muscle: 'core', effective_sets: 0, tonnage_kg: 0 },
    ]
  }),

  buscar_ejercicios: (args) => {
    const db = {
      'sentadilla': [{ id: 'ex-101', name: 'Sentadilla con Barra', muscle: 'quadriceps' }, { id: 'ex-102', name: 'Sentadilla Búlgara', muscle: 'quadriceps' }],
      'pierna': [{ id: 'ex-101', name: 'Sentadilla con Barra', muscle: 'quadriceps' }, { id: 'ex-103', name: 'Peso Muerto Rumano', muscle: 'hamstrings' }, { id: 'ex-104', name: 'Prensa de Piernas', muscle: 'quadriceps' }, { id: 'ex-105', name: 'Curl Femoral', muscle: 'hamstrings' }, { id: 'ex-106', name: 'Extensiones de Cuádriceps', muscle: 'quadriceps' }, { id: 'ex-107', name: 'Elevación de Gemelos', muscle: 'calves' }],
      'legs': [{ id: 'ex-101', name: 'Sentadilla con Barra', muscle: 'quadriceps' }, { id: 'ex-103', name: 'Peso Muerto Rumano', muscle: 'hamstrings' }, { id: 'ex-104', name: 'Prensa de Piernas', muscle: 'quadriceps' }],
      'press': [{ id: 'ex-201', name: 'Press Banca', muscle: 'chest' }, { id: 'ex-202', name: 'Press Militar', muscle: 'shoulders' }, { id: 'ex-203', name: 'Press Inclinado', muscle: 'chest' }],
      'mancuerna': [{ id: 'ex-301', name: 'Press con Mancuernas', muscle: 'chest' }, { id: 'ex-302', name: 'Remo con Mancuerna', muscle: 'back' }, { id: 'ex-303', name: 'Curl con Mancuernas', muscle: 'biceps' }, { id: 'ex-304', name: 'Sentadilla Goblet', muscle: 'quadriceps' }, { id: 'ex-305', name: 'Peso Muerto Rumano Mancuerna', muscle: 'hamstrings' }, { id: 'ex-306', name: 'Press Hombro Mancuerna', muscle: 'shoulders' }, { id: 'ex-307', name: 'Zancada con Mancuerna', muscle: 'quadriceps' }],
      'casa': [{ id: 'ex-304', name: 'Sentadilla Goblet', muscle: 'quadriceps' }, { id: 'ex-301', name: 'Press con Mancuernas', muscle: 'chest' }, { id: 'ex-306', name: 'Press Hombro Mancuerna', muscle: 'shoulders' }],
      'default': [{ id: 'ex-101', name: 'Sentadilla con Barra', muscle: 'quadriceps' }, { id: 'ex-201', name: 'Press Banca', muscle: 'chest' }, { id: 'ex-302', name: 'Remo con Mancuerna', muscle: 'back' }],
    };
    const search = (args.search || args.muscle || 'default').toLowerCase();
    const results = db[search] || db['default'];
    return JSON.stringify({ exercises: results.slice(0, args.limit || 10) });
  },

  crear_rutina: (args) => JSON.stringify({ success: true, routine_id: 'r-new-' + Date.now(), name: args.name, exercises_count: args.exercises?.length || 0, message: `Rutina "${args.name}" creada exitosamente.` }),

  eliminar_rutina: (args) => JSON.stringify({ success: true, message: `Rutina ${args.routine_id} eliminada.` }),

  obtener_series_de_entrenamiento: () => JSON.stringify({
    exercises: [
      { name: 'Press Banca', sets: [
        { set_number: 1, weight_kg: 80, reps: 10, rir: 3 },
        { set_number: 2, weight_kg: 85, reps: 8, rir: 2 },
        { set_number: 3, weight_kg: 85, reps: 7, rir: 1 },
      ]},
      { name: 'Press Militar', sets: [
        { set_number: 1, weight_kg: 40, reps: 10, rir: 3 },
        { set_number: 2, weight_kg: 42.5, reps: 8, rir: 2 },
      ]},
    ]
  }),

  analizar_historial_feedback: () => JSON.stringify({ feedback: [], message: 'No hay reportes de dolor o feedback.' }),
  
  analizar_progresion_ejercicio: () => JSON.stringify({
    exercise: 'Press Banca', sessions: 8,
    progression: [
      { date: '2026-08-01', estimated_1rm: 95, avg_rir: 3 },
      { date: '2026-08-15', estimated_1rm: 97, avg_rir: 2.5 },
      { date: '2026-09-01', estimated_1rm: 100, avg_rir: 2 },
      { date: '2026-09-18', estimated_1rm: 102, avg_rir: 2 },
    ],
    trend: 'progresando'
  }),
};

// ═══════════════════════════════════════════════════════════════
// ENGINE: Llama a Gemini con tool loop (idéntico al servicio)
// ═══════════════════════════════════════════════════════════════
async function callGemini(messages, tools) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: 'auto', max_tokens: 2000 }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`HTTP ${res.status}: ${errBody}`);
  }

  return await res.json();
}

async function runConversation(userMessage) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];

  const toolCalls = [];
  let totalTokens = { input: 0, output: 0 };
  let turns = 0;

  try {
    let res = await callGemini(messages, TOOLS);
    totalTokens.input += res.usage?.prompt_tokens || 0;
    totalTokens.output += res.usage?.completion_tokens || 0;
    let msg = res.choices?.[0]?.message;
    turns++;

    while (msg?.tool_calls && msg.tool_calls.length > 0) {
      messages.push(msg);

      for (const tc of msg.tool_calls) {
        const name = tc.function.name;
        const args = JSON.parse(tc.function.arguments || '{}');
        toolCalls.push({ name, args });
        
        console.log(`    🔧 Tool call: ${name}(${JSON.stringify(args)})`);

        const mockFn = MOCK_TOOL_RESPONSES[name];
        const result = mockFn ? (typeof mockFn === 'function' ? mockFn(args) : mockFn) : '{"error": "Tool not found"}';

        messages.push({ role: 'tool', tool_call_id: tc.id, content: result });
      }

      res = await callGemini(messages, TOOLS);
      totalTokens.input += res.usage?.prompt_tokens || 0;
      totalTokens.output += res.usage?.completion_tokens || 0;
      msg = res.choices?.[0]?.message;
      turns++;
    }

    return {
      response: msg?.content || '(vacío)',
      toolCalls,
      turns,
      tokens: totalTokens,
      error: null,
    };
  } catch (err) {
    return { response: null, toolCalls, turns, tokens: totalTokens, error: err.message };
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════
const tests = [
  {
    name: '🏋️ Test 1: Crear Rutina para Principiante',
    message: 'Soy principiante, tengo 25 años, solo puedo entrenar 3 días a la semana con mancuernas en casa. Créame una rutina de cuerpo completo para ganar músculo.',
    expectations: ['buscar_ejercicios', 'crear_rutina'],
    description: '¿Busca ejercicios primero, luego crea la rutina? ¿Es apropiada para principiante?',
  },
  {
    name: '📊 Test 2: Análisis de Progreso e Historial',
    message: '¿Cómo ha sido mi progreso en las últimas semanas? ¿Estoy entrenando suficiente volumen?',
    expectations: ['obtener_mis_entrenamientos_recientes', 'analizar_volumen_muscular'],
    description: '¿Consulta historial y volumen? ¿Da análisis basado en datos?',
  },
  {
    name: '🔗 Test 3: Query Multi-Tool Complejo',
    message: 'Revisa mis rutinas actuales, mi historial reciente y dime si necesito cambiar algo. Si ves que me falta trabajo de piernas, créame una rutina específica de piernas.',
    expectations: ['obtener_mis_rutinas', 'obtener_mis_entrenamientos_recientes', 'analizar_volumen_muscular', 'buscar_ejercicios', 'crear_rutina'],
    description: '¿Encadena múltiples tools? ¿Razona antes de actuar? ¿Crea rutina de piernas al ver 0 sets?',
  },
];

// ═══════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════
console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║   Coach IA — Pruebas de Concepto (Gemini 2.5 Flash)  ║');
console.log('╚═══════════════════════════════════════════════════════╝\n');

for (const test of tests) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`${test.name}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`📝 Prompt: "${test.message}"\n`);
  console.log(`  ⏳ Enviando a Gemini...`);

  const start = Date.now();
  const result = await runConversation(test.message);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (result.error) {
    console.log(`\n  ❌ ERROR: ${result.error}`);
    console.log(`  ⏱️  Tiempo: ${elapsed}s\n`);
    continue;
  }

  // Evaluar tool calls
  const calledTools = result.toolCalls.map(tc => tc.name);
  const expectedHits = test.expectations.filter(e => calledTools.includes(e));
  const expectedMisses = test.expectations.filter(e => !calledTools.includes(e));
  const toolScore = `${expectedHits.length}/${test.expectations.length}`;

  console.log(`\n  📊 MÉTRICAS:`);
  console.log(`  ├─ Turnos de API: ${result.turns}`);
  console.log(`  ├─ Tools llamados: ${calledTools.length} (${calledTools.join(', ') || 'ninguno'})`);
  console.log(`  ├─ Tools esperados acertados: ${toolScore}`);
  if (expectedMisses.length > 0) console.log(`  ├─ Tools faltantes: ${expectedMisses.join(', ')}`);
  console.log(`  ├─ Tokens: ${result.tokens.input} input + ${result.tokens.output} output = ${result.tokens.input + result.tokens.output} total`);
  console.log(`  └─ Tiempo total: ${elapsed}s`);

  console.log(`\n  💬 RESPUESTA DEL COACH:`);
  console.log(`  ${'─'.repeat(50)}`);
  const lines = result.response.split('\n');
  for (const line of lines) {
    console.log(`  ${line}`);
  }
  console.log(`  ${'─'.repeat(50)}`);

  // Scorecard
  const hasContent = result.response.length > 100;
  const hasActionable = /siguiente|recomend|sugier|paso|prueba|ajust/i.test(result.response);
  const hasMarkdown = /\|.*\||\*\*|^#+\s/m.test(result.response);
  const noRateLimit = !result.error?.includes('429');

  console.log(`\n  ✅ EVALUACIÓN:`);
  console.log(`  ├─ Respuesta sustancial (>100 chars): ${hasContent ? '✅' : '❌'} (${result.response.length} chars)`);
  console.log(`  ├─ Recomendaciones accionables:       ${hasActionable ? '✅' : '⚠️'}`);
  console.log(`  ├─ Formato Markdown:                  ${hasMarkdown ? '✅' : '⚠️'}`);
  console.log(`  ├─ Tools correctos (${toolScore}):            ${expectedMisses.length === 0 ? '✅' : '⚠️'}`);
  console.log(`  └─ Sin rate limit:                    ${noRateLimit ? '✅' : '❌'}`);
}

console.log(`\n\n${'═'.repeat(60)}`);
console.log('🏁 Pruebas de concepto finalizadas');
console.log(`${'═'.repeat(60)}\n`);
