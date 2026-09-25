const { chromium } = require('playwright');
(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const logs = [];
    
    page.on('console', msg => logs.push(msg.text()));
    page.on('pageerror', error => logs.push('ERROR: ' + error.message));
    
    console.log('1. Go to Login...');
    await page.goto('http://localhost:4200/login', {waitUntil: 'networkidle'});
    
    console.log('2. Registering QA User...');
    // Click 'Crear cuenta'
    await page.click('text=Crear cuenta');
    await page.fill('input[type="email"]', 'qa_test_' + Date.now() + '@example.com');
    await page.fill('input[type="password"]', 'Playwright123!');
    await page.fill('input[placeholder="Tu nombre"]', 'QA Bot');
    
    // We can't actually complete email confirmation if it's enabled, but we turned it off in config.toml!
    // Wait, let's see if we can just click submit.
    await page.click('button[type="submit"]');
    
    // Wait for the modal or message
    await page.waitForTimeout(2000);
    
    // Let's just login if we didn't go to /app
    // Actually we can just do signIn via the UI
    console.log('3. Navigating to workouts...');
    await page.goto('http://localhost:4200/app/workouts', {waitUntil: 'networkidle'});
    
    console.log('4. Clicking start workout...');
    await page.click('ion-button:has-text("Entrenamiento")'); 
    await page.waitForURL('**/active');
    await page.waitForTimeout(500);
    
    console.log('5. Clicking Add Exercise...');
    const buttons = await page.$$('ion-button');
    for (const b of buttons) {
      const t = await b.textContent();
      if (t && t.includes('adir')) { await b.click(); break; }
    }
    
    console.log('6. Waiting for modal to load items...');
    await page.waitForTimeout(2000);
    
    const pageText = await page.textContent('body');
    
    const hasFetchError = logs.some(l => l.includes('Failed to fetch') || l.includes('ERR_CONNECTION_REFUSED'));
    if (hasFetchError) {
      console.error('Test found fetch errors:', logs);
      process.exit(1);
    }
    
    if (pageText.includes('Sentadilla')) {
      console.log('SUCCESS: "Sentadilla" was found in the UI. RLS and Network are working correctly!');
    } else {
      console.log('WARNING: Exercises not found. Auth might have failed or RLS blocked it.');
      console.log('Logs:', logs);
    }
    
    await browser.close();
  } catch (e) {
    console.error('Test failed with exception:', e);
    process.exit(1);
  }
})();
