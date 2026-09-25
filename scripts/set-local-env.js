const fs = require('fs');
const path = require('path');
require('dotenv').config(); // Carga las variables de .env

const envPath = path.join(__dirname, '..', 'src', 'environments', 'environment.ts');
const apiKey = process.env.GEMINI_API_KEY || 'TU_API_KEY_AQUI';

if (fs.existsSync(envPath)) {
  let content = fs.readFileSync(envPath, 'utf8');
  // Reemplaza el valor de geminiApiKey
  content = content.replace(/geminiApiKey:\s*".*?"/, `geminiApiKey: "${apiKey}"`);
  fs.writeFileSync(envPath, content, 'utf8');
  console.log('✅ environment.ts actualizado con las llaves de .env');
} else {
  console.error('❌ No se encontró environment.ts');
}
