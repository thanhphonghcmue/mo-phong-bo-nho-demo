// Public UI acceptance: real snapshot transitions, semantic focus, responsive layout.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:1366,height:768}}), errors=[], checks=[];
  const out=process.env.MEMORY_ARTIFACT_DIR || '/tmp/memory-scenes-review'; fs.mkdirSync(out,{recursive:true});
  page.on('pageerror',e=>errors.push(e.message));
  const snap=id=>page.evaluate(id=>MemoryTeaching.snapshot(id),id);
  const trace=id=>page.evaluate(id=>MemoryTeaching.trace(id),id);
  const seek=(id,n)=>page.evaluate(([id,n])=>MemoryTeaching.seek(id,n),[id,n]);
  async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
  async function shot(name){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});}
  async function config(id, values){
    await page.evaluate(([id,values])=>{
      const config=document.getElementById(id+'-config');
      if(id==='a') {
        for(const [key,value] of Object.entries(values))document.getElementById(key).value=String(value);
        document.getElementById('a-apply').click(); return;
      }
      config.open=true;
      const adv=config.querySelector('.teach-advanced-config'); if(adv)adv.open=true;
      for(const [key,value] of Object.entries(values))document.getElementById(key).value=String(value);
      config.querySelector('form.teach-config-form').requestSubmit();
      if(config.querySelector('.teach-config-status.teach-error'))throw Error(config.querySelector('.teach-config-status').textContent);
      config.open=false;
    },[id,values]);
  }
  try{
    await page.goto(process.env.MEMORY_DEMO_URL || 'http://127.0.0.1:8080');
    await page.click('#b-options>summary');
    await check('All five default examples are medium; optional explanations are below the model',async()=>{
      for(const [tab,id]of [['t0','b'],['t1','a'],['t2','x'],['t4','v'],['t3','r']]){
        await page.click('#'+tab);assert.equal(await page.locator('#'+id+'-scenario').inputValue(),'1');
        assert.equal(await page.locator('#'+id+'-cap').isVisible(),false);
        const before=await snap(id);
        await page.locator('#'+id+'-next').click();
        await page.locator('#'+id+'-prev').click();assert.deepEqual(await snap(id),before);
        const toggle=page.locator('#'+id+'-next').locator('..').locator('.toggle-explain-btn');
        await toggle.click();assert.equal(await page.locator('#'+id+'-cap').isVisible(),true);
        assert.ok(await page.locator('#'+id+'-cap').evaluate(el=>el.getBoundingClientRect().top >= el.closest('.demo-stage-grid').querySelector('.demo-canvas-col').getBoundingClientRect().bottom));
        assert.deepEqual(await snap(id),before);await toggle.click();await shot(id+'-desktop');
      }
      assert.equal((await snap('v')).ram.length,2);assert.equal((await trace('v')).length,21);
    });
    await check('Demo 1: exclusive upper bound, early verdict hidden, trap never authorizes RAM',async()=>{
      await page.click('#t0');await page.click('#b-pre-over');
      assert.doesNotMatch(await page.locator('#b-ram-track .plabel').innerText(),/HỢP LỆ|TRAP/);
      const events=await trace('b');await seek('b',events.length-1);
      assert.equal((await snap('b')).isValid,false);assert.match(await page.locator('.scene-status[data-lesson="b"]').innerText(),/không đọc\/ghi RAM/);
      await page.selectOption('#b-scenario','1');
    });
    await check('Demo 2: Best/Worst scan all before choosing, allocation and residual are separate',async()=>{
      await page.click('#t1');await page.selectOption('#a-scenario','1');
      for(const alg of ['first','best','worst']){
        await page.locator(`#a-alg [data-a="${alg}"]`).click();const events=await trace('a');
        const decision=events.findIndex(e=>e.title.startsWith('Chọn'));
        for(let i=0;i<decision;i++){
          await seek('a',i);assert.equal(await page.locator('#a-ram .scene-chosen').count(),0);assert.doesNotMatch(await page.locator('#a-ram').innerText(),/ít nhất|nhiều nhất/);
          assert.deepEqual((await snap('a')).runtime.pieces,[[],[],[],[]]);
        }
        assert.equal(events.slice(0,decision).filter(e=>e.title.includes('xét Lỗ')).length,alg==='first'?1:4);
        await seek('a',decision);assert.equal(await page.locator('#a-ram .scene-chosen').count(),1);
        await seek('a',decision+1);const chosen=events[decision].state.runtime.scan;
        assert.equal((await snap('a')).runtime.free[chosen],events[decision].state.runtime.free[chosen]-4);
      }
      await config('a',{'a-holes':'5 3','a-reqs':'6','a-c-gap':1});
      const events=await trace('a');assert.match(events.find(e=>e.title.includes('không cấp phát')).change,/phân mảnh ngoài/);
      await page.selectOption('#a-scenario','1');
    });
    await check('Demo 3: miss/fault/read exact byte; warm TLB skips PTE; miss resident has no fault',async()=>{
      await page.click('#t2');await page.selectOption('#x-scenario','1');
      const events=await trace('x');assert.equal(events.length,8);
      for(let i=0;i<events.length;i++){
        await seek('x',i);const s=await snap('x');
        assert.equal(await page.locator('#x-flow [data-processing]').count(),1);
        const ready=events[i].kind==='read'||events[i].title.startsWith('Tạo địa chỉ');
        assert.equal(await page.locator('#x-pa .scene-number').innerText(),ready?'1':'?');
        assert.equal(s.plan.d,1);
        if(i<4){assert.equal(s.pt[3],null);assert.equal(await page.locator('#x-frame-0 b').innerText(),'Trống');}
      }
      assert.equal((await snap('x')).faults,1);assert.equal((await snap('x')).plan.phys,1);
      assert.equal(await page.locator('#x-data .is-read').getAttribute('data-byte-offset'),'1');await shot('x-read-byte');
      await page.click('#x-go');const warm=await trace('x');assert.equal(warm.some(e=>e.title.startsWith('Tra bảng')),false);
      assert.equal(await page.locator('#x-scenario').inputValue(),'custom');
      await seek('x',2);assert.equal((await snap('x')).plan.hit,true);assert.equal(await page.locator('#x-pt-focus.scene-skipped').count(),1);
      await seek('x',warm.length-1);assert.equal(await page.locator('#x-data .is-read').count(),1);
      await page.selectOption('#x-scenario','0');await seek('x',(await trace('x')).length-1);
      assert.equal((await snap('x')).faults,0);assert.equal((await snap('x')).plan.phys,9);
      const before=await snap('x');await page.fill('#x-addr','-1');await page.click('#x-go');assert.deepEqual(await snap('x'),before);
      assert.equal(await page.locator('#x-scenario').inputValue(),'0','rejected input keeps the applied scenario label');
      await page.selectOption('#x-scenario','1');
    });
    await check('Demo 4: dirty write precedes read; PTE commit follows I/O; hit and denied bypass disk',async()=>{
      await page.click('#t4');await page.selectOption('#v-scenario','1');const events=await trace('v');
      const write=events.findIndex(e=>e.kind==='page-out'), load=events.findIndex(e=>e.kind==='page-in');assert.ok(write>0&&write<load);
      for(let i=0;i<events.length;i++){
        await seek('v',i);const s=await snap('v');assert.equal(await page.locator('#v-flow [data-processing]').count(),1);
        if(events[i].kind==='page-in'){
          assert.equal(s.pt[s.page].present,false);assert.equal(s.ram[s.plan.chosenFrame],s.page);
          await page.locator('#v-prev').click();assert.deepEqual(await snap('v'),events[i-1].state);await seek('v',i);
        }
        if(events[i].title.startsWith('Cập nhật'))assert.equal(s.pt[s.page].present,true);
        if(events[i].title.startsWith('Page Hit'))assert.equal(await page.locator('.scene-demand.is-hit').count(),1);
      }
      const s=await snap('v');assert.deepEqual(s.ram,[2,3]);assert.deepEqual([s.hits,s.faults,s.reads,s.writes],[2,2,2,1]);
      await seek('v',write);assert.equal(await page.locator('.scene-io').getAttribute('data-direction'),'out');await shot('v-dirty-write');
      await page.selectOption('#v-scenario','2');await seek('v',(await trace('v')).length-1);
      const blocked=await snap('v');assert.deepEqual([blocked.denied,blocked.faults,blocked.reads,blocked.writes],[1,0,0,0]);
      await page.selectOption('#v-scenario','1');
    });
    await check('Demo 5: visible FIFO/LRU evidence; OPT no early answer; Clock inspect/clear/victim restore',async()=>{
      await page.click('#t3');await page.selectOption('#r-scenario','1');
      for(const alg of ['FIFO','LRU','OPT','CLOCK']){
        await page.locator(`#r-alg [data-a="${alg}"]`).click();const events=await trace('r');let hits=0,clears=0;
        for(let i=0;i<events.length;i++){
          await seek('r',i);const s=(await snap('r')).runtime;
          assert.equal(await page.locator('#r-evidence').isVisible(),true);
          assert.equal(await page.locator('#r-scene [data-processing]').count(),1);
          assert.equal(await page.locator('#r-evidence .chosen').count(),s.phase==='victim'?1:0);
          if(alg==='OPT'&&s.phase!=='victim')assert.doesNotMatch(await page.locator('#r-evidence').innerText(),/Dùng ở lượt|Không dùng lại/);
          if(events[i].kind==='read'){
            hits++;assert.deepEqual(s.fr,events[i].beforeState.runtime.fr);
            if(alg==='FIFO')assert.deepEqual(s.load,events[i].beforeState.runtime.load);
            if(alg==='CLOCK')assert.equal(s.ptr,events[i].beforeState.runtime.ptr);
          }
          if(alg==='CLOCK'&&s.phase==='clear'){
            clears++;const old=events[i].beforeState.runtime;assert.equal(s.bit[old.ptr],0);assert.deepEqual(s.fr,old.fr);
            await page.locator('#r-prev').click();assert.deepEqual((await snap('r')).runtime,old);await seek('r',i);
          }
        }
        assert.ok(hits);if(alg==='CLOCK'){assert.ok(clears);const victim=events.findIndex(e=>e.state.runtime.phase==='victim');await seek('r',victim);await shot('r-clock-choice');}
      }
      assert.equal(await page.locator('.scene-comparison').getAttribute('open'),null);
    });
    await check('Desktop/mobile, optional explanation, large inputs and reduced motion preserve snapshots',async()=>{
      for(const width of [1366,1920,375,390]){
        await page.setViewportSize({width,height:width===1920?1080:width>1000?768:844});
        for(const[tab,id]of[['t0','b'],['t1','a'],['t2','x'],['t4','v'],['t3','r']]){
          await page.click('#'+tab);await page.waitForTimeout(150);const before=await snap(id);
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`page ${width}/${id}`);
          const toggle=page.locator('#'+id+'-next').locator('..').locator('.toggle-explain-btn');await toggle.click();
          assert.ok(await page.locator('#'+id+'-cap').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1),`explanation ${width}/${id}`);
          assert.deepEqual(await snap(id),before);await toggle.click();
          if(width===390 && ['x','v'].includes(id))await shot(id+'-mobile');
        }
      }
      await page.emulateMedia({reducedMotion:'reduce'});await page.click('#t2');await page.click('#x-reset');await page.click('#x-next');
      assert.equal(await page.locator('#x-mmu').evaluate(e=>getComputedStyle(e).animationName),'none');
      await page.setViewportSize({width:1366,height:768});await page.click('#theme-toggle');await shot('x-dark');await page.click('#theme-toggle');
    });
    await check('Autoplay pauses on tab switch and manual navigation',async()=>{
      await page.click('#t4');await page.click('#v-reset');await page.click('#v-play');await page.waitForTimeout(1400);await page.click('#t2');
      const paused=await snap('v');await page.waitForTimeout(1400);assert.deepEqual(await snap('v'),paused);
      await page.click('#t4');await page.click('#v-play');await page.click('#v-prev');const prior=await snap('v');await page.waitForTimeout(1400);assert.deepEqual(await snap('v'),prior);
      assert.deepEqual(errors,[]);
    });
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:checks.length,checks,errors},null,2));
    console.log(JSON.stringify({passed:checks.length,errors,artifacts:out}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
