const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace Ion imports with IonicModule
  content = content.replace(/import\s*{[^}]*}\s*from\s*'@ionic\/angular[^']*';/g, "import { IonicModule } from '@ionic/angular';");
  
  // Replace imports array
  content = content.replace(/imports:\s*\[([^\]]+)\]/g, (match, p1) => {
    let imports = p1.split(',').map(s => s.trim()).filter(s => s && !s.startsWith('Ion'));
    if (!imports.includes('IonicModule')) {
      imports.unshift('IonicModule');
    }
    return 'imports: [' + imports.join(', ') + ']';
  });

  fs.writeFileSync(filePath, content);
}

const files = [
  'src/app/app.component.ts',
  'src/app/layout/tabs-layout/tabs-layout.component.ts',
  'src/app/features/workouts/workouts.page.ts',
  'src/app/features/explorer/explorer.page.ts',
  'src/app/features/workouts/active-workout/active-workout.page.ts',
  'src/app/features/profile/profile.page.ts'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    fixFile(f);
  }
});
console.log('Fixed files');
