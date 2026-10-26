const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-results');
fs.mkdirSync(output, { recursive: true });
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/frame.html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.end('<p id="frame-color">#ff0000, rgb(0 0 255)</p>');
  }
  const target = path.resolve(root, '.' + (pathname === '/' ? '/demo.html' : pathname));
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target)) { res.writeHead(404); return res.end(); }
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };
  res.setHeader('Content-Type', types[path.extname(target)] || 'text/plain');
  let data = fs.readFileSync(target);
  // The HTTP fixture relies solely on the real installed extension's injection.
  if (pathname === '/' || pathname === '/demo.html') data = Buffer.from(data.toString().replace(/<script[\s\S]*?<\/script>/g, ''));
  res.end(data);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let context;
  const errors = [];
  const check = async (name, run) => { await run(); console.log(`PASS ${name}`); };
  try {
    const fallback = process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright', 'chromium-1228', 'chrome-win64', 'chrome.exe');
    const executablePath = process.env.CHROMIUM_PATH || (fs.existsSync(chromium.executablePath()) ? chromium.executablePath() : fallback);
    context = await chromium.launchPersistentContext('', {
      executablePath, headless: true, viewport: { width: 1280, height: 960 },
      args: [`--disable-extensions-except=${root}`, `--load-extension=${root}`]
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('chrome://extensions');
    const extensions = await page.evaluate(() => new Promise(resolve => chrome.developerPrivate.getExtensionsInfo({ includeDisabled: true, includeTerminated: true }, resolve)));
    const extension = extensions.find(item => item.name === 'Color Picker');
    assert.ok(extension, 'Chrome loaded the unpacked extension');
    assert.equal(extension.manifestErrors.length, 0);
    const extensionURL = `chrome-extension://${extension.id}`;
    await page.goto(base);

    const panel = page.locator('color-picker-overlay .panel');
    const rows = page.locator('color-picker-overlay .row');
    const chips = page.locator('color-picker-overlay .chip');
    const select = async (id) => {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.evaluate((id) => {
        document.activeElement?.blur();
        const range = document.createRange();
        range.selectNodeContents(document.getElementById(id));
        const selection = getSelection();
        selection.removeAllRanges(); selection.addRange(range);
      }, id);
      await panel.waitFor({ state: 'visible' });
      await page.waitForTimeout(150);
    };
    await check('real extension injection, four HEX colors and inline markers', async () => {
      await select('hex-sample');
      assert.equal(await rows.count(), 4);
      assert.equal(await chips.count(), 4);
      assert.equal(await rows.first().locator('.fill').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(54, 93, 204)');
      await page.screenshot({ path: path.join(output, 'selection-preview.png'), fullPage: true });
    });
    await check('three adjacent HEX values', async () => {
      await select('adjacent-sample'); assert.equal(await rows.count(), 3);
    });
    await check('alpha and short HEX', async () => {
      await select('alpha-sample'); assert.equal(await rows.count(), 4);
      assert.match(await rows.nth(2).locator('.fill').evaluate(el => getComputedStyle(el).backgroundColor), /rgba.*0\.5/);
    });
    await check('mixed RGB, HSL and HWB with Chinese punctuation', async () => {
      await select('mixed-sample'); assert.equal(await rows.count(), 3);
    });
    await check('modern color spaces validated by browser CSS parser', async () => {
      await select('modern-sample'); assert.equal(await rows.count(), 5);
      for (const value of await rows.locator('.fill').evaluateAll(els => els.map(el => getComputedStyle(el).backgroundColor))) assert.notEqual(value, 'rgba(0, 0, 0, 0)');
    });
    await check('colors split across formatted text nodes', async () => {
      await select('split-sample'); assert.equal(await rows.count(), 2);
      assert.equal(await rows.first().locator('code').textContent(), '#365DCC');
      assert.equal(await chips.count(), 2);
    });
    await check('textarea selection previews and password fields stay excluded', async () => {
      await page.locator('textarea').evaluate(el => { el.focus(); el.setSelectionRange(0, el.value.length); });
      await page.waitForTimeout(250);
      assert.equal(await rows.count(), 3); assert.equal(await chips.count(), 0);
      await page.evaluate(() => {
        const el = document.createElement('input'); el.type = 'password'; el.value = '#ff0000';
        document.body.append(el); el.focus(); el.select();
      });
      await panel.waitFor({ state: 'hidden' });
    });
    await check('actual mouse selection triggers preview', async () => {
      await page.locator('#hex-sample').scrollIntoViewIfNeeded();
      await page.evaluate(() => { document.activeElement.blur(); getSelection().removeAllRanges(); });
      const box = await page.locator('#hex-sample').boundingBox();
      await page.mouse.move(box.x + 1, box.y + 12);
      await page.mouse.down(); await page.mouse.move(box.x + 265, box.y + 12, { steps: 12 }); await page.mouse.up();
      await panel.waitFor({ state: 'visible' });
      assert.ok(await rows.count() >= 2);
    });
    await check('scroll keeps markers aligned with selected code', async () => {
      await select('hex-sample');
      const before = await chips.first().boundingBox();
      const scrollBefore = await page.evaluate(() => scrollY);
      await page.evaluate(() => window.scrollBy(0, 70)); await page.waitForTimeout(100);
      const delta = await page.evaluate(() => scrollY) - scrollBefore;
      const after = await chips.first().boundingBox();
      assert.ok(Math.abs(before.y - after.y - delta) < 2);
    });
    await check('Escape dismisses and selecting non-colors clears previews', async () => {
      await page.keyboard.press('Escape'); await panel.waitFor({ state: 'hidden' });
      await select('hex-sample');
      await page.locator('h1').evaluate(el => { const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); });
      await panel.waitFor({ state: 'hidden' });
    });
    await check('settings persist and update already-open pages', async () => {
      const popup = await context.newPage();
      await popup.goto(`${extensionURL}/popup.html`);
      await popup.locator('#enabled').uncheck();
      await popup.waitForFunction(() => document.getElementById('enabled').disabled === false);
      await page.bringToFront();
      await page.locator('#hex-sample').evaluate(el => { const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); });
      await page.waitForTimeout(250); assert.equal(await panel.isVisible(), false);
      await popup.locator('#enabled').check();
      await panel.waitFor({ state: 'visible' });
      await popup.locator('#inline').uncheck(); await page.waitForTimeout(250);
      assert.equal(await chips.count(), 0);
      await popup.locator('#bareHex').check(); await page.waitForTimeout(150);
      await page.evaluate(() => { const el = document.createElement('p'); el.id = 'bare'; el.textContent = 'FF0099, 365DCC'; document.body.prepend(el); });
      await select('bare'); assert.equal(await rows.count(), 2);
      await popup.reload(); assert.equal(await popup.locator('#bareHex').isChecked(), true);
      await popup.locator('#bareHex').uncheck(); await popup.locator('#inline').check();
      await popup.setViewportSize({ width: 356, height: 650 });
      await popup.screenshot({ path: path.join(output, 'popup.png'), fullPage: true });
      await popup.close();
    });
    await check('click-to-copy preserves selection', async () => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
      await page.bringToFront(); await select('hex-sample');
      const selection = await page.evaluate(() => getSelection().toString());
      await rows.first().click();
      await page.waitForFunction(() => document.querySelector('color-picker-overlay').shadowRoot.querySelector('footer').textContent.startsWith('已複製'));
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '#365DCC');
      assert.equal(await page.evaluate(() => getSelection().toString()), selection);
    });
    await check('iframe content receives the extension', async () => {
      await page.evaluate(() => { const frame = document.createElement('iframe'); frame.src = '/frame.html'; document.body.prepend(frame); });
      const locator = page.frameLocator('iframe');
      await locator.locator('#frame-color').evaluate(el => { const r = document.createRange(); r.selectNodeContents(el); getSelection().removeAllRanges(); getSelection().addRange(r); });
      await locator.locator('color-picker-overlay .panel').waitFor({ state: 'visible' });
      assert.equal(await locator.locator('color-picker-overlay .row').count(), 2);
    });
    await check('narrow viewport palette stays within the window', async () => {
      await page.setViewportSize({ width: 390, height: 700 }); await select('modern-sample');
      const box = await panel.boundingBox();
      assert.ok(box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 700);
      await page.screenshot({ path: path.join(output, 'narrow-preview.png'), fullPage: true });
    });
    await check('bundled playground works as an extension page', async () => {
      await page.setViewportSize({ width: 1280, height: 960 });
      await page.goto(`${extensionURL}/demo.html`); await select('hex-sample');
      assert.equal(await rows.count(), 4);
    });
    await check('no page exceptions or extension runtime errors', async () => {
      assert.deepEqual(errors, []);
      await page.goto('chrome://extensions');
      const info = await page.evaluate(() => new Promise(resolve => chrome.developerPrivate.getExtensionsInfo({}, resolve)));
      assert.deepEqual(info.find(item => item.name === 'Color Picker').runtimeErrors, []);
    });
    console.log('Browser checks complete. Screenshots: test-results/');
  } finally {
    await context?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
