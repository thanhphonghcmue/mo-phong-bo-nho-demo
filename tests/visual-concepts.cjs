const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium', args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:1366,height:1000}});
  const errors=[]; page.on('pageerror', e=>errors.push(e.message));
  const snapshot = id=>page.evaluate(id=>MemoryTeaching.snapshot(id),id);
  const open = async id=>{
    await page.locator('#'+id+'-concepts').evaluate(e=>e.open=true);
    await page.waitForFunction(id=>document.querySelector('#'+id+'-concepts .concept-card'),id);
  };
  try {
    await page.goto(process.env.MEMORY_DEMO_URL || 'http://127.0.0.1:8080');
    for(const [tab,id] of [['t0','b'],['t1','f'],['t2','x'],['t4','v'],['t3','r']]) {
      await page.click('#'+tab);
      const panel=page.locator('#'+id+'-concepts');
      assert.equal(await panel.evaluate(e=>e.open),false);
      assert.equal(await panel.evaluate(e=>e.previousElementSibling.className),'teach-history');
      const before=await snapshot(id); await open(id);
      assert.deepEqual(await snapshot(id),before);
      await panel.locator('.concept-more').evaluate(e=>e.open=true);
      assert.ok(await panel.locator('.concept-card').count()>=8);
      await page.locator('#'+id+'-next').evaluate(e=>e.click());
      assert.equal(await panel.locator('.concept-more').evaluate(e=>e.open),true);
      await page.locator('#'+id+'-prev').evaluate(e=>e.click());
      assert.deepEqual(await snapshot(id),before);
      console.log('PASS',id,'placement, folding, terminology, immutable snapshots and rewind');
    }
    await page.click('#t1'); await page.locator('#a-mode [data-m="ex"]').click(); await open('a');
    assert.match(await page.locator('#a-concepts .concept-example').innerText(),/Tổng trống/);
    await page.click('#t2');
    await page.click('#x-default');
    let text=await page.locator('#x-concepts').innerText();
    assert.match(text,/10000/); assert.match(text,/p = 2, d = 1808/); assert.match(text,/5 × 4096 \+ 1808 = 22288/);
    assert.match(text,/không có Page Fault/);
    await page.click('#x-textbook');
    text=await page.locator('#x-concepts').innerText(); assert.match(text,/2 × 4 \+ 1 = 9/);
    console.log('PASS translation examples follow the applied problem');
    await page.click('#t4'); await page.click('#v-permission');
    assert.match(await page.locator('#v-concepts').innerText(),/Chặn/);
    assert.doesNotMatch(await page.locator('#v-concepts .concept-flow').allTextContents().then(x=>x.join(' ')),/OS yêu cầu nạp/);
    await page.click('#t3'); await page.locator('#r-alg [data-a="CLOCK"]').click();
    assert.equal(await page.locator('#r-concepts .concept-clock-slot').count(),(await snapshot('r')).n);
    for(const width of [1366,768,390]) {
      await page.setViewportSize({width,height:1000});
      for(const [tab,id] of [['t0','b'],['t1','f'],['t2','x'],['t4','v'],['t3','r']]) {
        await page.click('#'+tab); await open(id);
        assert.ok(await page.locator('#'+id+'-concepts').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'overflow '+id+' '+width);
      }
    }
    await page.click('#theme-toggle');
    assert.deepEqual(errors,[]);
    fs.mkdirSync('/workspace/artifacts/visual-concepts',{recursive:true});
    await page.setViewportSize({width:1366,height:1000}); await page.click('#t2');
    await page.waitForTimeout(250);
    await page.locator('#x-concepts').screenshot({path:'/workspace/artifacts/visual-concepts/demo3-dark.png'});
    await page.click('#theme-toggle');
    await page.waitForTimeout(250);
    await page.locator('#x-concepts').screenshot({path:'/workspace/artifacts/visual-concepts/demo3-light.png'});
    console.log('PASS permission branch, Clock circle, responsive layouts and no browser errors');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
