const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); // iPhone 14 size
    const basePath = 'C:/Users/Akxlarre/.gemini/antigravity/brain/34bddaa9-073b-4841-a07c-c85e37b01577';
    
    // 1. Login Screen (Rebranded FITTRACK)
    console.log('1. Capturando Login...');
    await page.goto('http://localhost:4200/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${basePath}/ui_login.png` });

    // 2. Register
    console.log('2. Registrando y entrando...');
    await page.click('text=Crear cuenta');
    await page.fill('input[type="email"]', 'fit_user_' + Date.now() + '@example.com');
    await page.fill('input[type="password"]', 'Playwright123!');
    await page.fill('input[placeholder="Tu nombre"]', 'Alex Trainer');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 3. Workouts Home (Empty State)
    console.log('3. Capturando Workouts Home inicial...');
    await page.goto('http://localhost:4200/app/workouts', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${basePath}/ui_workouts_empty.png` });

    // 4. Start workout
    console.log('4. Iniciando entrenamiento...');
    await page.click('button.start-btn');
    await page.waitForURL('**/active');
    await page.waitForTimeout(1000);

    // 5. Open Exercise Selector
    console.log('5. Capturando Selector de Ejercicios con Chips...');
    await page.click('button.add-exercise-btn');
    await page.waitForTimeout(1500);

    // Click on a muscle chip to demonstrate filtering
    const chips = await page.$$('button.chip-pill');
    if (chips.length > 2) {
      await chips[2].click(); // e.g. Espalda
      await page.waitForTimeout(600);
    }
    await page.screenshot({ path: `${basePath}/ui_exercise_selector.png` });

    // Select first exercise card
    await page.waitForSelector('.exercise-row-card', { timeout: 10000 });
    await page.click('.exercise-row-card');
    await page.waitForTimeout(1000);

    // 6. Fill sets and complete set to trigger Rest Timer
    console.log('6. Llenando series y activando Rest Timer...');
    const inputs = await page.$$('ion-input');
    if (inputs.length >= 3) {
      await inputs[0].evaluate(node => { node.value = '80'; node.dispatchEvent(new CustomEvent('ionChange', { detail: { value: '80' } })); });
      await inputs[1].evaluate(node => { node.value = '10'; node.dispatchEvent(new CustomEvent('ionChange', { detail: { value: '10' } })); });
      await inputs[2].evaluate(node => { node.value = '2'; node.dispatchEvent(new CustomEvent('ionChange', { detail: { value: '2' } })); });
    }

    // Add second set
    const addSetBtns = await page.$$('button.add-set-btn');
    if (addSetBtns.length > 0) await addSetBtns[0].click();
    await page.waitForTimeout(400);

    // Click check on first set -> triggers rest timer
    const checks = await page.$$('button.check-btn');
    if (checks.length > 0) {
      await checks[0].click();
    }
    await page.waitForTimeout(1200);

    console.log('7. Capturando Active Workout con Rest Timer y series...');
    await page.screenshot({ path: `${basePath}/ui_active_workout.png` });

    // 8. Terminar entrenamiento para guardarlo
    console.log('8. Guardando entrenamiento...');
    await page.click('button.finish-btn');
    await page.waitForURL('**/app/workouts', { timeout: 8000 });
    await page.waitForTimeout(2000);

    // 9. Capturar Workouts Home con el historial y KPIs actualizados!
    console.log('9. Capturando Workouts Home con Historial y KPIs...');
    await page.screenshot({ path: `${basePath}/ui_workouts_history.png` });

    // 10. Profile
    console.log('10. Capturando Perfil...');
    await page.goto('http://localhost:4200/app/profile', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${basePath}/ui_profile.png` });

    console.log('✅ Todas las capturas tomadas exitosamente!');
    await browser.close();
  } catch (e) {
    console.error('Test falló:', e);
    process.exit(1);
  }
})();

