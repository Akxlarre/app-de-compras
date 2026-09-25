const { chromium } = require('playwright');

(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    console.log('1. Ir a login y registrar...');
    await page.goto('http://localhost:4200/login', {waitUntil: 'networkidle'});
    await page.click('text=Crear cuenta');
    await page.fill('input[type="email"]', 'qa_set_' + Date.now() + '@example.com');
    await page.fill('input[type="password"]', 'Playwright123!');
    await page.fill('input[placeholder="Tu nombre"]', 'QA Bot');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    console.log('2. Iniciar entreno...');
    await page.goto('http://localhost:4200/app/workouts', {waitUntil: 'networkidle'});
    await page.click('ion-button:has-text("Entrenamiento")'); 
    await page.waitForURL('**/active');
    
    console.log('3. Abrir modal y seleccionar Sentadilla...');
    const buttons = await page.$$('button.add-exercise-btn');
    if (buttons.length > 0) {
      await buttons[0].click();
    }
    
    // Esperar a que la lista cargue
    await page.waitForTimeout(2000);
    // Click en el primer ejercicio de la lista
    await page.click('ion-item');
    await page.waitForTimeout(1000);
    
    console.log('4. AÃ±adir una segunda serie...');
    const addSetBtns = await page.$$('button.add-set-btn');
    if (addSetBtns.length > 0) {
      await addSetBtns[0].click();
    }
    await page.waitForTimeout(500);
    
    console.log('5. Llenar inputs de series...');
    const inputs = await page.$$('ion-input');
    // Para la primera serie: index 0 = weight, 1 = reps, 2 = rir
    if (inputs.length >= 3) {
      await inputs[0].evaluate(node => { node.value = '60'; node.dispatchEvent(new CustomEvent('ionChange', {detail: {value: '60'}})); });
      await inputs[1].evaluate(node => { node.value = '12'; node.dispatchEvent(new CustomEvent('ionChange', {detail: {value: '12'}})); });
    }
    
    // Hacer clic en checkmark
    const checkmarks = await page.$$('ion-icon[name="checkmark-outline"]');
    if (checkmarks.length > 1) { // 0 es el del header
      await checkmarks[1].click({force: true});
    }
    
    await page.waitForTimeout(1000);
    
    const shotPath = 'C:/Users/Akxlarre/.gemini/antigravity/brain/34bddaa9-073b-4841-a07c-c85e37b01577/sets_screen.png';
    await page.screenshot({path: shotPath});
    console.log('Screenshot tomado en ' + shotPath);
    
    await browser.close();
  } catch (e) {
    console.error('Test falló:', e);
    process.exit(1);
  }
})();
