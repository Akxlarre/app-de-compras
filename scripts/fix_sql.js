const fs = require('fs');
const file = 'supabase/migrations/20260912120000_redact_all_instructions.sql';

if (fs.existsSync(file)) {
  const content = fs.readFileSync(file, 'utf8');

  // Match: UPDATE public.exercises SET instructions_es = '...' WHERE name_en = '...';
  // Note: single quotes inside instructions were already doubled as ''
  const regex = /UPDATE public\.exercises SET instructions_es = '([\s\S]*?)' WHERE name_en = '([\s\S]*?)';/g;

  let match;
  let count = 0;
  let cleanSql = '-- Coach-quality Spanish instructions (Cleaned)\n';

  while ((match = regex.exec(content)) !== null) {
    let instructions = match[1];
    let nameEn = match[2];

    // Escape newlines so postgres reads it cleanly as one line or standard text string
    instructions = instructions.replace(/\r?\n/g, '\\n');

    cleanSql += `UPDATE public.exercises SET instructions_es = '${instructions}' WHERE name_en = '${nameEn}';\n`;
    count++;
  }

  fs.writeFileSync(file, cleanSql);
  console.log(`Cleaned ${count} SQL update statements.`);
}
