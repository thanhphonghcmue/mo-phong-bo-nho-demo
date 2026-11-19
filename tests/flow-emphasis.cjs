// Public presentation acceptance: follow real operations, not the previous visual column.
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
  const out = process.env.MEMORY_ARTIFACT_DIR || '/tmp/memory-flow-emphasis-qa';
  fs.mkdirSync(out, { recursive: true });
  const checks = [], errors = [], failedAssets = [], accessibility = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) failedAssets.push(r.status() + ' ' + r.url()); });
  const roots = { a: '#a-lane', x: '#x-flow', v: '#v-flow', r: '#r-scene' };
  const tabs = { b: '#t0', a: '#t1', x: '#t2', v: '#t4', r: '#t3' };
  const snap = id => page.evaluate(id => MemoryTeaching.snapshot(id), id);
  const trace = id => page.evaluate(id => MemoryTeaching.trace(id), id);
  async function seek(id, step) {
    await page.evaluate(([id, step]) => MemoryTeaching.seek(id, step), [id, step]);
    await page.waitForTimeout(100);
  }
  async function openBOptions() {
    const options = page.locator('#b-options');
    if (await options.getAttribute('open') === null) await options.locator('summary').click();
  }
  async function check(name, run) {
    await run(); checks.push(name); console.log('PASS', name);
  }
  async function shot(name) {
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
  }
  async function route(id, from, to) {
    const root = page.locator(roots[id]);
    const host = id === 'r' ? root.locator('..') : root;
    assert.equal(await root.getAttribute('data-flow-from'), from, id + ' source');
    assert.equal(await root.getAttribute('data-flow-to'), to, id + ' destination');
    assert.ok((await host.locator('.studio-flow-action').innerText()).trim().length > 8,
      'the operation has a readable instruction beside the model');
    const overlay = host.locator('.studio-flow-overlay');
    assert.equal(await overlay.getAttribute('data-from'), from);
    assert.equal(await overlay.getAttribute('data-to'), to);
    const graphics = await overlay.evaluate((svg, { from, to }) => {
      const line = svg.querySelector('path[marker-end]') || svg.querySelector('path');
      if (!line) return { valid: false };
      const style = getComputedStyle(line), ctm = line.getScreenCTM();
      const length = line.getTotalLength();
      const point = offset => {
        const p = line.getPointAtLength(offset);
        return new DOMPoint(p.x, p.y).matrixTransform(ctm);
      };
      const distance = (p, element) => {
        const stage = element.closest('.scene-node') || element.closest('.slot') || element;
        const r = stage.getBoundingClientRect();
        return Math.hypot(Math.max(r.left - p.x, 0, p.x - r.right),
          Math.max(r.top - p.y, 0, p.y - r.bottom));
      };
      const end = point(length);
      const headCovered = [...document.querySelectorAll('.studio-flow-badge')].some(badge => {
        const r = badge.getBoundingClientRect();
        return r.width && r.height && end.x > r.left + 2 && end.x < r.right - 2 && end.y > r.top + 2 && end.y < r.bottom - 2;
      });
      return {
        valid: length > 8,
        stroke: parseFloat(style.strokeWidth),
        arrow: style.markerEnd !== 'none',
        startDistance: distance(point(0), document.getElementById(from)),
        endDistance: distance(point(length), document.getElementById(to)),
        targetMarked: !!document.getElementById(to).closest('.studio-flow-current'),
        headCovered,
      };
    }, { from, to });
    assert.ok(graphics.valid, id + ' has a drawn route');
    assert.ok(graphics.stroke >= 3, id + ' route must stand out from inactive arrows');
    assert.ok(graphics.arrow, id + ' route has a directional arrowhead');
    assert.ok(graphics.startDistance <= 48, id + ' route starts at its source: ' + graphics.startDistance);
    assert.ok(graphics.endDistance <= 48, id + ' route ends at its destination: ' + graphics.endDistance);
    assert.ok(graphics.targetMarked, id + ' destination has current-step emphasis');
    assert.equal(graphics.headCovered, false, id + ' arrowhead must stay visible outside the focus badge');
  }
  try {
    await page.goto(process.env.MEMORY_DEMO_URL || 'http://127.0.0.1:8080');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForSelector('#x-flow .studio-flow-action', { state: 'attached' });

    await check('Every model opens with its first operation clearly identified', async () => {
      await page.click(tabs.b); await page.click('#b-reset');
      assert.equal(await page.locator('#b-flow .box').first().getAttribute('data-processing'), 'true');
      assert.equal(await page.locator('#studio-b-to-ram').getAttribute('data-active'), 'false');
      assert.match(await page.locator('#b-flow .studio-b-focus-badge').innerText(), /BƯỚC\s*1\s*Bắt đầu tại đây/i);
      assert.equal(await page.locator('#b-options').getAttribute('open'), null);
      assert.equal(await page.locator('#b-mode-check').isVisible(), false);
      for (const id of ['b-base', 'b-limit', 'b-addr', 'b-go']) assert.equal(await page.locator('#' + id).isVisible(), true);
      for (const id of ['a', 'x', 'v', 'r']) {
        await page.click(tabs[id]); await seek(id, 0);
        const root = page.locator(roots[id]);
        const host = id === 'r' ? root.locator('..') : root;
        assert.equal(await root.locator('.studio-flow-current').count(), 1, id + ' one current operation');
        assert.equal((await host.locator('.studio-flow-step').innerText()).trim(), '1');
        assert.match(await host.locator('.studio-flow-action').innerText(), /BẮT ĐẦU TẠI ĐÂY/);
      }
      await page.click(tabs.b); await shot('demo1-first');
    });

    await check('Denied access never activates RAM and restores exactly when stepping backward', async () => {
      await openBOptions();
      for (const preset of ['#b-pre-under', '#b-pre-over']) {
        await page.click(preset); const events = await trace('b');
        await seek('b', 3);
        assert.equal(await page.locator('#studio-b-to-ram').getAttribute('data-active'), 'false');
        assert.equal(await page.locator('#studio-b-to-os').getAttribute('data-active'), 'true');
        assert.equal(await page.locator('#studio-b-route').getAttribute('data-from'), preset.endsWith('under') ? 'studio-b-lower' : 'studio-b-upper');
        assert.equal(await page.locator('#studio-b-route').getAttribute('data-to'), 'studio-b-os');
        await page.click('#b-prev'); assert.deepEqual(await snap('b'), events[2].state);
        await page.click('#b-next'); assert.deepEqual(await snap('b'), events[3].state);
        assert.equal(await page.locator('#studio-b-to-os').getAttribute('data-active'), 'true');
      }
      await shot('demo1-denied');
    });

    await check('Paging refill returns from the page table to TLB, then reads RAM back to CPU', async () => {
      await page.click(tabs.x); await page.selectOption('#x-scenario', '1');
      const events = await trace('x');
      const refill = events.findIndex(e => e.title.startsWith('Điền'));
      assert.ok(refill > 0); await seek('x', refill);
      await route('x', 'x-pt-focus', 'x-tlb'); await shot('demo3-refill');
      const read = events.findIndex(e => e.kind === 'read'); await seek('x', read);
      const state = await snap('x'); await route('x', 'x-frame-' + state.plan.f, 'x-cpu');
      assert.equal(state.pt[state.plan.p], state.plan.f);
    });

    await check('A warm TLB hit skips the page table and connects TLB directly to address formation', async () => {
      await page.click('#x-go'); const events = await trace('x');
      assert.equal(events.some(e => e.title.startsWith('Tra bảng')), false);
      const physical = events.findIndex(e => e.title.startsWith('Tạo địa chỉ'));
      await seek('x', physical); assert.equal((await snap('x')).plan.hit, true);
      await route('x', 'x-tlb', 'x-pa');
      assert.equal(await page.locator('#x-pt-focus.scene-skipped').count(), 1);
      await shot('demo3-hit');
    });

    await check('Demand paging reverses the data direction between dirty write-back and page-in', async () => {
      await page.click(tabs.v); await page.selectOption('#v-scenario', '1');
      const events = await trace('v');
      const write = events.findIndex(e => e.kind === 'page-out');
      assert.ok(write > 0); await seek('v', write); let state = await snap('v');
      await route('v', 'v-frame-' + state.plan.chosenFrame, 'v-store');
      assert.equal(state.ram[state.plan.chosenFrame], state.plan.victim, 'dirty write does not install the incoming page');
      await shot('demo4-write-back');
      const load = events.findIndex(e => e.kind === 'page-in'); await seek('v', load); state = await snap('v');
      await route('v', 'v-store', 'v-frame-' + state.plan.chosenFrame);
      assert.equal(state.ram[state.plan.chosenFrame], state.page);
      assert.equal(state.pt[state.page].present, false, 'PTE commit remains a separate later operation');
      const read = events.findIndex(e => e.kind === 'read'); await seek('v', read); state = await snap('v');
      await route('v', 'v-frame-' + state.plan.chosenFrame, 'v-cpu');
    });

    await check('FIFO emphasizes the oldest load while selection still leaves the old page in RAM', async () => {
      await page.click(tabs.r); await page.locator('#r-alg [data-a="FIFO"]').click();
      const events = await trace('r'), victim = events.findIndex(e => e.state.runtime.phase === 'victim');
      assert.ok(victim > 0); await seek('r', victim); const state = await snap('r');
      assert.equal(state.runtime.fr[state.runtime.slot], state.runtime.victim);
      assert.equal(state.runtime.load[state.runtime.slot], Math.min(...state.runtime.load));
      await route('r', 'r-evidence', 'r-frame-' + state.runtime.slot);
      assert.match(await page.locator('#r-evidence').innerText(), /sớm nhất|cũ nhất|đầu tiên/);
      await shot('demo5-fifo-selection');
      await page.click('#r-next'); assert.deepEqual(await snap('r'), events[victim + 1].state);
      assert.equal((await snap('r')).runtime.fr[state.runtime.slot], state.refs[state.runtime.t]);
      await route('r', 'studio-r-store', 'r-frame-' + state.runtime.slot);
      await page.click('#r-prev'); assert.deepEqual(await snap('r'), events[victim].state);
      await route('r', 'r-evidence', 'r-frame-' + state.runtime.slot);
    });

    await check('Clock shows the inspected frame, then moves the hand without replacing a page', async () => {
      await page.locator('#r-alg [data-a="CLOCK"]').click();
      const events = await trace('r');
      const inspect = events.findIndex(e => e.state.runtime.phase === 'inspect');
      const clear = events.findIndex(e => e.state.runtime.phase === 'clear');
      assert.ok(inspect > 0 && clear > inspect);
      await seek('r', inspect); let state = await snap('r');
      await route('r', 'r-evidence', 'r-frame-' + state.runtime.ptr);
      await seek('r', clear); state = await snap('r');
      const old = events[clear].beforeState.runtime;
      assert.equal(state.runtime.bit[old.ptr], 0);
      assert.deepEqual(state.runtime.fr, old.fr, 'clearing a bit does not change RAM contents');
      await route('r', 'r-frame-' + old.ptr, 'r-frame-' + state.runtime.ptr);
      await shot('demo5-clock-clear');
      await page.setViewportSize({ width: 390, height: 844 }); await seek('r', clear);
      await route('r', 'r-frame-' + old.ptr, 'r-frame-' + state.runtime.ptr);
      const crossesCard = await page.locator('.studio-flow-overlay[data-kind="clock"] .studio-flow-line').evaluate(line => {
        const ctm = line.getScreenCTM(), length = line.getTotalLength();
        const boxes = [...document.querySelectorAll('#r-slots .card')].map(e => e.getBoundingClientRect());
        for (let i = 1; i < 100; i++) {
          const p = line.getPointAtLength(length * i / 100), point = new DOMPoint(p.x, p.y).matrixTransform(ctm);
          if (boxes.some(r => point.x > r.left + 6 && point.x < r.right - 6 && point.y > r.top + 6 && point.y < r.bottom - 6)) return true;
        }
        return false;
      });
      assert.equal(crossesCard, false, 'the mobile Clock route must use a gutter instead of crossing page numbers');
      await shot('demo5-clock-mobile'); await page.setViewportSize({ width: 1366, height: 1000 });
      await page.locator('#r-alg [data-a="FIFO"]').click();
    });

    await check('Light/dark, resize and reduced motion retain destinations and snapshots', async () => {
      const cases = [['x', 'x-pt-focus', 'x-tlb'], ['v', 'v-store', null], ['r', 'r-evidence', null]];
      for (const theme of ['light', 'dark']) {
        await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
        for (const width of [1366, 850, 390, 375]) {
          await page.setViewportSize({ width, height: width <= 390 ? 844 : 1000 });
          for (const [id, from] of cases) {
            await page.click(tabs[id]);
            if (id === 'x') await page.selectOption('#x-scenario', '1');
            const events = await trace(id);
            const step = id === 'x' ? events.findIndex(e => e.title.startsWith('Điền'))
              : id === 'v' ? events.findIndex(e => e.kind === 'page-in')
              : events.findIndex(e => e.state.runtime.phase === 'victim');
            await seek(id, step); const before = await snap(id);
            const to = id === 'x' ? 'x-tlb' : id === 'v' ? 'v-frame-' + before.plan.chosenFrame : 'r-frame-' + before.runtime.slot;
            await route(id, from, to);
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), theme + '/' + width + '/' + id);
            if (width <= 390) {
              const panel = id === 'r' ? '#p3' : id === 'v' ? '#p4' : '#p2';
              const titleWidth = await page.locator(panel + ' .stage h2').first().evaluate(e => e.getBoundingClientRect().width);
              assert.ok(titleWidth >= width * .7, id + ' mobile title must not be squeezed into a narrow column');
            }
            assert.deepEqual(await snap(id), before);
            if (theme === 'light' && width === 390) await shot('mobile-' + id);
          }
        }
      }
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const before = await snap('r'), cursor = await page.evaluate(() => MemoryTeaching.position('r').cursor);
      await seek('r', cursor);
      assert.deepEqual(await snap('r'), before);
      const animations = await page.locator('.studio-flow-overlay path').evaluateAll(es => es.map(e => getComputedStyle(e).animationName));
      assert.ok(animations.every(name => name === 'none'));
    });

    if (process.env.MEMORY_AXE_PATH) {
      await page.addScriptTag({ path: process.env.MEMORY_AXE_PATH });
      await check('Automated WCAG A/AA checks cover highlighted operations in both themes', async () => {
        await page.setViewportSize({ width: 1366, height: 1000 });
        for (const theme of ['light', 'dark']) {
          await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
          for (const id of ['b', 'a', 'x', 'v', 'r']) {
            await page.click(tabs[id]);
            const report = await page.evaluate(() => axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
            const result = { theme, id, violations: report.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) };
            accessibility.push(result); assert.deepEqual(result.violations, [], theme + '/' + id);
          }
        }
      });
    }
    assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ passed: checks.length, checks, errors, failedAssets, accessibility }, null, 2));
    console.log(JSON.stringify({ passed: checks.length, errors, failedAssets, artifacts: out }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
