"""Acceptance checks for optional explanations, purpose badges and visual contrast.

Uses the public five-demo UI, not the diagnostic route. Start the static server
on port 8080 first; requires Python Playwright and Chromium.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.getenv('MEMORY_DEMO_URL', 'http://127.0.0.1:8080')
OUT = Path('/tmp/memory-interface-tests')
TOPICS = {'b':'t0', 'a':'t1', 'x':'t2', 'v':'t4', 'r':'t3'}
PURPOSES = {'b':('safety','An toàn'), 'a':('efficiency','Hiệu quả'), 'x':('efficiency','Hiệu quả'), 'v':('virtual','Không giới hạn'), 'r':('virtual','Không giới hạn')}


def run():
    OUT.mkdir(exist_ok=True)
    passed, errors = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width':1366,'height':900}, reduced_motion='reduce')
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        response = page.goto(BASE, wait_until='networkidle')
        assert response.status == 200
        page.wait_for_function('window.MemoryLessons')

        def check(name):
            passed.append(name)
            print('PASS',name,flush=True)

        def select(id):
            page.locator('#'+TOPICS[id]).click()

        def state(id):
            return page.evaluate('id=>({state:MemoryTeaching.snapshot(id),position:MemoryTeaching.position(id)})',id)

        def expanded(id, value):
            return page.locator(f'#lesson-{id}-explanation').evaluate('(el)=>el.open') == value

        for id in TOPICS:
            select(id)
            details=page.locator(f'#lesson-{id}-explanation')
            summary=details.locator(':scope > summary')
            assert expanded(id,False)
            initial=state(id)
            summary.focus()
            page.keyboard.press('Space')
            page.wait_for_function('id=>document.getElementById("lesson-"+id+"-explanation").open',arg=id)
            assert state(id) == initial
            page.wait_for_function('id=>document.querySelector("#lesson-"+id+" .lesson-explanation-action").textContent.includes("Thu gọn")',arg=id)
            assert 'Thu gọn' in page.locator(f'#lesson-{id} .lesson-explanation-action').inner_text()
            summary.click()
            assert expanded(id,False)
            assert state(id) == initial
            page.locator(f'#lesson-{id}-next').click()
            assert expanded(id,False)
            assert state(id)['position']['cursor'] == 1
            assert 'Bước 2 /' in page.locator(f'#lesson-{id} .lesson-current').inner_text()
            summary.click()
            assert expanded(id,True)
            expected=page.evaluate('''id=>{
              const e=MemoryTeaching.event(id);e.state=MemoryTeaching.snapshot(id);
              return MemoryLessonViews[id](e,MemoryTeaching.position(id)).why;
            }''',id)
            assert page.locator(f'#lesson-{id} .lesson-why').is_visible()
            assert page.locator(f'#lesson-{id} .lesson-why').inner_text() == expected
            before=state(id)
            select('r' if id!='r' else 'b')
            select(id)
            assert expanded(id,True)
            assert state(id) == before
            page.select_option(f'#lesson-{id}-example',index=1)
            assert expanded(id,True)
            page.locator(f'#lesson-{id}-reset').click()
            assert expanded(id,True)
            # Closed preferences also survive new data and a replay.
            summary.click()
            page.select_option(f'#lesson-{id}-example',index=0)
            page.locator(f'#lesson-{id}-reset').click()
            assert expanded(id,False)
        check('All five explanations: keyboard toggle, no state mutation, current content and per-demo persistence')

        for id in TOPICS:
            select(id)
            details=page.locator(f'#lesson-{id}-explanation')
            details.locator(':scope > summary').click()
            for _ in range(2):page.locator(f'#lesson-{id}-next').click()
            history=page.locator(f'#lesson-{id} .lesson-history')
            history.locator(':scope > summary').click()
            page.wait_for_function('id=>document.querySelectorAll("#lesson-"+id+" .lesson-step-log button").length===MemoryTeaching.position(id).seen+1',arg=id)
            before=state(id)
            log=page.locator(f'#lesson-{id} .lesson-step-log')
            assert log.locator('button').count() == before['position']['seen']+1
            visible_steps=log.locator('button').evaluate_all('(els)=>els.map(el=>Number(el.dataset.step))')
            assert max(visible_steps) == before['position']['seen']
            trace=page.evaluate('id=>MemoryTeaching.trace(id)',id)
            scenario=trace[0]['scenarioId']
            page.locator(f'#lesson-{id}-play').click()
            log.locator('button[data-step="1"]').click()
            assert state(id)['state'] == trace[1]['state']
            assert state(id)['position']['cursor'] == 1
            assert state(id)['position']['seen'] == before['position']['seen']
            assert page.evaluate('id=>MemoryTeaching.trace(id)[0].scenarioId',id) == scenario
            assert page.locator(f'#lesson-{id}-play').inner_text() == 'Tự chạy'
            page.wait_for_timeout(1700)
            assert state(id)['position']['cursor'] == 1
            page.select_option(f'#lesson-{id}-example',index=1)
            assert history.evaluate('(el)=>el.open')
            assert log.locator('button').count() == 1
            assert log.locator('button').first.get_attribute('data-step') == '0'
            page.locator(f'#lesson-{id}-next').click()
            page.locator(f'#lesson-{id}-reset').click()
            assert log.locator('button').count() == 1
            assert state(id)['position']['cursor'] == 0
            assert state(id)['position']['seen'] == 0
            page.screenshot(path=str(OUT/f'{id}-expanded-desktop.png'),full_page=True)
            history.locator(':scope > summary').click()
            details.locator(':scope > summary').click()
        check('All five histories show only visited steps, restore exact snapshots, pause autoplay and reset new scenarios')

        for id,(key,label) in PURPOSES.items():
            select(id)
            tab=page.locator('#'+TOPICS[id])
            assert tab.get_attribute('data-pillar') == key
            assert tab.locator(':scope > .lesson-pillar').text_content() == label
            assert page.locator(f'#lesson-{id}').get_attribute('data-pillar') == key
            assert page.locator(f'#lesson-{id} .lesson-purpose .lesson-pillar').text_content() == label
            if key=='virtual':
                note=page.locator(f'#lesson-{id} .lesson-purpose>span:last-child')
                assert note.is_visible() and 'RAM thực tế vẫn hữu hạn' in note.inner_text()
        check('Purpose badges map safety→demo1, efficiency→demo2/3, virtual→demo4/5 with finite-RAM context')

        for id,key,value in [('b','address','140'),('r','refs','1 1')]:
            select(id)
            if id=='r':page.select_option('#lesson-r-example','textbook')
            settings=page.locator(f'#lesson-{id} .lesson-settings')
            settings.locator(':scope > summary').click()
            page.locator(f'#lesson-{id}-{key}').fill(value)
            settings.locator('button[type=submit]').click()
            selector=page.locator(f'#lesson-{id}-example')
            assert selector.input_value() == 'custom'
            assert selector.locator('option:checked').inner_text() == 'Ví dụ tự nhập'
            current=state(id)['state']
            assert current['addr'] == 140 if id=='b' else current['refs'] == [1,1]
            page.locator(f'#lesson-{id}-reset').click()
            assert selector.input_value() == 'custom'
            selector.select_option(index=0)
            assert selector.locator('option[value=custom]').count() == 0
            settings.locator(':scope > summary').click()
        check('Custom examples are labeled accurately and returning to a supplied example removes the custom label')

        select('r')
        details=page.locator('#lesson-r-explanation')
        details.locator(':scope>summary').click()
        page.locator('#lesson-r-next').click()
        history=page.locator('#lesson-r .lesson-history')
        history.locator(':scope>summary').click()
        page.wait_for_function('document.querySelectorAll("#lesson-r .lesson-step-log button").length===MemoryTeaching.position("r").seen+1')
        settings=page.locator('#lesson-r .lesson-settings')
        settings.locator(':scope>summary').click()
        saved=state('r')
        page.locator('#lesson-r-refs').fill('-1')
        log=page.locator('#lesson-r .lesson-step-log')
        assert log.locator('button:disabled').count() == log.locator('button').count()
        log.locator('button').first.evaluate('(button)=>button.click()')
        assert state('r') == saved
        settings.locator('button[type=submit]').click()
        assert page.locator('#lesson-r-error').is_visible()
        log.locator('button').first.evaluate('(button)=>button.dispatchEvent(new MouseEvent("click",{bubbles:true}))')
        assert state('r') == saved
        page.select_option('#lesson-r-example','short')
        assert log.locator('button:disabled').count() == 0
        settings.locator(':scope>summary').click()
        history.locator(':scope>summary').click()
        details.locator(':scope>summary').click()
        check('Draft or invalid examples cannot seek through history; a valid supplied example restores controls')

        # WCAG relative luminance, computed from actual rendered text and fill.
        contrast=page.evaluate('''() => {
          const rgb=s=>s.match(/[\\d.]+/g).slice(0,3).map(Number);
          const lum=c=>c.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((n,x,i)=>n+x*[.2126,.7152,.0722][i],0);
          const ratio=(a,b)=>{const la=lum(a),lb=lum(b);return (Math.max(la,lb)+.05)/(Math.min(la,lb)+.05)};
          const styles=[...document.querySelectorAll('.dash-tab>.lesson-pillar')].map(el=>({label:el.textContent,text:getComputedStyle(el).color,fill:getComputedStyle(el).backgroundColor}));
          const button=document.querySelector('#lesson-b-next');
          styles.push({label:'Primary',text:getComputedStyle(button).color,fill:getComputedStyle(button).backgroundColor});
          return styles.map(s=>({...s,ratio:ratio(rgb(s.text),rgb(s.fill))}));
        }''')
        assert all(entry['ratio']>=4.5 for entry in contrast),contrast
        colors={item['text'] for item in contrast[:-1]}
        assert len(colors)==3,contrast
        check('All three badge text colors and the violet primary button meet 4.5:1 text contrast')

        for width in [375,390,768,1366]:
            page.set_viewport_size({'width':width,'height':900})
            for id in TOPICS:
                select(id)
                details=page.locator(f'#lesson-{id}-explanation')
                for is_open in [False,True]:
                    details.evaluate('(el,value)=>el.open=value',is_open)
                    page.wait_for_timeout(100)
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(id,width,is_open)
                    assert details.locator(':scope>summary').is_visible()
                    for action in ['prev','next','play','reset']:
                        assert page.locator(f'#lesson-{id}-{action}').is_visible()
                if width in [390,1366]:page.screenshot(path=str(OUT/f'{id}-{width}.png'),full_page=True)
                details.evaluate('(el)=>el.open=false')
        check('Five demos at 375/390/768/1366px: open and closed explanations fit without page overflow')
        assert not errors,errors
        check('No JavaScript page errors')
        browser.close()
    (OUT/'results.json').write_text(json.dumps({'passed':passed,'pageErrors':errors,'contrast':contrast},ensure_ascii=False,indent=2))
    print(f'{len(passed)} groups passed; artifacts: {OUT}')


if __name__=='__main__':run()
