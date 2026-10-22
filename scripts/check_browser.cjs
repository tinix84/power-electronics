// Usage: node scripts/check_browser.cjs [absolute playwright module path]
const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../_site');
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/power-electronics\//, '');
  const file = path.resolve(root, name || 'index.html');
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/power-electronics/`;
  const browser = await chromium.launch(process.env.CI ? {} : {channel: 'chrome'});
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const remote = [];
    await context.route('https://**/*', route => {
      remote.push(route.request().url());
      // Test the consent boundary without recording artificial GA visits.
      return route.fulfill({contentType: 'application/javascript', body: 'window.analyticsTestLoaded = true;'});
    });
    await page.goto(base);
    await page.locator('#analytics-panel').waitFor({state: 'visible'});
    assert.equal(remote.length, 0, 'No remote requests before consent');
    await page.getByRole('button', {name: 'Reject analytics', exact: true}).click();
    await page.reload();
    assert.equal(await page.locator('#analytics-panel').isVisible(), false);
    assert.equal(remote.length, 0, 'No remote requests after rejection');
    await page.getByRole('button', {name: 'Analytics settings', exact: true}).click();
    await page.getByRole('button', {name: 'Accept analytics', exact: true}).click();
    await page.waitForFunction(() => window.analyticsTestLoaded);
    assert.equal(remote.length, 1);
    assert.match(remote[0], /gtag\/js\?id=G-H0BY8YR2Q8/);
    const config = await page.evaluate(() => Array.from(dataLayer.find(item => item[0] === 'config')));
    assert.equal(config[2].allow_google_signals, false);
    assert.equal(config[2].allow_ad_personalization_signals, false);
    assert.equal(config[2].cookie_path, '/power-electronics/');
    await page.evaluate(() => { document.cookie = 'pe_course_ga=test; Path=/power-electronics/'; });
    await page.getByRole('button', {name: 'Analytics settings', exact: true}).click();
    await Promise.all([
      page.waitForEvent('load'),
      page.getByRole('button', {name: 'Reject analytics', exact: true}).click()
    ]);
    assert.equal(remote.length, 1, 'Withdrawal reload must not load Google');
    assert.equal(await page.evaluate(() => document.cookie.includes('pe_course')), false);
    const files = ['index.html', 'privacy.html', 'power-electronics-recap/recap.html', 'power-electronics-recap/transformer-characterization.html', 'lesson-01-buck/lesson-01.html'];
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 900});
      for (const file of files) {
        await page.goto(base + file);
        await page.locator('#analytics-settings').waitFor();
        const result = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 2,
          broken: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).length
        }));
        assert.equal(result.overflow, false, `${file} overflows at ${width}px`);
        assert.equal(result.broken, 0, `${file} has broken figures at ${width}px`);
      }
    }
    assert.equal(remote.length, 1, 'Rejected state persists across course pages');
    console.log('PASS: consent, rejection, withdrawal, scoped cookies, five pages, figures, desktop and mobile.');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
