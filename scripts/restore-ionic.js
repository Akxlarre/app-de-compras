const fs = require('fs');

const mappings = {
  'src/app/app.component.ts': {
    imports: "import { IonApp, IonRouterOutlet } from '@ionic/angular';",
    modules: "IonApp, IonRouterOutlet"
  },
  'src/app/layout/tabs-layout/tabs-layout.component.ts': {
    imports: "import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular';",
    modules: "IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel"
  },
  'src/app/features/workouts/workouts.page.ts': {
    imports: "import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon } from '@ionic/angular';",
    modules: "IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon"
  },
  'src/app/features/explorer/explorer.page.ts': {
    imports: "import { IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonBadge, IonSearchbar } from '@ionic/angular';",
    modules: "IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonBadge, IonSearchbar"
  },
  'src/app/features/workouts/active-workout/active-workout.page.ts': {
    imports: "import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonList, IonItem, IonLabel, IonInput, IonBadge, IonButtons, IonBackButton } from '@ionic/angular';",
    modules: "IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon, IonList, IonItem, IonLabel, IonInput, IonBadge, IonButtons, IonBackButton"
  },
  'src/app/features/profile/profile.page.ts': {
    imports: "import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton } from '@ionic/angular';",
    modules: "IonHeader, IonToolbar, IonTitle, IonContent, IonButton"
  }
};

for (const [filePath, data] of Object.entries(mappings)) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace IonicModule import
    content = content.replace(/import\s*{\s*IonicModule\s*}\s*from\s*'@ionic\/angular';/g, data.imports);
    
    // Replace IonicModule in imports array
    content = content.replace(/imports:\s*\[([^\]]+)\]/g, (match, p1) => {
      let currentImports = p1.split(',').map(s => s.trim()).filter(s => s && s !== 'IonicModule');
      return 'imports: [' + data.modules + (currentImports.length ? ', ' + currentImports.join(', ') : '') + ']';
    });
    
    fs.writeFileSync(filePath, content);
  }
}
console.log('Restored correctly');
