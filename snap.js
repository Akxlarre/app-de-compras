const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  
  await page.goto('http://localhost:4200/app/workouts');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'ui_workouts_floating.png' });
  
  await page.goto('http://localhost:4200/app/workouts/active');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'ui_active_floating.png' });
  
  await browser.close();
})();
