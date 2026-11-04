const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = [], checks = [];
  page.on('pageerror', e => errors.push(e.message));
  const snap = id => page.evaluate(id => MemoryTeaching.snapshot(id), id);
  const next = id => page.locator('#' + id + '-next').evaluate(b => b.click());
  const keyword = id => page.locator('#' + id + '-conclusion strong').textContent().then(s => s.toUpperCase());
  async function finish(id) {
    let count = 0;
    while (!await page.locator('#' + id + '-next').isDisabled() && count++ < 400) await next(id);
    assert.ok(count < 400);
  }
  async function open(id) { await page.locator('#' + id + '-config').evaluate(e => e.open = true); }
  async function close(id) { await page.locator('#' + id + '-config').evaluate(e => e.open = false); }
  async function check(name, run) { await run(); checks.push(name); console.log('PASS', name); }
  try {
    await page.goto(process.env.MEMORY_DEMO_URL || 'http://127.0.0.1:8080', { waitUntil: 'domcontentloaded' });
    await check('One meaningful pillar per demo; no conclusions before running', async () => {
      assert.deepEqual(await page.locator('.teach-pillar > span').allTextContents(), ['AN TOÀN', 'HIỆU QUẢ', 'HIỆU QUẢ', 'KHÔNG GIỚI HẠN', 'KHÔNG GIỚI HẠN']);
      assert.equal(await page.locator('.teach-pillar svg').count(), 5);
      for (const id of ['b', 'f', 'a', 'x', 'v', 'r']) assert.equal(await page.locator('#' + id + '-conclusion').evaluate(e => e.hidden), true);
      assert.match(await page.locator('#t4 .teach-pillar').getAttribute('title'), /vẫn có giới hạn/);
    });
    await check('Paging: two-field example, actual origins of p/d/frame, persistent terminology', async () => {
      await page.click('#t2'); await open('x');
      assert.equal(await page.locator('#x-config .teach-advanced-config').evaluate(e => e.open), false);
      await page.click('#x-easy-example');
      assert.equal(await page.locator('#x-config').evaluate(d => d.open), false, 'successful quick input returns directly to the model');
      await close('x');
      let s = await snap('x'); assert.equal(s.plan.addr, 13); assert.equal(s.pageSize, 4); assert.equal(s.pt[3], 2);
      assert.equal(await page.locator('#x-conclusion').evaluate(e => e.hidden), true);
      await next('x'); s = await snap('x'); assert.equal(s.plan.p, 3); assert.equal(s.plan.d, 1);
      assert.match(await page.locator('#x-mmu').innerText(), /13 ÷ 4 = 3, dư 1/);
      await page.locator('#x-cap .teach-terms summary').click();
      assert.match(await page.locator('#x-cap .teach-terms').innerText(), /phần dư/);
      const before = await snap('x'); await page.locator('#x-cap .teach-terms summary').click(); assert.deepEqual(await snap('x'), before);
      await page.locator('#x-cap .teach-terms summary').click(); await next('x');
      assert.equal(await page.locator('#x-cap .teach-terms').evaluate(e => e.open), true);
      await finish('x'); assert.equal((await snap('x')).plan.phys, 9);
      assert.equal(await keyword('x'), 'TLB MISS ≠ PAGE FAULT');
      assert.match(await page.locator('#x-frame-2').innerText(), /Tìm được từ bảng trang/);
      await open('x'); await page.fill('#x-easy-addr', '15'); await page.click('#x-easy-apply'); await close('x');
      await finish('x'); assert.equal((await snap('x')).plan.phys, 11);
      const valid = await snap('x'), position = await page.evaluate(() => MemoryTeaching.position('x'));
      await open('x'); await page.fill('#x-easy-size', '3'); await page.click('#x-easy-apply');
      assert.ok(await page.locator('#x-config .teach-easy-status').evaluate(e => e.classList.contains('teach-error')));
      assert.equal(await page.locator('#x-config').evaluate(d => d.open), true, 'invalid input stays open for correction');
      assert.deepEqual(await snap('x'), valid); assert.deepEqual(await page.evaluate(() => MemoryTeaching.position('x')), position);
      assert.equal(await page.locator('#x-c-size').inputValue(), '4');
      await page.fill('#x-easy-addr', '0'); await page.fill('#x-easy-size', '1'); await page.click('#x-easy-apply'); await close('x');
      await finish('x'); s = await snap('x'); assert.equal(s.plan.p, 0); assert.equal(s.plan.d, 0); assert.equal(s.plan.phys, 5);
    });
    await check('Demand paging: easy sequence, finite-memory explanation and non-stale result', async () => {
      await page.click('#t4'); await open('v'); await page.click('#v-easy-example'); await close('v');
      assert.equal((await snap('v')).ram.length, 2); assert.deepEqual((await snap('v')).ram, [null, null]);
      await page.locator('#v-cap .teach-terms summary').click(); assert.match(await page.locator('#v-cap .teach-terms').innerText(), /thực tế vẫn hữu hạn/);
      await finish('v'); let s = await snap('v'); assert.equal(s.faults, 2); assert.equal(s.hits, 1); assert.equal(s.reads, 2);
      assert.equal(await keyword('v'), 'DEMAND PAGING');
      await page.click('#v-full-dirty'); await finish('v'); assert.equal(await keyword('v'), 'DIRTY BIT');
      await page.click('#v-pre-hit'); assert.equal(await page.locator('#v-conclusion').evaluate(e => e.hidden), true);
      await finish('v'); assert.equal(await keyword('v'), 'PAGE HIT', 'old dirty I/O must not describe a new hit-only run');
      await page.click('#v-permission'); await finish('v'); assert.equal(await keyword('v'), 'AN TOÀN');
      const before = await snap('v'); await open('v'); await page.fill('#v-easy-refs', '2 nope'); await page.click('#v-easy-apply');
      assert.deepEqual(await snap('v'), before); assert.match(await page.locator('#v-config .teach-easy-status').innerText(), /nhập số nguyên/);
      await page.click('#v-easy-example'); await close('v');
    });
    await check('Replacement: short sequence, no-victim cases and advanced initial RAM', async () => {
      await page.click('#t3'); await page.locator('#r-alg [data-a="FIFO"]').click(); await open('r'); await page.click('#r-easy-example'); await close('r');
      await finish('r'); assert.equal((await snap('r')).runtime.faults, 4); assert.equal(await keyword('r'), 'FIFO');
      await page.locator('#r-alg [data-a="CLOCK"]').click(); await finish('r'); assert.equal(await keyword('r'), 'CLOCK');
      await open('r'); await page.fill('#r-easy-refs', '1 2'); await page.click('#r-easy-apply'); await close('r');
      await finish('r'); assert.equal(await keyword('r'), 'KHUNG TRỐNG');
      await open('r'); await page.locator('#r-config .teach-advanced-config').evaluate(e => e.open = true);
      for (const [id, value] of Object.entries({ 'r-c-n': '2', 'r-c-refs': '1 2', 'r-c-ram': '1 2', 'r-c-bits': '1 1', 'r-c-order': '1 2', 'r-c-recent': '1 2', 'r-c-hand': '0' })) await page.fill('#' + id, value);
      await page.click('#r-config-apply'); await close('r'); await finish('r');
      assert.equal((await snap('r')).runtime.faults, 0); assert.equal(await keyword('r'), 'PAGE HIT');
    });
    await check('Conclusions in Demo 1 and both allocator modes; rewind/reset remove them', async () => {
      await page.click('#t0'); await page.click('#b-all'); assert.equal(await keyword('b'), 'AN TOÀN');
      await page.click('#b-prev'); assert.equal(await page.locator('#b-conclusion').evaluate(e => e.hidden), true);
      await page.click('#b-all'); const before = await snap('b');
      await page.locator('#p0 [data-option="explain"]').uncheck();
      assert.equal(await page.locator('#b-conclusion').isVisible(), true); assert.deepEqual(await snap('b'), before);
      await page.click('#b-reset'); assert.equal(await page.locator('#b-conclusion').textContent(), '');
      await page.click('#t1'); await page.locator('#a-mode [data-m="free"]').click(); await page.click('#f-reset'); await finish('f');
      assert.equal(await keyword('f'), 'DỒN NÉN');
      await page.click('#f-prev'); assert.equal(await page.locator('#f-conclusion').evaluate(e => e.hidden), true);
      await page.locator('#a-mode [data-m="ex"]').click(); await page.locator('#a-alg [data-a="first"]').click(); await finish('a');
      assert.equal(await keyword('a'), 'PHÂN MẢNH NGOÀI');
      await page.locator('#a-alg [data-a="best"]').click(); await finish('a'); assert.equal(await keyword('a'), 'BEST-FIT');
    });
    await check('New forms, vocabulary and result remain readable on mobile and dark mode', async () => {
      await page.click('#theme-toggle');
      for (const width of [1366, 768, 390]) {
        await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(150);
        for (const [tab, id] of [['t2', 'x'], ['t4', 'v'], ['t3', 'r']]) {
          await page.click('#' + tab); await open(id);
          for (const input of await page.locator('#' + id + '-config .teach-easy-form input').all()) assert.ok(await input.evaluate(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= innerWidth + 1; }));
          await close(id);
          assert.equal(await page.locator('#' + id + '-cap .teach-deep-content').evaluate(e => getComputedStyle(e).fontSize), '18px');
          await page.locator('#' + id + '-cap .teach-terms').evaluate(e => e.open = true);
          assert.ok(await page.locator('#' + id + '-cap').evaluate(e => e.scrollWidth <= e.clientWidth + 1));
        }
      }
      assert.deepEqual(errors, []);
    });
    console.log(JSON.stringify({ passed: checks.length, errors }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
