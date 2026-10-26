const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'store-assets');

(async () => {
  const fallback = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1228', 'chrome-win64', 'chrome.exe');
  const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync(chromium.executablePath()) ? chromium.executablePath() : fallback);
  const context = await chromium.launchPersistentContext('', {
    executablePath, headless: true, viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`],
  });
  try {
    const page = await context.newPage();
    await page.goto(pathToFileURL(path.join(output, 'promo.html')).href);
    await page.setViewportSize({ width: 440, height: 280 });
    await page.screenshot({ path: path.join(output, 'color-picker-promo-440x280.png'), omitBackground: false });
    await page.evaluate(() => document.body.classList.add('marquee'));
    await page.setViewportSize({ width: 1400, height: 560 });
    await page.screenshot({ path: path.join(output, 'color-picker-marquee-1400x560.png'), omitBackground: false });
    await page.goto('chrome://extensions');
    const extensions = await page.evaluate(() => new Promise(resolve => chrome.developerPrivate.getExtensionsInfo({}, resolve)));
    const extension = extensions.find(item => item.name === 'Color Picker');
    assert.ok(extension, 'Real extension loaded for store screenshots');
    assert.deepEqual(extension.manifestErrors, []);
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const [id, name] of [['hex-sample', 'color-picker-screenshot-1280x800.png'], ['modern-sample', 'color-picker-modern-1280x800.png']]) {
      await page.goto(`chrome-extension://${extension.id}/demo.html`);
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      if (id === 'modern-sample') await page.evaluate(() => scrollTo(0, document.querySelector('.workspace').offsetTop - 24));
      await page.locator(`#${id}`).evaluate(el => {
        const range = document.createRange(); range.selectNodeContents(el);
        getSelection().removeAllRanges(); getSelection().addRange(range);
      });
      await page.locator('color-picker-overlay .panel').waitFor({ state: 'visible' });
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(output, name), omitBackground: false });
    }
    // Verify the policy shipped inside the extension, including its public contact.
    await page.goto(`chrome-extension://${extension.id}/popup.html`);
    assert.equal(await page.locator('a[href="privacy.html"]').count(), 1);
    await page.goto(`chrome-extension://${extension.id}/privacy.html`);
    assert.equal(await page.locator('a[href="mailto:kevinyaungputra@gmail.com"]').count(), 2);
    assert.ok(await page.locator('#en').count());
    const checks = [
      ['color-picker-promo-440x280.png', 440, 280],
      ['color-picker-marquee-1400x560.png', 1400, 560],
      ['color-picker-screenshot-1280x800.png', 1280, 800],
      ['color-picker-modern-1280x800.png', 1280, 800],
    ];
    for (const [name, width, height] of checks) {
      const data = fs.readFileSync(path.join(output, name));
      assert.equal(data.readUInt32BE(16), width);
      assert.equal(data.readUInt32BE(20), height);
      console.log(`PASS ${name}: ${width} x ${height}`);
    }
  } finally { await context.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
