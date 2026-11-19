// Studio presentation acceptance: exact snapshots and explicitly gated access paths.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:1366,height:900}});
  const out = process.env.MEMORY_ARTIFACT_DIR || '/tmp/memory-studio-qa';
  fs.mkdirSync(out,{recursive:true});
  const errors=[],failedAssets=[],checks=[],accessibility=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)failedAssets.push(response.status()+' '+response.url());});
  const snap=id=>page.evaluate(id=>MemoryTeaching.snapshot(id),id);
  const trace=id=>page.evaluate(id=>MemoryTeaching.trace(id),id);
  const seek=(id,n)=>page.evaluate(([id,n])=>MemoryTeaching.seek(id,n),[id,n]);
  const attr=(selector,name)=>page.locator(selector).getAttribute(name);
  async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
  async function shot(name){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});}
  async function inputB({base=300040,limit=120900,value=400000,mode='check'}={}){
    await page.click('#t0');
    if(!await page.locator('#b-options').evaluate(e=>e.open))await page.click('#b-options>summary');
    await page.click(mode==='translate'?'#b-mode-trans':'#b-mode-check');
    for(const [id,v]of Object.entries({'b-base':base,'b-limit':limit,'b-addr':value}))await page.fill('#'+id,String(v));
    await page.click('#b-go');
  }
  async function activeBox(step){
    assert.equal(await page.locator('#b-flow .box').count(),4);
    assert.equal(await page.locator('#b-flow [data-processing="true"]').count(),1);
    assert.equal(await page.locator('#b-flow .box').nth(step).getAttribute('data-processing'),'true');
  }
  async function noRam(){assert.notEqual(await attr('#studio-b-to-ram','data-active'),'true');}
  async function finalB(valid,gate=''){
    await seek('b',3);const state=await snap('b');
    assert.equal(state.isValid,valid);
    assert.equal(await attr('#b-flow','data-branch'),valid?'allowed':'denied');
    assert.equal(await attr('#b-flow','data-failed-gate'),gate);
    assert.equal(await attr('#b-ram-track','data-verdict'),valid?'allowed':'denied');
    assert.equal(await attr('#studio-b-to-ram','data-active')==='true',valid);
    assert.equal(await attr('#studio-b-to-os','data-active')==='true',!valid);
    assert.equal(await attr('#studio-b-os','data-active')==='true',!valid);
    assert.equal(await page.locator('#b-flow .teach-wire').count(),0,'the studio paths replace the old generic wire');
    const explanation=(await page.locator('#b-cap .teach-deep-exp').textContent()).trim();
    assert.doesNotMatch(explanation,/\bundefined\b/,'the optional explanation must retain its content');
    assert.ok(explanation.length>20,'the optional explanation contains an explanation of the event');
    await activeBox(3);
  }
  try {
    await page.goto(process.env.MEMORY_DEMO_URL || 'http://127.0.0.1:8080');
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForSelector('#studio-b-to-ram',{state:'attached'});
    await check('Initial request waits at the first operation and exposes no access verdict',async()=>{
      await inputB();assert.equal((await trace('b')).length,4);
      assert.equal(await attr('#b-flow','data-branch'),'pending');
      assert.equal(await attr('#b-ram-track','data-verdict'),'pending');
      await noRam();assert.notEqual(await attr('#studio-b-to-os','data-active'),'true');await activeBox(0);
      await shot('demo1-initial');
    });
    await check('Physical addresses at both valid endpoints enter RAM only at the final step',async()=>{
      for(const value of [300040,420939,400000]){
        await inputB({value});
        for(let step=0;step<3;step++){await seek('b',step);await activeBox(step);await noRam();assert.equal(await attr('#b-ram-track','data-verdict'),'pending');}
        await finalB(true);assert.equal((await snap('b')).pa,value);
      }
      await shot('demo1-allowed');
    });
    await check('Lower-bound failure visibly blocks the path and skips the upper comparator',async()=>{
      await inputB({value:256000});const before=await snap('b');
      assert.equal(before.cond1,false);assert.equal(before.cond2,true,'a true upper condition must not authorize access');
      await seek('b',1);assert.equal(await attr('#b-flow','data-branch'),'denied');
      assert.equal(await attr('#b-flow','data-failed-gate'),'lower');
      assert.equal(await attr('#studio-b-upper','data-skipped'),'true');await noRam();
      assert.notEqual(await attr('#studio-b-to-os','data-active'),'true','final OS handling is a later event');
      await seek('b',2);assert.equal(await attr('#studio-b-upper','data-skipped'),'true');await noRam();
      await finalB(false,'lower');assert.equal((await snap('b')).pa,null);
      assert.match(await page.locator('.lab-stepper[data-lesson="b"] [data-lab-step="2"]').innerText(),/Bỏ qua cận trên/);
      await shot('demo1-denied-lower');
    });
    await check('Exclusive upper bound fails at the second comparator and routes only to OS',async()=>{
      await inputB({value:420940});await seek('b',1);await noRam();
      assert.equal(await attr('#b-flow','data-branch'),'pending');
      await seek('b',2);assert.equal(await attr('#b-flow','data-branch'),'denied');
      assert.equal(await attr('#b-flow','data-failed-gate'),'upper');
      assert.notEqual(await attr('#studio-b-upper','data-skipped'),'true');
      await finalB(false,'upper');await shot('demo1-denied-upper');
    });
    await check('Logical translation reveals PA only after the adder; invalid offsets never reach RAM',async()=>{
      await inputB({base:14000,limit:120900,value:346,mode:'translate'});
      for(const step of [0,1]){await seek('b',step);assert.equal((await page.locator('#studio-b-pa').innerText()).trim(),'?');assert.doesNotMatch(await page.locator('#b-flow').innerText(),/\b14346\b/,'do not leak the physical address elsewhere in the model');await noRam();}
      await seek('b',2);assert.match(await page.locator('#studio-b-pa').innerText(),/14346/);await noRam();
      await finalB(true);assert.equal((await snap('b')).pa,14346);await shot('demo1-translation');
      for(const value of [-5,120900]){
        await inputB({base:14000,limit:120900,value,mode:'translate'});await seek('b',1);
        assert.equal(await attr('#b-flow','data-branch'),'denied');assert.equal(await attr('#b-flow','data-failed-gate'),'offset');
        await finalB(false,'offset');assert.equal((await snap('b')).pa,null);
        assert.equal((await page.locator('#studio-b-pa').innerText()).trim(),'?');
      }
    });
    await check('Previous/Next restores complete snapshots and the corresponding branch exactly',async()=>{
      for(const value of [256000,420940,400000]){
        await inputB({value});const events=await trace('b');
        for(let step=1;step<events.length;step++){
          await seek('b',step);await page.click('#b-prev');assert.deepEqual(await snap('b'),events[step-1].state);
          await page.click('#b-next');assert.deepEqual(await snap('b'),events[step].state);
        }
        const prior=await snap('b');await page.locator('#b-next').locator('..').locator('.toggle-explain-btn').click();assert.deepEqual(await snap('b'),prior);
        await page.locator('#b-next').locator('..').locator('.toggle-explain-btn').click();
      }
    });
    await check('Base zero and rejected input stay correct; tab switching pauses autoplay',async()=>{
      await inputB({base:0,limit:4,value:0});await finalB(true);
      assert.equal(await page.locator('#b-pre-under').isDisabled(),true);
      assert.doesNotMatch(await page.locator('#p0').innerText(),/0\.\.-1/);
      const old=await snap('b');await page.fill('#b-limit','0');await page.click('#b-go');assert.deepEqual(await snap('b'),old);
      await inputB();await page.click('#b-play');await page.waitForTimeout(1450);await page.click('#t2');
      const paused=await snap('b');await page.waitForTimeout(1450);assert.deepEqual(await snap('b'),paused);
    });
    await check('All five demos fit desktop, tablet and mobile; large bounds retain readable labels',async()=>{
      await inputB({base:1000000000,limit:1000000000,value:1999999999});await finalB(true);
      for(const [width,height]of[[1920,1080],[1366,768],[1024,768],[850,1024],[820,1024],[768,1024],[390,844],[375,844]]){
        await page.setViewportSize({width,height});
        for(const [tab,id]of[['t0','b'],['t1','a'],['t2','x'],['t4','v'],['t3','r']]){
          await page.click('#'+tab);await page.waitForTimeout(180);
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`page overflow ${width}/${id}`);
          const before=await snap(id);const toggle=page.locator('#'+id+'-next').locator('..').locator('.toggle-explain-btn');
          await toggle.click();assert.deepEqual(await snap(id),before);
          assert.ok(await page.locator('#'+id+'-cap').evaluate(e=>e.getBoundingClientRect().right<=innerWidth+1));await toggle.click();
        }
        if(width===390){await inputB({value:256000});await finalB(false,'lower');await shot('demo1-mobile-denied');}
      }
      await page.setViewportSize({width:1366,height:900});await inputB({value:256000});await finalB(false,'lower');
      await page.emulateMedia({reducedMotion:'reduce'});await page.click('#b-prev');
      assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
    });
    if(process.env.MEMORY_AXE_PATH) {
      await page.addScriptTag({path:process.env.MEMORY_AXE_PATH});
      await check('Allowed, denied and translated access keep WCAG A/AA contrast in both themes',async()=>{
        for(const theme of ['light','dark']){
          await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
          for(const fixture of [{value:400000},{value:256000},{value:420940},{base:14000,value:-5,mode:'translate'},{base:14000,value:346,mode:'translate'}]){
            await inputB(fixture);
            const preset=fixture.mode==='translate' ? (fixture.value<0?'t-under':'t-std') : fixture.value===256000?'under':fixture.value===420940?'over':null;
            if(preset)await page.click('#b-pre-'+preset);
            await seek('b',3);
            const report=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
            const result={theme,fixture,violations:report.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))};
            accessibility.push(result);assert.deepEqual(result.violations,[],JSON.stringify({theme,fixture}));
          }
        }
      });
    }
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:checks.length,checks,errors,failedAssets,accessibility},null,2));
    console.log(JSON.stringify({passed:checks.length,errors,failedAssets,artifacts:out}));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
