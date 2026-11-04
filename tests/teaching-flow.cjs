// Run with a static server at http://127.0.0.1:8080.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [], checks = [];
  const artifactDir = process.env.MEMORY_ARTIFACT_DIR || '/tmp/memory-teaching-flow';
  fs.mkdirSync(artifactDir, { recursive: true });
  page.on('pageerror', e => errors.push(e.message));
  const snap = id => page.evaluate(id => MemoryTeaching.snapshot(id), id);
  const event = id => page.evaluate(id => MemoryTeaching.event(id), id);
  const text = id => page.locator('#' + id + '-cap .teach-deep-content').innerText();
  const next = id => page.locator('#' + id + '-next').evaluate(b => b.click());
  async function finish(id) {
    let guard = 0;
    while (!await page.locator('#' + id + '-next').isDisabled() && guard++ < 400) await next(id);
    assert.ok(guard < 400, 'trace terminates: ' + id);
  }
  async function seek(id, title) {
    let guard = 0;
    while (!(await event(id)).title.includes(title) && guard++ < 400) {
      assert.equal(await page.locator('#' + id + '-next').isDisabled(), false, title);
      await next(id);
    }
    assert.ok(guard < 400);
  }
  async function target(root, expected) {
    const ids = await page.locator(root + ' [data-processing="true"]').evaluateAll(els => els.map(e => e.id || e.dataset.process));
    assert.deepEqual(ids, [expected]);
  }
  async function wireLandsOnActive(root) {
    assert.ok(await page.locator(root).evaluate(root => {
      const svg = root.querySelector('svg.teach-wire'), active = root.querySelector('[data-processing]');
      const values = svg.querySelector(':scope > path').getAttribute('d').match(/-?[\d.]+/g).map(Number);
      let p = svg.createSVGPoint(); p.x = values.at(-2); p.y = values.at(-1);
      p = p.matrixTransform(svg.getScreenCTM()); const r = active.getBoundingClientRect();
      return p.x >= r.left - 2 && p.x <= r.right + 2 && p.y >= r.top - 2 && p.y <= r.bottom + 2;
    }), 'arrow endpoint must match the active block after a layout change');
  }
  async function config(id, values) {
    await page.locator('#' + id + '-config').evaluate(d => d.open = true);
    const advanced = page.locator('#' + id + '-config .teach-advanced-config');
    if (await advanced.count()) await advanced.evaluate(d => d.open = true);
    for (const [key, val] of Object.entries(values)) {
      const input = page.locator('#' + key);
      if (await input.evaluate(e => e.tagName === 'SELECT')) await input.selectOption(String(val));
      else await input.fill(String(val));
    }
    await page.click('#' + id + '-config-apply');
    assert.doesNotMatch(await page.locator('#' + id + '-config .teach-config-status').innerText(), /nhập|cần đúng|vượt RAM/i);
    await page.locator('#' + id + '-config').evaluate(d => d.open = false);
  }
  async function shot(name) {
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(artifactDir, name + '.png'), fullPage: true });
  }
  async function check(name, run) {
    await run(); checks.push(name); console.log('PASS', name);
  }
  try {
    await page.goto(process.env.MEMORY_DEMO_URL || 'http://127.0.0.1:8080', { waitUntil: 'domcontentloaded' });
    await check('Base/Limit: physical label, logical relocation, negative input and snapshot', async () => {
      assert.match(await page.locator('#b-flow .formula').first().innerText(), /Địa chỉ vật lý cần kiểm tra/);
      assert.match(await text('b'), /địa chỉ vật lý đầu vào/);
      for (let i = 0; i < 4; i++) {
        assert.equal(await page.locator('#b-flow .box').nth(i).getAttribute('data-processing'), 'true');
        if (i < 3) await next('b');
      }
      await page.click('#b-mode-trans');
      await finish('b');
      assert.equal((await snap('b')).pa, 14346);
      assert.match(await text('b'), /không nhận L=346/);
      await page.fill('#b-addr', '-5'); await page.click('#b-go'); await finish('b');
      assert.equal((await snap('b')).isValid, false);
      assert.equal((await snap('b')).pa, null);
      assert.match(await page.locator('#b-cap').innerText(), /trap bảo vệ/);
      await page.click('#b-prev'); const before = await snap('b');
      await next('b'); await page.click('#b-prev'); assert.deepEqual(await snap('b'), before);
      await page.click('#b-mode-check');
      await page.click('#b-pre-under'); await next('b'); await next('b');
      assert.match(await text('b'), /Cận dưới đã vi phạm/);
    });
    await check('Paging: exact destinations, TLB Miss without fault, warm Hit and textbook 13 → 9', async () => {
      await page.click('#t2'); await page.click('#x-default');
      assert.equal(await page.locator('#x-flow .teach-layout-x [data-frame]').count(), 0, 'do not reveal the frame before translation');
      const sequence = ['x-cpu', 'x-mmu', 'x-tlb', 'x-pt-focus', 'x-tlb', 'x-pa', 'x-frame-5'];
      for (let i = 0; i < sequence.length; i++) {
        await target('#x-flow', sequence[i]);
        if (i === 2) assert.match(await text('x'), /TLB Miss chỉ có nghĩa/);
        if (i === 3) {
          assert.match(await text('x'), /không gây Page Fault/);
          assert.equal(await page.locator('#x-flow .teach-layout-x [data-frame]').count(), 1);
        }
        if (i < sequence.length - 1) await next('x');
      }
      assert.equal((await snap('x')).plan.phys, 22288); assert.equal((await snap('x')).faults, 0);
      const beforeDetails = await snap('x');
      await page.locator('#p2 .demo-controls-bar .toggle-explain-btn').click();
      await wireLandsOnActive('#x-flow'); assert.deepEqual(await snap('x'), beforeDetails);
      await page.locator('#p2 .demo-controls-bar .toggle-explain-btn').click();
      await page.locator('#x-memory-details').evaluate(d => d.open = true);
      assert.equal(await page.locator('#x-memory-details [data-overview-frame]').count(), 16);
      assert.deepEqual(await snap('x'), beforeDetails, 'viewing full memory must not mutate it');
      await page.click('#x-go');
      assert.equal(await page.locator('#x-memory-details').evaluate(d => d.open), true, 'keep the chosen display option while stepping');
      await page.locator('#x-memory-details').evaluate(d => d.open = false);
      await seek('x', 'Tra TLB');
      assert.match(await text('x'), /TLB Hit/); assert.doesNotMatch(await text('x'), /TLB Miss/);
      assert.equal((await snap('x')).plan.hit, true);
      assert.ok(await page.locator('#x-pt-focus').evaluate(e => e.classList.contains('teach-bypassed')));
      await next('x'); await target('#x-flow', 'x-pa');
      await page.click('#x-textbook'); await finish('x');
      const s = await snap('x'); assert.equal(s.plan.p, 3); assert.equal(s.plan.d, 1); assert.equal(s.plan.phys, 9);
      await target('#x-flow', 'x-frame-2'); await shot('demo3-frame-highlight');
    });
    await check('Paging: full RAM stops at OS with no PA or RAM mutation', async () => {
      await page.fill('#x-addr', '4');
      await config('x', { 'x-c-size': 4, 'x-c-pages': 2, 'x-c-frames': 1, 'x-c-tlb': 1, 'x-c-pt': '0, -', 'x-c-cache': '', 'x-c-other': '' });
      const before = (await snap('x')).pt; await finish('x');
      assert.equal((await snap('x')).plan.blocked, true);
      assert.deepEqual((await snap('x')).pt, before);
      await target('#x-flow', 'x-os'); assert.match(await text('x'), /chưa có PA hợp lệ/);
      await page.click('#x-default');
    });
    await check('Demand paging: six events, post-I/O PTE commit, reverse and clickable history', async () => {
      await page.click('#t4'); await page.click('#v-reset');
      assert.equal(await page.locator('#v-flow .teach-layout-v [data-frame]').count(), 0, 'OS has not chosen a frame yet');
      const destinations = ['v-cpu', 'v-os', 'v-store', 'v-frame-1', 'v-pt-focus', 'v-cpu'];
      for (let i = 0; i < destinations.length; i++) {
        await target('#v-flow', destinations[i]);
        if (i === 1) assert.match(await text('v'), /trap chưa đọc trang/);
        if (i === 3) {
          const s = await snap('v'); assert.equal(s.ram[1], 3); assert.equal(s.pt[3].present, false); assert.equal(s.reads, 1);
          assert.equal(await page.locator('#v-flow .teach-layout-v [data-frame]').count(), 1);
          assert.match(await text('v'), /chưa được đánh dấu hiện diện/);
        }
        if (i === 4) assert.equal((await snap('v')).pt[3].present, true);
        if (i < 5) await next('v');
      }
      assert.match(await text('v'), /không cộng thêm lỗi trang/);
      await page.click('#v-hist-toggle');
      await page.locator('#p4 .teach-history button[data-step="3"]').click();
      await target('#v-flow', 'v-frame-1'); assert.equal((await snap('v')).pt[3].present, false);
      const before = await snap('v'); await next('v'); await page.click('#v-prev');
      assert.deepEqual(await snap('v'), before);
      await page.locator('#p4 .demo-controls-bar .toggle-explain-btn').click();
      await wireLandsOnActive('#v-flow'); assert.deepEqual(await snap('v'), before);
      await page.locator('#p4 .demo-controls-bar .toggle-explain-btn').click();
      await page.locator('#v-memory-details').evaluate(d => d.open = true);
      assert.equal(await page.locator('#v-memory-details [data-overview-frame]').count(), 8);
      assert.deepEqual(await snap('v'), before);
      await next('v');
      assert.equal(await page.locator('#v-memory-details').evaluate(d => d.open), true);
      await page.locator('#v-memory-details').evaluate(d => d.open = false);
      await shot('demo4-pte-update');
    });
    await check('Demand paging: dirty writes are separate, Hit and denied access do not page-in', async () => {
      await page.click('#v-full-dirty'); await seek('v', 'Ghi lại trang dirty');
      await target('#v-flow', 'v-store'); assert.equal((await snap('v')).writes, 1); assert.equal((await snap('v')).reads, 0);
      assert.match(await text('v'), /chưa nạp trang/); await next('v'); await target('#v-flow', 'v-frame-0');
      assert.equal((await snap('v')).reads, 1); assert.equal((await snap('v')).pt[3].present, false);
      await finish('v'); await page.click('#v-pre-hit'); await seek('v', 'Page Hit');
      assert.match(await text('v'), /Không có trap Page Fault/);
      const hits = await snap('v'); await finish('v'); assert.equal((await snap('v')).reads, hits.reads);
      await page.click('#v-permission'); await finish('v');
      await target('#v-flow', 'v-os'); assert.equal((await snap('v')).reads, 0); assert.equal((await snap('v')).faults, 0);
      assert.match(await text('v'), /không phải thiếu trang hợp lệ/);
      await page.click('#v-reset');
    });
    await check('Allocator: arrow terminates on G at 770 KB, compaction preserves total free', async () => {
      await page.click('#t1'); await page.locator('#a-mode [data-m="free"]').click(); await page.click('#f-reset');
      let prior, sawCompact = false;
      while (!await page.locator('#f-next').isDisabled()) {
        prior = await snap('f'); await next('f');
        if ((await event('f')).title === 'Dồn nén RAM') {
          const free = s => s.segs.filter(p => !p.name).reduce((n, p) => n + p.size, 0);
          assert.equal(free(await snap('f')), free(prior));
          assert.match(await text('f'), /tái định vị động/); sawCompact = true;
        }
      }
      assert.ok(sawCompact);
      await target('#f-lane', 'G');
      assert.equal(await page.locator('#f-lane .teach-wire').getAttribute('data-to'), '770');
      const point = await page.locator('#f-lane').evaluate(root => {
        const r = root.getBoundingClientRect();
        const target = root.querySelector('[data-processing]'); const b = target.getBoundingClientRect();
        const numbers = root.querySelector('.teach-wire > path').getAttribute('d').match(/-?[\d.]+/g).map(Number);
        return { x: numbers.at(-2) + r.left, y: numbers.at(-1) + r.top, l: b.left, t: b.top, r: b.right, b: b.bottom };
      });
      assert.ok(point.x >= point.l - 1 && point.x <= point.r + 1 && point.y >= point.t - 1 && point.y <= point.b + 1);
      await shot('demo2-g-highlight');
      await page.locator('#a-mode [data-m="ex"]').click(); await page.locator('#a-alg [data-a="best"]').click();
      await seek('a', 'xét Lỗ'); assert.match(await text('a'), /Best-fit.*nhỏ nhất/);
      await finish('a');
    });
    await check('Replacement: all four totals, Clock bit/pointer narration and restored highlight', async () => {
      await page.click('#t3');
      for (const [alg, count] of [['FIFO', 15], ['LRU', 12], ['OPT', 9], ['CLOCK', 14]]) {
        await page.locator('#r-alg [data-a="' + alg + '"]').click();
        let guard = 0, sawClear = false, sawHit = false;
        while (!await page.locator('#r-next').isDisabled() && guard++ < 200) {
          await next('r'); const s = await snap('r'), e = await event('r');
          if (alg === 'CLOCK' && s.runtime.phase === 'clear') {
            const old = e.beforeState.runtime.ptr;
            assert.equal(s.runtime.bit[old], 0);
            assert.match(await page.locator('.teach-clock-step-desc').innerText(), new RegExp('Khung ' + old + ': 1 → 0'));
            await target('#r-scene', 'r-frame-' + s.runtime.ptr); sawClear = true;
          }
          if (alg === 'CLOCK' && e.kind === 'read') {
            assert.equal(s.runtime.ptr, e.beforeState.runtime.ptr);
            assert.match(await page.locator('.teach-clock-step-desc').innerText(), /Kim giữ tại/); sawHit = true;
          }
        }
        assert.ok(guard < 200); assert.equal((await snap('r')).runtime.faults, count);
        if (alg === 'CLOCK') assert.ok(sawClear && sawHit);
      }
      await page.click('#r-prev'); const prior = await snap('r'); await next('r'); await page.click('#r-prev');
      assert.deepEqual(await snap('r'), prior); await shot('demo5-clock-highlight');
    });
    await check('Display: large text, small screens, dark mode, reduced motion and unchanged snapshots', async () => {
      for (const width of [1366, 1024, 768, 390]) {
        await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(150);
        for (const [tab, id] of [['t0', 'b'], ['t1', 'a'], ['t2', 'x'], ['t4', 'v'], ['t3', 'r']]) {
          await page.click('#' + tab);
          const cap = page.locator('#' + id + '-cap');
          assert.equal(await cap.locator('.teach-deep-content').evaluate(e => getComputedStyle(e).fontSize), '18px');
          const fit = await cap.evaluate(e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 1 && e.scrollWidth <= e.clientWidth + 1; });
          assert.ok(fit, 'caption fit ' + width + '/' + id);
          if (['x', 'v'].includes(id)) {
            assert.ok(await page.locator('#' + id + '-flow').evaluate(e => { const r = e.getBoundingClientRect(); return e.clientWidth > 0 && r.right <= innerWidth + 1 && e.scrollWidth <= e.clientWidth + 1; }), 'diagram fit ' + width + '/' + id);
          }
        }
      }
      await page.setViewportSize({ width: 1366, height: 768 }); await page.click('#t2'); await page.click('#x-reset');
      const before = await snap('x');
      const pathOption = page.locator('#p2 [data-option="path"]'); await pathOption.uncheck();
      assert.deepEqual(await snap('x'), before);
      assert.equal(await page.locator('#x-flow [data-processing]').count(), 1); await pathOption.check();
      await page.emulateMedia({ reducedMotion: 'reduce' }); await next('x');
      assert.equal(await page.locator('#x-mmu').evaluate(e => getComputedStyle(e).animationName), 'none');
      assert.notEqual(await page.locator('#x-mmu').evaluate(e => getComputedStyle(e).boxShadow), 'none');
      await page.click('#theme-toggle'); assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      await shot('demo3-dark-highlight');
    });
    await check('Autoplay pauses without further steps or duplicated events', async () => {
      await page.click('#t4'); await page.click('#v-reset');
      const count = await page.evaluate(() => MemoryTeaching.trace('v').length);
      await page.click('#v-play'); await page.waitForTimeout(1550); await page.click('#v-play');
      const paused = await snap('v'); await page.waitForTimeout(1400);
      assert.deepEqual(await snap('v'), paused);
      assert.equal(await page.evaluate(() => MemoryTeaching.trace('v').length), count);
      assert.deepEqual(errors, []);
    });
    console.log(JSON.stringify({ passed: checks.length, errors, artifacts: artifactDir }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
