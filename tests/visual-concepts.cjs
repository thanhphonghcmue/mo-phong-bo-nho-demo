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
      assert.equal(await panel.locator('.concept-body h3').last().innerText(),'Luồng hoạt động (Workflow)');
      assert.ok(await panel.locator('.concept-body .concept-step-no').count()>=3);
      await panel.locator('.concept-more').evaluate(e=>e.open=true);
      assert.ok(await panel.locator('.concept-card').count()>=8);
      await page.locator('#'+id+'-next').evaluate(e=>e.click());
      assert.equal(await panel.locator('.concept-more').evaluate(e=>e.open),true);
      await page.locator('#'+id+'-prev').evaluate(e=>e.click());
      assert.deepEqual(await snapshot(id),before);
      console.log('PASS',id,'placement, folding, terminology, immutable snapshots and rewind');
    }
    await page.click('#t0'); await page.click('#b-mode-check'); await page.click('#b-pre-low');
    const baseResult=page.locator('#b-concepts .concept-body .concept-example');
    assert.equal(await baseResult.getAttribute('data-result'),'ok');
    assert.deepEqual(await page.locator('#b-concepts .concept-body .concept-step-no').allTextContents(),['1','2','3']);
    assert.match(await page.locator('#b-concepts').innerText(),/Số nhà đầu tiên/);
    await page.click('#b-pre-over'); assert.equal(await baseResult.getAttribute('data-result'),'trap');
    await page.click('#b-mode-trans');
    assert.match(await baseResult.innerText(),/14000 \+ 346 = 14346/);
    await page.click('#b-pre-t-under'); assert.equal(await baseResult.getAttribute('data-result'),'trap');
    console.log('PASS protection and relocation use both bounds and semantic result colors');
    for(const [tab,id,limit,base] of [['t1','f',1000,14000],['t4','v',600,8000]]) {
      await page.click('#'+tab);
      const panel=page.locator('#'+id+'-concepts'), exercise=panel.locator('.concept-supplement');
      await exercise.evaluate(e=>e.open=true);
      const before=await snapshot(id);
      const offset=exercise.locator('[name="offset"]'), result=exercise.locator('.concept-example');
      for(const value of [0,limit-1,limit,-1]) {
        await offset.fill(String(value));
        assert.equal(await exercise.locator('.concept-exercise-result').innerText(),'','draft clears previous example');
        await exercise.locator('button[type="submit"]').click();
        const valid=value>=0 && value<limit;
        assert.equal(await result.getAttribute('data-result'),valid?'ok':'trap');
        if(valid) assert.match(await result.innerText(),new RegExp('= '+(base+value)));
        assert.deepEqual(await snapshot(id),before,'independent exercise cannot mutate the simulation');
      }
      await exercise.locator('[data-example="valid"]').click(); assert.equal(await result.getAttribute('data-result'),'ok');
      await exercise.locator('[data-example="invalid"]').click(); assert.equal(await result.getAttribute('data-result'),'trap');
      await offset.fill('1.5'); await exercise.locator('button[type="submit"]').click();
      assert.equal(await exercise.locator('.concept-exercise-error').isVisible(),true);
      assert.equal(await exercise.locator('.concept-exercise-result').innerText(),'');
      await exercise.locator('[data-example="valid"]').click();
      const saved=await offset.inputValue(); await page.locator('#'+id+'-next').evaluate(e=>e.click());
      assert.equal(await offset.inputValue(),saved,'timeline redraw preserves the independent exercise');
    }
    await page.locator('#v-exercise-s').selectOption('0');
    await page.locator('#v-concepts .concept-supplement button[type="submit"]').click();
    assert.match(await page.locator('#v-concepts .concept-supplement .concept-example').innerText(),/4000 \+ 120 = 4120/);
    console.log('PASS independent relocation/segmentation examples: last byte, upper bound, negative and invalid inputs');
    await page.click('#t1'); await page.locator('#a-mode [data-m="ex"]').click(); await open('a');
    assert.match(await page.locator('#a-concepts .concept-body .concept-example').innerText(),/Tổng trống/);
    await page.click('#t2');
    await page.click('#x-default');
    let text=await page.locator('#x-concepts').innerText();
    assert.match(text,/10000/); assert.match(text,/p = 2, d = 1808/); assert.match(text,/5 × 4096 \+ 1808 = 22288/);
    assert.match(text,/không có Page Fault/);
    await page.click('#x-textbook');
    text=await page.locator('#x-concepts').innerText(); assert.match(text,/2 × 4 \+ 1 = 9/);
    console.log('PASS translation examples follow the applied problem');
    await page.click('#t4'); await page.click('#v-permission');
    assert.match(await page.locator('#v-concepts .concept-body').innerText(),/Chặn/);
    assert.doesNotMatch(await page.locator('#v-concepts .concept-body .concept-flow').allTextContents().then(x=>x.join(' ')),/OS yêu cầu nạp/);
    await page.click('#t3'); await page.locator('#r-alg [data-a="CLOCK"]').click();
    assert.equal(await page.locator('#r-concepts .concept-clock-slot').count(),(await snapshot('r')).n);
    for(const width of [1366,768,390]) {
      await page.setViewportSize({width,height:1000});
      for(const [tab,id] of [['t0','b'],['t1','f'],['t2','x'],['t4','v'],['t3','r']]) {
        await page.click('#'+tab);
        if(id==='f') await page.locator('#a-mode [data-m="free"]').click();
        await open(id);
        assert.ok(await page.locator('#'+id+'-concepts').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'overflow '+id+' '+width);
        for(const input of await page.locator('#'+id+'-concepts .concept-supplement input').all()) {
          assert.ok(await input.evaluate(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth+1;}));
        }
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
    fs.mkdirSync('/workspace/artifacts/workflow',{recursive:true});
    await page.click('#t0'); await page.click('#b-mode-check'); await page.click('#b-pre-low');
    await page.locator('#b-concepts .concept-body').screenshot({path:'/workspace/artifacts/workflow/demo1-valid.png'});
    await page.click('#b-pre-over');
    await page.locator('#b-concepts .concept-body').screenshot({path:'/workspace/artifacts/workflow/demo1-trap.png'});
    await page.click('#t1'); await page.locator('#a-mode [data-m="free"]').click();
    await page.locator('#f-concepts .concept-supplement [data-example="valid"]').click();
    await page.locator('#f-concepts .concept-supplement').screenshot({path:'/workspace/artifacts/workflow/relocation.png'});
    await page.click('#t4');
    await page.locator('#v-concepts .concept-supplement [data-example="invalid"]').click();
    await page.locator('#v-concepts .concept-supplement').screenshot({path:'/workspace/artifacts/workflow/segmentation-trap.png'});
    console.log('PASS permission branch, Clock circle, responsive layouts and no browser errors');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
