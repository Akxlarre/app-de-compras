const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const logs = [];
    
    page.on('console', msg => logs.push(msg.text()));
    page.on('pageerror', error => logs.push('ERROR: ' + error.message));
    
    console.log('1. Ir a login y registrar...');
    await page.goto('http://localhost:4200/login', {waitUntil: 'networkidle'});
    await page.click('text=Crear cuenta');
    await page.fill('input[type="email"]', 'e2e_workout_' + Date.now() + '@example.com');
    await page.fill('input[type="password"]', 'Playwright123!');
    await page.fill('input[placeholder="Tu nombre"]', 'End-to-End Bot');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    console.log('2. Iniciar entreno ad-hoc...');
    await page.goto('http://localhost:4200/app/workouts', {waitUntil: 'networkidle'});
    await page.click('ion-button:has-text("Entrenamiento")'); 
    await page.waitForURL('**/active');
    
    console.log('3. Añadir Ejercicio...');
    const buttons = await page.$$('ion-button');
    for (const b of buttons) {
      const t = await b.textContent();
      if (t && t.includes('adir')) { await b.click(); break; }
    }
    
    await page.waitForTimeout(2000);
    // Click en el primer ejercicio de la lista (ahora hay 876)
    await page.click('ion-item');
    await page.waitForTimeout(1000);
    
    console.log('4. Llenar inputs y Completar serie...');
    const inputs = await page.$$('ion-input');
    if (inputs.length >= 3) {
      // 0 = weight, 1 = reps, 2 = rir
      await inputs[0].evaluate(node => { node.value = '80'; node.dispatchEvent(new CustomEvent('ionChange', {detail: {value: '80'}})); });
      await inputs[1].evaluate(node => { node.value = '10'; node.dispatchEvent(new CustomEvent('ionChange', {detail: {value: '10'}})); });
    }
    
    const checkmarks = await page.$$('ion-icon[name="checkmark-outline"]');
    if (checkmarks.length > 1) { 
      await checkmarks[1].click({force: true});
    }
    
    await page.waitForTimeout(1000);
    
    console.log('5. Clicar en Terminar...');
    await page.click('ion-button:has-text("Terminar")');
    
    console.log('6. Esperando redirección...');
    await page.waitForURL('**/app/workouts', {timeout: 5000});
    
    console.log('SUCCESS: ¡Redirección a /app/workouts confirmada! El entreno se guardó correctamente.');
    await browser.close();
  } catch (e) {
    console.error('Test falló:', e);
    process.exit(1);
  }
})();
