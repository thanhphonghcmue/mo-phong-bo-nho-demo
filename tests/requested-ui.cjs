// User-requested controls, optional replacement evidence, and actual snapshot parity.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 1000 } });
  const out = process.env.MEMORY_ARTIFACT_DIR || '/tmp/memory-requested-ui';
  fs.mkdirSync(out, { recursive: true });
  const checks = [], errors = [], failedAssets = [], accessibility = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failedAssets.push(r.status() + ' ' + r.url()); });
  const snap = id => page.evaluate(id => MemoryTeaching.snapshot(id), id);
  const trace = id => page.evaluate(id => MemoryTeaching.trace(id), id);
  const seek = async (id, step) => {
    await page.evaluate(([id, step]) => MemoryTeaching.seek(id, step), [id, step]);
    await page.waitForTimeout(100);
  };
  const details = () => page.locator('#r-choice-details');
  async function reasonOpen(open) {
    if (await details().evaluate(e => e.open) !== open) await page.click('#r-choice-summary');
    await page.waitForTimeout(100);
  }
  async function check(name, run) {
    await run(); checks.push(name); console.log('PASS', name);
  }
  async function shot(name) {
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
  }
  async function inputB(mode, value) {
    await page.click('#t0');
    await page.click(mode === 'translate' ? '#b-mode-trans' : '#b-mode-check');
    for (const [id, v] of Object.entries({ 'b-base': 100, 'b-limit': 4, 'b-addr': value })) await page.fill('#' + id, String(v));
    await page.click('#b-go');
  }
  async function visibleRSource(expected) {
    assert.equal(await page.locator('#r-scene').getAttribute('data-flow-from'), expected);
    assert.equal(await page.locator('#' + expected).isVisible(), true);
    const overlay = page.locator('#r-scene').locator('..').locator('.studio-flow-overlay');
    assert.equal(await overlay.getAttribute('data-from'), expected);
    const result = await overlay.evaluate((svg, sourceId) => {
      const line = svg.querySelector('path[marker-end]');
      const p = line.getPointAtLength(0), point = new DOMPoint(p.x, p.y).matrixTransform(line.getScreenCTM());
      const r = document.getElementById(sourceId).getBoundingClientRect();
      return {
        visible: r.width > 0 && r.height > 0,
        distance: Math.hypot(Math.max(r.left - point.x, 0, point.x - r.right), Math.max(r.top - point.y, 0, point.y - r.bottom)),
        head: getComputedStyle(line).markerEnd !== 'none',
      };
    }, expected);
    assert.ok(result.visible && result.distance <= 48 && result.head, 'route starts at a visible source with a real arrowhead');
  }
  function contrast(fg, bg) {
    const luminance = color => {
      const a = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
        v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
      });
      return a[0] * .2126 + a[1] * .7152 + a[2] * .0722;
    };
    const a = luminance(fg), b = luminance(bg);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  }
  try {
    await page.goto(process.env.MEMORY_DEMO_URL || 'http://127.0.0.1:8080');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector('#r-choice-details', { state: 'attached' });

    await check('Both Demo 1 modes are usable without opening optional examples', async () => {
      assert.equal(await page.locator('#b-options').evaluate(e => e.open), false);
      for (const id of ['b-mode-check', 'b-mode-trans']) {
        assert.equal(await page.locator('#' + id).isVisible(), true);
        assert.equal(await page.locator('#' + id).evaluate(e => !!e.closest('details')), false);
      }
      await inputB('translate', 2);
      assert.equal((await snap('b')).mode, 'translate');
      assert.equal(await page.locator('#b-options').evaluate(e => e.open), false);
      for (const step of [0, 1]) {
        await seek('b', step); assert.equal((await page.locator('#studio-b-pa').innerText()).trim(), '?');
        assert.equal(await page.locator('#studio-b-to-ram').getAttribute('data-active'), 'false');
      }
      await seek('b', 2); assert.equal((await page.locator('#studio-b-pa').innerText()).trim(), '102');
      await seek('b', 3); assert.equal((await snap('b')).pa, 102);
      await shot('demo1-visible-modes');
    });

    await check('Offset errors identify the actual invalid bound and never authorize RAM', async () => {
      for (const [value, reason] of [[-5, /âm|nhỏ hơn\s*0|<\s*0/i], [4, /Limit|cận trên|giới hạn/i]]) {
        await inputB('translate', value); await seek('b', 1);
        const explanation = (await page.locator('#studio-b-lower').innerText()) + '\n' + (await page.locator('.studio-b-logic-flow').innerText());
        assert.match(explanation, reason);
        if (value < 0) assert.doesNotMatch(explanation, /VƯỢT LIMIT/i);
        else assert.doesNotMatch(explanation, /Vi phạm cận dưới/i);
        await seek('b', 3);
        assert.equal((await snap('b')).pa, null);
        assert.equal(await page.locator('#studio-b-to-ram').getAttribute('data-active'), 'false');
        assert.equal(await page.locator('#studio-b-to-os').getAttribute('data-active'), 'true');
      }
      await inputB('check', 104); await seek('b', 3);
      assert.equal((await snap('b')).isValid, false, 'the physical upper bound is exclusive');
      assert.equal(await page.locator('#b-flow').getAttribute('data-failed-gate'), 'upper');
    });

    await check('Example names describe their actual reference sequence, not an unexplained comparison', async () => {
      await page.click('#t3');
      for (const [value, count] of [['0', 6], ['1', 12], ['2', 20]]) {
        await page.selectOption('#r-scenario', value);
        const text = await page.locator('#r-scenario option:checked').innerText();
        assert.match(text, new RegExp(String(count)));
        assert.doesNotMatch(text, /so sánh|bốn quy tắc/i);
        assert.equal((await snap('r')).refs.length, count);
        assert.equal((await snap('r')).alg, 'FIFO');
      }
      await page.selectOption('#r-scenario', '1');
      assert.equal(await page.locator('#r-scenario').inputValue(), '1');
    });

    await check('Replacement order stays optional; closed evidence cannot become a route source', async () => {
      assert.equal(await details().evaluate(e => e.open), false);
      assert.equal(await page.locator('#r-evidence').isVisible(), false);
      const events = await trace('r'), victim = events.findIndex(e => e.state.runtime.phase === 'victim');
      assert.ok(victim > 0); await seek('r', victim);
      const state = await snap('r');
      assert.equal(state.runtime.fr[state.runtime.slot], state.runtime.victim, 'selection has not installed the new page');
      await visibleRSource('r-choice-summary');
      await shot('demo5-compact');
      const before = await snap('r'); await reasonOpen(true); assert.deepEqual(await snap('r'), before);
      assert.equal(await page.locator('#r-evidence').isVisible(), true);
      assert.match(await page.locator('#r-evidence').innerText(), /nạp|chọn|sớm/i);
      await visibleRSource('r-evidence');
      await page.click('#r-next'); assert.equal(await details().evaluate(e => e.open), true);
      assert.deepEqual(await snap('r'), events[victim + 1].state);
      await page.click('#r-prev'); assert.deepEqual(await snap('r'), before);
      await visibleRSource('r-evidence');
      await shot('demo5-open-reason');
      await reasonOpen(false); assert.deepEqual(await snap('r'), before);
      await visibleRSource('r-choice-summary');
    });

    await check('Clock and backward navigation preserve state with optional evidence closed', async () => {
      await page.locator('#r-alg [data-a="CLOCK"]').click();
      const events = await trace('r'), inspect = events.findIndex(e => e.state.runtime.phase === 'inspect');
      assert.ok(inspect > 0); await seek('r', inspect);
      await visibleRSource('r-choice-summary');
      const state = await snap('r'); await page.click('#r-next'); await page.click('#r-prev');
      assert.deepEqual(await snap('r'), state);
      assert.equal(await details().evaluate(e => e.open), false);
      await reasonOpen(true); await seek('r', inspect + 1);
      assert.equal(await details().evaluate(e => e.open), true);
      await reasonOpen(false);
    });

    await check('Visible modes, disclosures and arrows remain usable on desktop, tablet and mobile', async () => {
      for (const width of [1366, 1024, 768, 390, 375]) {
        await page.setViewportSize({ width, height: 900 });
        await page.click('#t0');
        assert.equal(await page.locator('#b-options').evaluate(e => e.open), false);
        for (const id of ['b-mode-check', 'b-mode-trans']) {
          const button = page.locator('#' + id);
          assert.equal(await button.isVisible(), true);
          const bounds = await button.boundingBox();
          assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
        }
        for (const [tab, id] of [['#t0', 'b'], ['#t1', 'a'], ['#t2', 'x'], ['#t4', 'v'], ['#t3', 'r']]) {
          await page.click(tab); await page.waitForTimeout(80);
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), width + '/' + id + ' page overflow');
        }
        await page.locator('#r-alg [data-a="FIFO"]').click();
        const events = await trace('r'), victim = events.findIndex(e => e.state.runtime.phase === 'victim');
        await seek('r', victim); await reasonOpen(false); await visibleRSource('r-choice-summary');
        await reasonOpen(true); await visibleRSource('r-evidence'); await reasonOpen(false);
        if (width === 390) await shot('demo5-mobile');
      }
    });

    await check('Step numbers keep readable contrast in light and dark, without changing snapshots', async () => {
      await page.setViewportSize({ width: 1366, height: 1000 });
      for (const theme of ['light', 'dark']) {
        const before = await snap('r'); await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
        await page.waitForTimeout(100); assert.deepEqual(await snap('r'), before);
        const colors = await page.locator('#r-scene').locator('..').locator('.studio-flow-step').evaluate(e => ({ fg: getComputedStyle(e).color, bg: getComputedStyle(e).backgroundColor }));
        assert.ok(contrast(colors.fg, colors.bg) >= 4.5, theme + ' current-step contrast');
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const before = await snap('r'); await page.click('#r-prev'); await page.click('#r-next'); assert.deepEqual(await snap('r'), before);
      assert.equal(await details().evaluate(e => e.open), false);
    });

    if (process.env.MEMORY_AXE_PATH) {
      await page.addScriptTag({ path: process.env.MEMORY_AXE_PATH });
      await check('Visible modes and compact replacement presentation pass automated WCAG A/AA scans', async () => {
        for (const theme of ['light', 'dark']) {
          await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
          for (const tab of ['#t0', '#t3']) {
            await page.click(tab);
            const report = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
            const result = { theme, tab, violations: report.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) };
            accessibility.push(result); assert.deepEqual(result.violations, []);
          }
        }
      });
    }
    assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ passed: checks.length, checks, errors, failedAssets, accessibility }, null, 2));
    console.log(JSON.stringify({ passed: checks.length, errors, failedAssets, artifacts: out }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
