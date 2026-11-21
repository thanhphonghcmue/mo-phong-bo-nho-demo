// Presentation acceptance. No new controller, engine, or expected algorithm result.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:1366,height:900}});
  const out=process.env.MEMORY_ARTIFACT_DIR || '/tmp/memory-academic-lab'; fs.mkdirSync(out,{recursive:true});
  const errors=[], failedAssets=[], checks=[], accessibility=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failedAssets.push(r.url());});
  const snap=id=>page.evaluate(id=>MemoryTeaching.snapshot(id),id);
  const trace=id=>page.evaluate(id=>MemoryTeaching.trace(id),id);
  const seek=(id,step)=>page.evaluate(([id,step])=>MemoryTeaching.seek(id,step),[id,step]);
  const fixtures=[['t0','b',3],['t1','a',3],['t2','x',3],['t4','v',4],['t3','r',10]];
  const stepper=id=>page.locator(`.lab-stepper[data-lesson="${id}"]`);
  async function check(name, fn){await fn();checks.push(name);console.log('PASS',name);}
  async function shot(name){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});}
  try {
    await page.goto(process.env.MEMORY_DEMO_URL || 'http://127.0.0.1:8080');
    await page.click('#b-options>summary');
    await page.evaluate(()=>document.fonts.ready);
    await check('One active UI, local assets, five named demos and an 80–96px academic header',async()=>{
      assert.ok(await page.evaluate(()=>!!MemoryTeaching && !!MemoryLabInterface && !window.MemoryLessons));
      assert.equal(await page.locator('.lab-nav-icon').count(),5);
      assert.equal(await page.locator('.lab-stepper').count(),6,'5 demos, including the alternate allocation mode');
      const h=await page.locator('.site-header').evaluate(e=>e.getBoundingClientRect().height);assert.ok(h>=80&&h<=96,'header height '+h);
      const names=await page.locator('.dash-tab .t').allTextContents();assert.equal(new Set(names).size,5);
      const selected=await page.locator('.dash-tab[aria-selected="true"]').evaluate(e=>getComputedStyle(e).backgroundColor);
      const idle=await page.locator('.dash-tab[aria-selected="false"]').first().evaluate(e=>getComputedStyle(e).backgroundColor);
      assert.notEqual(selected,idle,'the current demo is visible in the shared workbench navigation');
      assert.equal(await page.evaluate(()=>document.fonts.check('14px "Be Vietnam Pro"')),true);
      assert.equal(await page.locator('script[src*="lessons.js"]').count(),0);
      assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
    });
    await check('The stepper hides unseen names, restores visited snapshots and adds no duplicate events',async()=>{
      await page.click('#t2');await page.click('#x-reset');const events=await trace('x');
      assert.equal(await stepper('x').locator('button').count(),5);
      for(const button of await stepper('x').locator('button:disabled').all())assert.equal(await button.innerText().then(t=>t.includes('Chưa thực hiện')),true);
      assert.doesNotMatch(await stepper('x').innerText(),/OS nạp trang|Đọc đúng byte/);
      await seek('x',6);const count=(await trace('x')).length;
      await stepper('x').locator('[data-lab-step="4"]').click();assert.deepEqual(await snap('x'),events[4].state);
      assert.equal(await stepper('x').locator('[aria-current="step"]').getAttribute('data-lab-step'),'4');
      await page.click('#x-next');assert.deepEqual(await snap('x'),events[5].state);assert.equal((await trace('x')).length,count);
      const before=await snap('x');await page.evaluate(()=>MemoryLabInterface.refresh('x'));assert.deepEqual(await snap('x'),before);
      await page.click('#x-reset');assert.equal(await stepper('x').locator('button:disabled').count(),4);
    });
    await check('Open-ended free allocation shows continuation instead of a fake final count',async()=>{
      await page.click('#t1');await page.locator('#a-mode [data-m="free"]').click();await page.click('#f-reset');
      assert.match(await stepper('f').innerText(),/còn tiếp/);assert.equal(await stepper('f').locator('.lab-progress').isVisible(),false);
      await page.click('#f-next');assert.match(await stepper('f').innerText(),/Bước 2/);
      await page.locator('#a-mode [data-m="ex"]').click();
    });
    await check('Semantic scan, allocation, allowed/denied and Clock visuals follow current snapshots',async()=>{
      await page.click('#t0');await page.click('#b-reset');assert.equal(await page.locator('#b-ram-track').getAttribute('data-verdict'),'pending');
      await page.click('#b-pre-over');await seek('b',3);assert.equal(await page.locator('#b-ram-track').getAttribute('data-verdict'),'denied');
      assert.equal(await page.locator('#b-ram-track .plabel').evaluate(e=>getComputedStyle(e).animationName),'none');
      await page.selectOption('#b-scenario','1');await page.click('#t1');await page.selectOption('#a-scenario','1');
      const a=await trace('a'), placement=a.findIndex(e=>e.title.startsWith('Cập nhật RAM'));
      await seek('a',placement-1);assert.equal(await page.locator('#a-ram .lab-page-in').count(),0);
      await seek('a',placement);assert.equal(await page.locator('#a-ram .lab-page-in').count(),1);
      await page.click('#t3');await page.locator('#r-alg [data-a="CLOCK"]').click();
      await page.click('#r-choice-summary');
      const clock=await trace('r'), victim=clock.findIndex(e=>e.state.runtime.phase==='victim');await seek('r',victim);
      const s=await snap('r');assert.equal(await page.locator(`#r-slots [data-frame="${s.runtime.ptr}"] .scene-ram-hand`).innerText(),'↓ Kim Clock');
      assert.match(await page.locator('#r-slots .victim').evaluate(e=>getComputedStyle(e,'::after').content),/CHỌN RA/);
      assert.match(await page.locator('#r-evidence').innerText(),/chọn trang/);
      assert.equal(await page.locator('#r-refs .ref.past b').first().evaluate(e=>getComputedStyle(e).opacity),'1','completed page labels remain readable');
    });
    await check('Keyboard tabs use one focus stop and preserve all simulation snapshots',async()=>{
      await page.click('#t0');const before=await snap('b');await page.focus('#t0');await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('#t1').getAttribute('aria-selected'),'true');assert.equal(await page.locator('.dash-tab[tabindex="0"]').count(),1);
      assert.deepEqual(await snap('b'),before);await page.keyboard.press('End');assert.equal(await page.locator('#t3').getAttribute('aria-selected'),'true');
      await page.keyboard.press('Home');assert.equal(await page.locator('#t0').getAttribute('aria-selected'),'true');
    });
    await check('Alternate Demand Paging cases open, close and retain the single controller',async()=>{
      await page.click('#t4');await page.locator('.lab-case-picker summary').click();await page.click('#v-pre-hit');
      assert.equal(await page.locator('.lab-case-picker').getAttribute('open'),null);
      const events=await trace('v');assert.equal(events.length,3);assert.equal(events[1].title.startsWith('Page Hit'),true);
      await page.selectOption('#v-scenario','1');
    });
    const axePath=process.env.MEMORY_AXE_PATH;
    if(axePath)await page.addScriptTag({path:axePath});
    await check('Rendered desktop models and light/dark WCAG A/AA scans',async()=>{
      for(const theme of ['light','dark']){
        await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await page.waitForTimeout(280);
        for(const[tab,id,n]of fixtures){
          await page.click('#'+tab);if(id==='r')await page.locator('#r-alg [data-a="FIFO"]').click();await seek(id,n);await page.waitForTimeout(320);
          const before=await snap(id);
          if(axePath){
            const report=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
            accessibility.push({theme,id,violations:report.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),manualReview:report.incomplete.map(v=>v.id)});
            assert.deepEqual(accessibility.at(-1).violations,[],`${theme}/${id} accessibility`);
          }
          assert.deepEqual(await snap(id),before);
          if(theme==='light')await shot('after-'+id);else if(['x','r'].includes(id))await shot('dark-'+id);
        }
      }
      await page.evaluate(()=>document.documentElement.dataset.theme='light');await page.waitForTimeout(100);
      await page.locator('.site-header').screenshot({path:path.join(out,'header-after.png')});await page.locator('.dash-tabs').screenshot({path:path.join(out,'tabs-after.png')});
    });
    await check('1920/1366/768/390/375 widths: no page overflow, readable model and bounded step window',async()=>{
      for(const[width,height]of[[1920,1080],[1366,768],[768,1024],[390,844],[375,844]]){
        await page.setViewportSize({width,height});
        for(const[tab,id,n]of fixtures){await page.click('#'+tab);await seek(id,n);await page.waitForTimeout(180);
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width}/${id}`);
          assert.equal(await stepper(id).locator('button').count(),Math.min(width<=600?3:5,(await trace(id)).length));
          const toggle=page.locator('#'+id+'-next').locator('..').locator('.toggle-explain-btn');const before=await snap(id);
          await toggle.click();assert.ok(await page.locator('#'+id+'-cap').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1));assert.deepEqual(await snap(id),before);await toggle.click();
          if(width===390 && ['x','v','r'].includes(id))await shot('mobile-'+id);
        }
      }
    });
    await check('Reduced motion, 200% text, finite animations and relative deployment paths',async()=>{
      await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1366,height:768});await page.click('#t2');await page.click('#x-reset');await page.click('#x-next');
      assert.equal(await page.locator('#x-mmu').evaluate(e=>getComputedStyle(e).animationName),'none');
      const before=await snap('x');await page.addStyleTag({content:'.academic-lab .scene-node p{font-size:28px!important}.academic-lab .stage h2{font-size:42px!important}'});assert.deepEqual(await snap('x'),before);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert.equal(await page.locator('script[src^="/"] , link[rel="stylesheet"][href^="/"]').count(),0);
      if(process.env.MEMORY_SUBPATH_URL){
        const preview=await browser.newPage({viewport:{width:1366,height:768}}), subErrors=[];
        preview.on('pageerror',e=>subErrors.push(e.message));
        preview.on('response',r=>{if(r.status()>=400)subErrors.push(r.status()+' '+r.url());});
        for(const suffix of ['', '?view=diagnostic']){
          await preview.goto(process.env.MEMORY_SUBPATH_URL+suffix);await preview.evaluate(()=>document.fonts.ready);
          assert.equal(await preview.evaluate(()=>MemoryLabInterface.version),'academic-lab-2');
          await preview.click('#t2');await preview.click('#x-next');
          assert.equal(await preview.evaluate(()=>MemoryTeaching.position('x').cursor),1);
        }
        assert.deepEqual(subErrors,[]);await preview.close();
      }
      assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
    });
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:checks.length,checks,errors,failedAssets,subpath:!!process.env.MEMORY_SUBPATH_URL,axe:axePath?'4.10.3':'not run (set MEMORY_AXE_PATH)',accessibility},null,2));
    console.log(JSON.stringify({passed:checks.length,axe:!!axePath,errors,artifacts:out}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
