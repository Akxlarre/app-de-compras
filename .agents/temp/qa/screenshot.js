const { chromium } = require('playwright');
(async () => {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:4200/app/workouts', {waitUntil: 'networkidle'});
    await page.click('ion-button'); 
    await page.waitForURL('**/active');
    await page.waitForTimeout(500);
    const buttons = await page.$$('ion-button');
    for (const b of buttons) {
      const text = await b.textContent();
      if (text && text.includes('adir')) { await b.click(); break; }
    }
    await page.waitForTimeout(2000); // Wait for modal animation
    await page.screenshot({path: 'C:/Users/Akxlarre/.gemini/antigravity/brain/34bddaa9-073b-4841-a07c-c85e37b01577/workouts_screen.png'});
    await browser.close();
    console.log('Screenshot taken!');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
