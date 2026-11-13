"""Pedagogical acceptance checks for the public, simplified five-demo UI.

Run against python3 -m http.server 8080. Requires Playwright + Chromium.
Old engine regression suites use ?view=diagnostic; these checks use the real UI.
"""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright

BASE = os.getenv('MEMORY_DEMO_URL', 'http://127.0.0.1:8080')
OUT = Path('/tmp/memory-lessons-review')
TOPICS = {'b':'t0', 'a':'t1', 'x':'t2', 'v':'t4', 'r':'t3'}


def run():
    OUT.mkdir(exist_ok=True)
    checks, errors = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width':1366, 'height':900}, reduced_motion='reduce')
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        page.goto(BASE, wait_until='networkidle')
        page.wait_for_function('window.MemoryLessons')
        inspect_explanations = False

        def passed(name):
            checks.append(name)
            print('PASS', name, flush=True)

        def select(id):
            page.locator('#'+TOPICS[id]).click()
            if inspect_explanations:
                page.locator(f'#lesson-{id}-explanation').evaluate('el=>el.open=true')

        def next_step(id):
            page.locator(f'#lesson-{id}-next').click()

        def snapshot(id):
            return page.evaluate('id=>MemoryTeaching.snapshot(id)', id)

        def event(id):
            return page.evaluate('id=>MemoryTeaching.event(id)', id)

        def finish(id):
            guard = 0
            while not page.locator(f'#lesson-{id}-next').is_disabled():
                next_step(id)
                guard += 1
                assert guard < 400, id

        def seek(id, predicate):
            guard = 0
            while not predicate(event(id), snapshot(id)):
                assert not page.locator(f'#lesson-{id}-next').is_disabled(), (id, event(id))
                next_step(id)
                guard += 1
                assert guard < 400

        def edit(id, values):
            details=page.locator(f'#lesson-{id} .lesson-settings')
            details.evaluate('(el)=>el.open=true')
            for key,value in values.items():
                page.locator(f'#lesson-{id}-{key}').fill(str(value))
            details.locator('button[type=submit]').click()

        assert page.get_by_role('tab').count() == 5
        for id in TOPICS:
            select(id)
            assert page.locator(f'#lesson-{id}').is_visible()
            assert page.locator('button:visible').count() == 9  # 5 tabs + 4 lesson controls
            assert not page.locator(f'#lesson-{id} .lesson-settings').evaluate('(el)=>el.open')
            assert not page.locator('.teach-options:visible, .teach-history:visible, .telemetry-stage:visible, .teach-concepts:visible').count()
        passed('Five lessons; only four playback buttons; advanced forms closed and clutter removed')
        # The public UI intentionally leaves explanations folded; the content
        # acceptance checks opt in, as a learner would, before reading the prose.
        inspect_explanations = True

        select('b')
        for address,valid in [(99,False),(100,True),(139,True),(140,False)]:
            edit('b', {'address':address})
            assert 'Chưa kiểm tra' in page.locator('#lesson-b .lesson-canvas').inner_text()
            finish('b')
            assert snapshot('b')['isValid'] == valid
            before=snapshot('b')
            page.locator('#lesson-b-prev').click()
            next_step('b')
            assert snapshot('b') == before
        edit('b', {'address':'1.5'})
        assert page.locator('#lesson-b-next').is_disabled()
        assert 'nguyên' in page.locator('#lesson-b-error').inner_text()
        page.locator('#lesson-b-reset').click()
        assert not page.locator('#lesson-b-next').is_disabled()
        page.locator('#lesson-b .lesson-settings').evaluate('(el)=>el.open=false')
        passed('Base/Limit: four exact boundaries, no early verdict, rewind, invalid-data recovery')

        select('a')
        for alg,hole in [('first',2),('best',3),('worst',2)]:
            page.select_option('#lesson-a-algorithm',alg)
            seek('a', lambda e,s:e['title'].startswith('Chọn Lỗ'))
            assert f'Chọn Lỗ {hole}' in page.locator('#lesson-a .lesson-title').inner_text()
            old=snapshot('a')['runtime']['free']
            next_step('a')
            new=snapshot('a')['runtime']['free']
            assert old[hole-1]-new[hole-1] == 4
            assert 'trước có' in page.locator('#lesson-a .lesson-why').inner_text()
        page.select_option('#lesson-a-example','fragmented')
        seek('a', lambda e,s:'không cấp phát' in e['title'])
        assert 'phân mảnh ngoài' in page.locator('#lesson-a .lesson-why').inner_text()
        passed('Fit algorithms: inspect→choose→allocate; actual before/after and external fragmentation')

        select('x')
        assert 'Chưa biết khung' in page.locator('#lesson-x .lesson-canvas').inner_text()
        assert not page.locator('#lesson-x .lesson-canvas').get_by_text('Khung 2 · Frame',exact=True).count()
        finish('x')
        assert snapshot('x')['plan']['phys'] == 9
        assert 'PA 9' in page.locator('#lesson-x .lesson-result').inner_text()
        assert snapshot('x')['faults'] == 0  # TLB miss is not page fault
        page.select_option('#lesson-x-example','hit')
        finish('x')
        assert snapshot('x')['plan']['hit']
        assert 'bỏ qua' in page.locator('#lesson-x .lesson-canvas').inner_text().lower()
        passed('Paging:13/4→page3+offset1→frame2→PA9; TLB hit bypass and miss≠fault')

        select('v')
        seek('v',lambda e,s:e['kind']=='page-in')
        s=snapshot('v')
        assert s['ram'][1] == 3 and not s['pt'][3]['present']
        assert 'chưa ghi số khung' in page.locator('#lesson-v .lesson-canvas').inner_text()
        before=snapshot('v')
        next_step('v')
        assert snapshot('v')['pt'][3]['present']
        page.locator('#lesson-v-prev').click()
        assert snapshot('v') == before
        finish('v')
        assert snapshot('v')['faults'] == 1 and snapshot('v')['reads'] == 1
        assert page.locator('#lesson-v .demand-hit-row').count() == 1
        assert 'CPU chạy lại lệnh' in page.locator('#lesson-v .paging-bypass-note').inner_text()
        page.select_option('#lesson-v-example','hit')
        finish('v')
        assert snapshot('v')['faults'] == 0 and snapshot('v')['reads'] == 0
        assert 'bỏ qua OS và đĩa' in page.locator('#lesson-v .lesson-canvas').inner_text()
        page.select_option('#lesson-v-example','full')
        seek('v',lambda e,s:'chọn victim' in e['title'])
        assert snapshot('v')['ram'] == [0,1]
        assert 'Trang 0 → Trang 1' in page.locator('#lesson-v .lesson-canvas').inner_text()
        finish('v')
        assert snapshot('v')['ram'] == [3,1]
        passed('Demand Paging: true load→PTE commit→retry; hit bypass; FIFO victim evidence; exact rewind')

        select('r')
        page.select_option('#lesson-r-algorithm','FIFO')
        seek('r', lambda e,s:s['runtime']['t']==3 and s['runtime']['phase']=='apply')
        queue=page.locator('#lesson-r .replacement-order-item').evaluate_all('(els)=>els.map(el=>Number(el.dataset.page))')
        assert queue == [1,2,3]
        seek('r',lambda e,s:s['runtime']['t']==4 and s['runtime']['phase']=='request')
        assert not page.locator('#lesson-r [data-chosen=true]').count()
        next_step('r')
        assert snapshot('r')['runtime']['victim'] == 1
        assert 'Trang 1' in page.locator('#lesson-r [data-chosen=true]').inner_text()
        page.screenshot(path=str(OUT/'fifo-decision-page1.png'),full_page=True)
        before=snapshot('r')['runtime']['fr']
        next_step('r')
        after=snapshot('r')['runtime']['fr']
        assert before == [1,2,3] and after == [4,2,3]
        page.screenshot(path=str(OUT/'fifo-why-page1.png'),full_page=True)
        page.select_option('#lesson-r-algorithm','LRU')
        seek('r',lambda e,s:s['runtime']['t']==4 and s['runtime']['phase']=='victim')
        assert snapshot('r')['runtime']['victim'] == 2
        assert 'Trang 2' in page.locator('#lesson-r [data-chosen=true]').inner_text()
        passed('FIFO keeps queue on hit and removes1; same sequence LRU removes2; no early victim or RAM mutation')
        for alg in ['OPT','CLOCK']:
            page.select_option('#lesson-r-algorithm',alg)
            while not page.locator('#lesson-r-next').is_disabled():
                s=snapshot('r')['runtime']
                if s['phase'] not in ['victim']:
                    assert not page.locator('#lesson-r [data-chosen=true]').count()
                if alg=='CLOCK' and s['phase']=='clear':
                    assert 0 in s['bit']
                next_step('r')
            assert snapshot('r')['runtime']['done'] == 6
        passed('OPT and Clock complete; Clock exposes bit clearing, physical frames, and actual pointer')
        edit('r',{'refs':'-1'})
        assert page.locator('#lesson-r-next').is_disabled()
        page.select_option('#lesson-r-algorithm','FIFO')
        assert not page.locator('#lesson-r-next').is_disabled()
        assert page.locator('#lesson-r-refs').input_value() == '1 2 3 1 4 2'
        page.locator('#lesson-r .lesson-settings').evaluate('(el)=>el.open=false')
        passed('Invalid custom input cannot run or poison the next valid algorithm/example')

        page.select_option('#lesson-r-example','short')
        page.locator('#lesson-r-play').click()
        page.wait_for_timeout(1700)
        select('b')
        pos=page.evaluate("MemoryTeaching.position('r').cursor")
        page.wait_for_timeout(1750)
        assert page.evaluate("MemoryTeaching.position('r').cursor") == pos
        assert page.locator('#lesson-r-play').inner_text() == 'Tự chạy'
        passed('Autoplay stops when switching lessons')

        for width,height in [(1366,900),(390,844),(375,812),(844,390)]:
            page.set_viewport_size({'width':width,'height':height})
            for id in TOPICS:
                select(id)
                page.wait_for_timeout(160)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),(id,width)
                for action in ['prev','next','play','reset']:
                    assert page.locator(f'#lesson-{id}-{action}').is_visible()
                if width in [1366,390]:
                    page.screenshot(path=str(OUT/f'{id}-{width}.png'),full_page=True)
        page.locator('#t0').focus()
        page.keyboard.press('ArrowRight')
        assert page.locator('#t1').get_attribute('aria-selected') == 'true'
        passed('Desktop/mobile/landscape, reduced motion, no overflow, reachable controls and keyboard tabs')
        assert errors == [],errors
        passed('No JavaScript page errors')
        browser.close()
    (OUT/'results.json').write_text(json.dumps({'passed':checks,'pageErrors':errors},ensure_ascii=False,indent=2))
    print(f'{len(checks)} groups passed; screenshots: {OUT}')


if __name__ == '__main__':
    run()
