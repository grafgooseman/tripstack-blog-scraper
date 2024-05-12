const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // set headless: true to run in headless mode
  const page = await browser.newPage();
  await page.goto('https://www.tripstack.com/blog');
//   await page.screenshot({ path: 'example.png' });
//   await browser.close();
})();