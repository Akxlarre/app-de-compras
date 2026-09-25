const fs = require('fs');
fetch('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json')
  .then(r => r.json())
  .then(data => {
    let sql = '-- Seed images from free-exercise-db\n';
    let count = 0;
    for (const ex of data) {
      if (ex.images && ex.images.length > 0) {
        const imagesStr = ex.images.map(img => `'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${img}'`).join(', ');
        const nameEn = ex.name.replace(/'/g, "''");
        sql += `UPDATE public.exercises SET images = ARRAY[${imagesStr}] WHERE name_en = '${nameEn}';\n`;
        count++;
      }
    }
    fs.writeFileSync('supabase/migrations/20260910190001_seed_exercise_images.sql', sql);
    console.log('Generated SQL for', count, 'exercises');
  });
