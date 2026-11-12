// Usage: node scripts/check_browser.cjs [absolute playwright module path]
const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const foundationsOnly = process.argv.includes('--foundations');
const root = path.resolve(__dirname, '../_site');
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/power-electronics\//, '');
  const file = path.resolve(root, name || 'index.html');
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.json') ? 'application/json' : 'text/html');
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/power-electronics/`;
  const browser = await chromium.launch({channel: 'chrome'});
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
    const foundationManifest = JSON.parse(fs.readFileSync(path.resolve(root, '../content/power-electronics-recap/foundation-pages.json'), 'utf8'));
    const foundationFiles = foundationManifest.map(entry => 'power-electronics-recap/' + entry.file);
    const files = foundationsOnly ? ['index.html', 'power-electronics-recap/recap.html', ...foundationFiles] : ['index.html', 'privacy.html', 'figures.html', 'power-electronics-recap/recap.html', 'power-electronics-recap/transformer-characterization.html', 'lesson-01-buck/lesson-01.html', 'lesson-02-boost/lesson-02.html', 'lesson-magnetics/appendix-area-product.html', 'lesson-converter-tolerances/exercise.html', 'lesson-control/lesson-control.html', ...foundationFiles];
    for (const width of [1440, 390]) {
      await page.setViewportSize({width, height: 900});
      for (const file of files) {
        await page.goto(base + file);
        await page.locator('#analytics-settings').waitFor();
        await page.evaluate(() => document.fonts.ready);
        const result = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 2,
          wide: [...document.querySelectorAll('main *')].filter(element => element.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(element).overflowX !== 'auto').slice(0, 8).map(element => ({tag: element.tagName, class: element.className, text: element.textContent.slice(0, 100)})),
          broken: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).length
        }));
        assert.equal(result.overflow, false, `${file} overflows at ${width}px: ${JSON.stringify(result.wide)}`);
        assert.equal(result.broken, 0, `${file} has broken figures at ${width}px`);
        if (file === 'lesson-converter-tolerances/exercise.html') {
          assert.ok(await page.getByRole('heading', {name: /Part H/}).count());
          assert.equal(await page.locator('.worked-plot, a[href*="solutions"]').count(), 0);
          assert.ok(!(await page.locator('main').innerText()).includes('27.3888'));
        }
        if (file === 'figures.html') {
          assert.equal(await page.locator('.figure-card').count(), 26);
          const figureResult = await page.evaluate(async () => {
            const manifest = await (await fetch('circuit-figures/manifest.json')).json();
            const combined = await (await fetch('circuit-figures/combined.json')).json();
            const problems = [];
            for (const entry of manifest.figures) {
              const response = await fetch('circuit-figures/' + entry.stem + '.svg');
              const svg = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
              const ids = new Set([...svg.querySelectorAll('[id]')].map(e => e.id));
              if (svg.querySelector('parsererror')) problems.push(entry.stem + ': XML parse error');
              const drawing = [...svg.documentElement.children].find(e => e.localName === 'g');
              if (!drawing || drawing.children.length !== entry.components) problems.push(entry.stem + ': incomplete components');
              for (const use of svg.querySelectorAll('use')) {
                const href = use.getAttribute('href') || use.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                if (!href || !href.startsWith('#') || !ids.has(href.slice(1))) problems.push(entry.stem + ': missing symbol');
              }
            }
            return {groups: combined.components.length, figures: manifest.figures.length, problems};
          });
          assert.equal(figureResult.groups, 26);
          assert.equal(figureResult.figures, 26);
          assert.deepEqual(figureResult.problems, []);
        }
        if (file === 'lesson-02-boost/lesson-02.html') {
          assert.equal(await page.locator('h2').filter({hasText: /^E[123] —/}).count(), 3);
          assert.equal(await page.locator('table').count(), 3);
          // the E3 schematic is the only figure; worked plots must stay withheld
          const figures = page.locator('img:not(.math)');
          assert.equal(await figures.count(), 1, 'Worked plots must stay withheld');
          assert.ok((await figures.getAttribute('alt')).startsWith('Synchronous boost'));
          const text = await page.locator('main').innerText();
          assert.ok(!text.includes('Possible solutions'));
          assert.ok(!text.includes('Figure E1.1'));
          assert.ok(!text.includes('Figure E2.1'));
          for (const withheld of ['43.75', '17.42', '16.05']) assert.ok(!text.includes(withheld));
          assert.equal((text.match(/Released after the deadline in the Enrolled companion\./g) || []).length, 3);
        }
        if (file.includes('/') && file !== 'lesson-02-boost/lesson-02.html' && !foundationFiles.includes(file)) {
          assert.ok(await page.locator('.katex').count() > 0, `${file} must use textbook math`);
          assert.equal(await page.locator('img.math').count(), 0, `${file} must not retain math images`);
        }
        if (foundationFiles.includes(file)) {
          assert.equal(await page.locator('main h1').count(), 1, `${file}: one page title`);
          assert.equal(await page.locator('img.math').count(), 0, `${file}: use textbook math`);
          assert.equal(await page.locator('main footer a[href="recap.html"]').count(), 1);
          const index = foundationFiles.indexOf(file);
          if (index > 1) assert.equal(await page.locator('.foundation-pager a[rel="prev"]').getAttribute('href'), foundationManifest[index - 1].file);
          if (index > 0 && index < foundationFiles.length - 1) assert.equal(await page.locator('.foundation-pager a[rel="next"]').getAttribute('href'), foundationManifest[index + 1].file);
        }
        if (file.endsWith('recap.html')) {
          assert.equal(await page.locator('img[alt^="Figure 61."]').count(), 1);
          assert.equal(await page.locator('img[alt^="Figure 62."]').count(), 1);
        }
        if (width === 390 && file.endsWith('recap.html')) {
          await page.locator('.chapter-toggle-label').click();
          assert.equal(await page.locator('nav[aria-label="Chapter contents"]').isVisible(), true);
          await page.locator('nav a[href="#14-are-linear-regulators-dead-no-choose-the-architecture"]').click();
          assert.equal(await page.locator('nav[aria-label="Chapter contents"]').isVisible(), false);
        }
      }
    }
    assert.equal(remote.length, 1, 'Rejected state persists across course pages');
    await page.goto(base + 'power-electronics-recap/chapter-02-04.html');
    await page.getByRole('link', {name: 'Next:', exact: false}).click();
    assert.ok(page.url().endsWith('/chapter-02-05.html'), 'Next opens a separate topic');
    await page.getByRole('link', {name: 'Previous:', exact: false}).click();
    assert.ok(page.url().endsWith('/chapter-02-04.html'), 'Previous returns to the topic');
    await page.setViewportSize({width: 390, height: 844});
    await page.locator('.chapter-toggle-label').click();
    await page.locator('nav[aria-label="Chapter contents"] a[href="chapter-01.html"]').click();
    assert.ok(page.url().endsWith('/chapter-01.html'));
    assert.equal(await page.locator('nav[aria-label="Chapter contents"]').isVisible(), false);
    if (process.env.PREVIEW_DIR) {
      fs.mkdirSync(process.env.PREVIEW_DIR, {recursive: true});
      await page.setViewportSize({width: 1440, height: 1000});
      await page.goto(base + 'power-electronics-recap/chapter-02-04.html');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      await page.screenshot({path: path.join(process.env.PREVIEW_DIR, 'reading-desktop.png')});
      await page.setViewportSize({width: 390, height: 844});
      await page.waitForTimeout(300);
      await page.screenshot({path: path.join(process.env.PREVIEW_DIR, 'reading-mobile.png')});
    }
    const bookManifest = path.resolve(root, '../content/quarto-book/release-manifest.json');
    if (!foundationsOnly && fs.existsSync(bookManifest)) {
      const release = JSON.parse(fs.readFileSync(bookManifest, 'utf8'));
      const newLessonPrefixes = ['lesson-03-buck-boost/', 'lesson-four-switch-buck-boost/', 'lesson-capacitors/'];
      const newLessonPages = release.files.map(entry => entry.path).filter(file => file.endsWith('.html') && newLessonPrefixes.some(prefix => file.startsWith(prefix)));
      assert.ok(newLessonPages.length >= 40, 'The three complete lessons must be published');
      assert.equal(release.files.some(entry => /lesson-(?:03|four-switch|capacitors)-solutions|\.(?:md|qmd|py|ipynb|pdf)$/.test(entry.path)), false, 'Withheld companions and source documents must remain private');
      await page.goto(base);
      for (const entry of ['lesson-03-buck-boost/lesson-03.html', 'lesson-four-switch-buck-boost/lesson-four-switch.html', 'lesson-capacitors/lesson-capacitors.html']) {
        assert.equal(await page.locator(`a.course-card[href="quarto-book/${entry}"]`).count(), 1);
      }
      for (const width of [1440,390]) {
        await page.setViewportSize({width,height:1000});
        for (const file of ['index.html','power-electronics-recap/chapter-01.html','power-electronics-recap/chapter-19-09.html','power-electronics-recap/chapter-19-12.html','power-electronics-recap/chapter-19-13.html','power-electronics-recap/chapter-19-14.html', ...newLessonPages]) {
          assert.equal((await page.goto(base+'quarto-book/'+file)).status(),200);
          await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.querySelectorAll('main img')].map(i=>i.decode())); });
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,file+' overflows');
          assert.equal(await page.locator('.katex-error').count(),0);
          assert.equal(await page.evaluate(()=>[...document.querySelectorAll('span.math')].filter(e=>!e.querySelector('.katex')).length),0);
        }
      }
      await page.setViewportSize({width:1440,height:1000});
      await page.locator('#quarto-search button').first().click();
      await page.locator('input.aa-Input:visible').fill('LED');
      await page.locator('.aa-Item').first().waitFor();
      await page.keyboard.press('Escape');
      await page.locator('.quarto-color-scheme-toggle:visible').first().click();
      await page.waitForFunction(()=>document.body.classList.contains('quarto-dark'));
      assert.equal(remote.length,1,'The book needs no remote reading dependencies');
    }
    console.log(`PASS: consent, ${files.length} pages, chapter sequence, figures, desktop and mobile${foundationsOnly ? ' (foundation scope)' : ''}.`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
