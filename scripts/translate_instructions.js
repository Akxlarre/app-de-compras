const fs = require('fs');
require('dotenv').config();

const cleanKey = (k) => (k ? k.replace(/["']/g, '').trim() : '');
const activeKey = cleanKey(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || '');

if (!activeKey) {
  console.error('ERROR: No se encontró API Key en el archivo .env.');
  process.exit(1);
}

const isGroq = activeKey.startsWith('gsk_');
const providerName = isGroq ? 'Groq (Qwen 3.8 27B LPU)' : 'Gemini 3.6 Flash';
const OUTPUT_SQL_FULL = 'supabase/migrations/20260912120000_redact_all_instructions.sql';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SYSTEM_PROMPT = `Sos un coach de entrenamiento personal. Reescribí las instrucciones del ejercicio en español (Latinoamérica) usando el imperativo informal (vos): "Recostá", "Empujá", "Mantené". Un paso por línea separada por salto de línea. Sin relleno.
Devolvé ÚNICAMENTE el texto redactado paso a paso, sin introducciones ni bloques de código.`;

async function callGroqSingle(instructionsText) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeKey}`,
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: instructionsText },
      ],
      max_tokens: 350,
      temperature: 0.2,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.choices[0].message.content.trim();
}

async function callGeminiSingle(instructionsText) {
  const prompt = `${SYSTEM_PROMPT}\n\nInstrucciones:\n${instructionsText}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${activeKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.candidates[0].content.parts[0].text.trim();
}

async function translateSingleWithRetry(instructionsText, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      if (isGroq) {
        return await callGroqSingle(instructionsText);
      } else {
        return await callGeminiSingle(instructionsText);
      }
    } catch (err) {
      const errMsg = err.message || '';
      console.warn(`  Reintento ${attempt + 1}/${retries}: ${errMsg}`);
      if (errMsg.includes('rate_limit') || errMsg.includes('tokens') || errMsg.includes('quota') || errMsg.includes('OTPM')) {
        console.log('  Pausando 15s por límite de tasa...');
        await sleep(15000);
      } else {
        await sleep(4000);
      }
    }
  }
  return null;
}

async function main() {
  console.log(`=== MOTOR DE REDACCIÓN COACH (MODO DIRECTO 1 A 1) ===`);
  console.log(`Proveedor activo: ${providerName}`);

  console.log('Cargando catálogo maestro...');
  const res = await fetch('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json');
  const exercises = await res.json();

  let existingSql = '';
  const translatedNames = new Set();
  if (fs.existsSync(OUTPUT_SQL_FULL)) {
    existingSql = fs.readFileSync(OUTPUT_SQL_FULL, 'utf8');
    const matches = existingSql.matchAll(/WHERE name_en = '(.+?)';/g);
    for (const match of matches) {
      translatedNames.add(match[1].replace(/''/g, "'"));
    }
  }

  const remainingExercises = exercises.filter((ex) => !translatedNames.has(ex.name));

  console.log(`Total catálogo: ${exercises.length} ejercicios`);
  console.log(`Ya redactados en base: ${translatedNames.size}`);
  console.log(`Pendientes finales: ${remainingExercises.length}`);

  if (remainingExercises.length === 0) {
    console.log('¡Todos los ejercicios del catálogo ya están redactados!');
    return;
  }

  let sql = existingSql || '-- Coach-quality Spanish instructions\n';
  let successCount = translatedNames.size;
  let failCount = 0;

  for (let i = 0; i < remainingExercises.length; i++) {
    const ex = remainingExercises[i];
    const progress = `[${successCount + 1}/${exercises.length}]`;
    console.log(`${progress} "${ex.name}"...`);

    const rawInstructions = ex.instructions.join('\n');
    const translatedText = await translateSingleWithRetry(rawInstructions);

    if (translatedText) {
      const nameEn = ex.name.replace(/'/g, "''");
      const cleanText = translatedText.replace(/'/g, "''").replace(/\r?\n/g, '\\n');
      sql += `UPDATE public.exercises SET instructions_es = '${cleanText}' WHERE name_en = '${nameEn}';\n`;
      successCount++;
      console.log(`  ✓ Guardado ("${ex.name}"). Total completados: ${successCount}`);
      fs.writeFileSync(OUTPUT_SQL_FULL, sql);
    } else {
      failCount++;
      console.log(`  ✗ Omitido temporalmente ("${ex.name}").`);
    }

    // 6.5s delay guarantees staying under 1,000 output tokens/minute on Groq free tier
    await sleep(6500);
  }

  console.log(`\n=== CATÁLOGO 100% COMPLETADO ===`);
  console.log(`Redactados con éxito: ${successCount} / ${exercises.length}`);
  console.log(`Fallidos: ${failCount}`);
  console.log(`SQL final guardado en: ${OUTPUT_SQL_FULL}`);
}

main().catch(console.error);
