// UI regressions: discoverability, panning, contrast and keyboard focus.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[],assets=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)assets.push(r.url());});
  const out=process.env.MEMORY_ARTIFACT_DIR||'/tmp/memory-mobile-polish';fs.mkdirSync(out,{recursive:true});
  const snapshot=id=>page.evaluate(id=>MemoryTeaching.snapshot(id),id);
  const seek=(id,n)=>page.evaluate(([id,n])=>MemoryTeaching.seek(id,n),[id,n]);
  async function check(name,fn){await fn();checks.push(name);console.log('PASS',name);}
  try{
    await page.goto(process.env.MEMORY_DEMO_URL||'http://127.0.0.1:8080');
    await page.evaluate(()=>document.fonts.ready);
    await check('All five topics are visible on a phone and keyboard tab navigation still works',async()=>{
      for(const width of [375,390,768]){
        await page.setViewportSize({width,height:844});
        const bounds=await page.locator('.dash-tab').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,label:e.getAttribute('aria-label')};}));
        assert.equal(bounds.length,5);
        for(const b of bounds){assert.ok(b.left>=0&&b.right<=width+1);assert.ok(b.width>=44);assert.match(b.label,/Demo .*:/);}
        assert.ok(await page.locator('.dash-tabs').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
      }
      await page.setViewportSize({width:390,height:844});
      assert.ok(await page.locator('.site-header').evaluate(e=>e.getBoundingClientRect().height<130));
      await page.focus('#t0');await page.keyboard.press('End');assert.equal(await page.locator('#t3').getAttribute('aria-selected'),'true');
      await page.keyboard.press('Home');assert.equal(await page.locator('#t0').getAttribute('aria-selected'),'true');
      assert.equal(await page.locator('.dash-tab[tabindex="0"]').count(),1);
      assert.equal(await page.locator('#b-mode-check').isVisible(),true);
      assert.equal(await page.locator('#b-mode-trans').isVisible(),true);
    });
    await check('The complete four-step summary fits and its numbers keep readable dark/light contrast',async()=>{
      for(const theme of ['light','dark']){
        await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
        await page.click('#t0');await seek('b',0);
        const before=await snapshot('b');
        const measured=await page.locator('.studio-b-logic-flow').evaluate(root=>{
          const lum=c=>{const v=c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>{x/=255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});return v[0]*.2126+v[1]*.7152+v[2]*.0722;};
          const rr=root.getBoundingClientRect();return[...root.querySelectorAll('.b-logic-step')].map(e=>{const r=e.getBoundingClientRect(),n=getComputedStyle(e.querySelector('.b-logic-num'));const a=lum(n.color),b=lum(n.backgroundColor);return{fits:r.left>=rr.left&&r.right<=rr.right+1,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
        });
        assert.equal(measured.length,4);for(const r of measured){assert.ok(r.fits);assert.ok(r.contrast>=4.5,theme+' number contrast '+r.contrast);}
        assert.deepEqual(await snapshot('b'),before);
      }
    });
    await check('Allocation instructions and queue remain visible while the physical RAM is panned',async()=>{
      await page.evaluate(()=>document.documentElement.dataset.theme='light');
      await page.click('#t1');await seek('a',7);const before=await snapshot('a');
      for(const pan of [0,9999,0]){
        await page.locator('#a-lane').evaluate((e,x)=>e.parentElement.scrollLeft=x,pan);await page.waitForTimeout(100);
        const visible=await page.locator('#a-lane').evaluate(root=>{
          const clip=root.parentElement.getBoundingClientRect();
          const texts=root.querySelectorAll('.studio-flow-action strong,.a-dispatch-deck .lane-label,#a-queue .chip');
          return[...texts].every(e=>{const range=document.createRange();range.selectNodeContents(e);return[...range.getClientRects()].every(r=>r.left>=clip.left-1&&r.right<=clip.right+1);});
        });
        assert.ok(visible,'instruction and queue text must fit the visible scroll area');
        const distance=await page.locator('#a-lane .studio-flow-overlay').evaluate(svg=>{
          const line=svg.querySelector('.studio-flow-line'),p=line.getPointAtLength(0),screen=new DOMPoint(p.x,p.y).matrixTransform(line.getScreenCTM());
          const source=document.getElementById(svg.dataset.from).getBoundingClientRect();
          return Math.hypot(Math.max(source.left-screen.x,0,screen.x-source.right),Math.max(source.top-screen.y,0,screen.y-source.bottom));
        });
        assert.ok(distance<4,'the arrow follows the sticky request after panning');
        assert.deepEqual(await snapshot('a'),before);
      }
    });
    await check('Stacked cards use content height and selected comparison rows show keyboard focus',async()=>{
      await page.setViewportSize({width:768,height:1024});
      for(const [tab,id]of[['t2','x'],['t4','v']]){
        await page.click('#'+tab);await seek(id,2);
        const min=await page.locator('#'+id+'-flow .scene-node').evaluateAll(es=>es.map(e=>getComputedStyle(e).minHeight));
        assert.ok(min.every(x=>x==='0px'));
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      }
      await page.click('#t3');const before=await snapshot('r');
      const summary=page.locator('#p3 .scene-comparison>summary');await summary.click();
      await page.keyboard.press('Tab');await page.locator('#r-bars .brow.on').focus();
      const focus=await page.locator('#r-bars .brow.on').evaluate(e=>({visible:e.matches(':focus-visible'),style:getComputedStyle(e).outlineStyle,width:parseFloat(getComputedStyle(e).outlineWidth)}));
      assert.ok(focus.visible);assert.equal(focus.style,'solid');assert.ok(focus.width>=3);
      assert.deepEqual(await snapshot('r'),before);assert.equal(await page.locator('#r-choice-details').getAttribute('open'),null);
      await page.emulateMedia({reducedMotion:'reduce'});assert.deepEqual(await snapshot('r'),before);
    });
    assert.deepEqual(errors,[]);assert.deepEqual(assets,[]);
    fs.writeFileSync(out+'/results.json',JSON.stringify({passed:checks.length,checks,errors,assets},null,2));
    console.log(JSON.stringify({passed:checks.length,artifacts:out}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
