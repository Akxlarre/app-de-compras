import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { execSync } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure we have the Gemini API Key
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY no encontrada en .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const REPO_URL = "https://github.com/yuhonas/free-exercise-db.git";
const TEMP_DIR = path.join(__dirname, 'temp_db');
const EXERCISES_DIR = path.join(TEMP_DIR, 'exercises');
const OUTPUT_FILE = path.join(__dirname, '..', 'supabase', 'seed.sql');

async function main() {
  console.log("🚀 Iniciando el Seeding de Ejercicios con IA (Gemini)...");

  // 1. Clone the repo if it doesn't exist
  if (!fs.existsSync(TEMP_DIR)) {
    console.log("📦 Clonando yuhonas/free-exercise-db...");
    execSync(`git clone --depth 1 ${REPO_URL} ${TEMP_DIR}`);
  } else {
    console.log("✅ Repositorio ya clonado en temp_db.");
  }

  // 2. Leer todos los archivos JSON
  const files = fs.readdirSync(EXERCISES_DIR).filter(f => f.endsWith('.json'));
  console.log(`📄 Encontrados ${files.length} ejercicios. Seleccionando un lote de prueba (ej. primeros 20) o procesando todos...`);
  
  // OJO: Para no gastar toda la cuota de la API de golpe, procesaremos los primeros 20.
  // Puedes cambiar esto a files.length si quieres todos.
  const filesToProcess = files.slice(0, 20); 
  
  let sqlStatements = `-- SEED SCRIPT PARA EJERCICIOS\n-- Generado con Gemini AI\n\n`;

  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    const filePath = path.join(EXERCISES_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log(`[${i+1}/${filesToProcess.length}] Traduciendo: ${data.name}...`);

    try {
      // 3. Prompt for translation
      const prompt = `
        Traduce al español los siguientes datos de un ejercicio físico.
        Responde ÚNICAMENTE con un JSON válido, sin formato markdown (\`\`\`), con esta estructura exacta:
        {
          "name_es": "nombre en español",
          "instructions_es": "instrucciones detalladas en español"
        }

        Datos originales:
        Name: ${data.name}
        Instructions: ${Array.isArray(data.instructions) ? data.instructions.join(' ') : data.instructions}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const translated = JSON.parse(response.text);

      // Limpiar comillas simples para SQL
      const name_en = data.name.replace(/'/g, "''");
      const name_es = translated.name_es.replace(/'/g, "''");
      const category = (data.category || '').replace(/'/g, "''");
      const primary_muscle = (data.primaryMuscles && data.primaryMuscles[0] ? data.primaryMuscles[0] : '').replace(/'/g, "''");
      const equipment = (data.equipment || '').replace(/'/g, "''");
      const instructions_en = (Array.isArray(data.instructions) ? data.instructions.join('\n') : data.instructions).replace(/'/g, "''");
      const instructions_es = translated.instructions_es.replace(/'/g, "''");

      const sql = `INSERT INTO public.exercises (name_en, name_es, category, muscle, equipment, instructions_en, instructions_es) 
VALUES ('${name_en}', '${name_es}', '${category}', '${primary_muscle}', '${equipment}', '${instructions_en}', '${instructions_es}');\n`;
      
      sqlStatements += sql;

      // Pequeño delay para no saturar la API
      await new Promise(r => setTimeout(r, 500));

    } catch (err) {
      console.error(`❌ Error con ${data.name}:`, err.message);
    }
  }

  // 4. Guardar archivo SQL
  fs.writeFileSync(OUTPUT_FILE, sqlStatements);
  console.log(`\n✅ Script SQL de seeding guardado en: supabase/seed.sql`);
  console.log(`Puedes insertarlos en tu BD local ejecutando: supabase db reset (si lo incluyes en seed.sql) o ejecutándolo manualmente.`);
}

main();
