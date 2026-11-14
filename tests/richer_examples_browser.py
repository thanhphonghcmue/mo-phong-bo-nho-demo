"""Acceptance checks for the moderately richer examples in the public lessons.

Keep the small defaults; verify the additional branches, warm RAM and exact
reversible transitions. Run with the static server on port 8080.
"""
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.getenv('MEMORY_DEMO_URL', 'http://127.0.0.1:8080')
OUT = Path('/tmp/memory-richer-examples')
TOPICS = {'b': 't0', 'a': 't1', 'x': 't2', 'v': 't4', 'r': 't3'}
R_RESULTS = {
    'FIFO': {'hits': 2, 'faults': 4, 'ram': [2, 5, 1], 'victims': [1, 2, 3, 4]},
    'LRU': {'hits': 2, 'faults': 4, 'ram': [5, 1, 2], 'victims': [2, 3, 1, 4]},
    'OPT': {'hits': 4, 'faults': 2, 'ram': [1, 2, 5], 'victims': [3, 4]},
    'CLOCK': {'hits': 2, 'faults': 4, 'ram': [2, 1, 5], 'victims': [1, 3, 2, 4]},
}

GEOMETRY = r'''canvas => {
    const faults = [];
    const borderDistance = (p, r) => Math.min(
        Math.hypot(p.x-r.left, Math.max(r.top-p.y, 0, p.y-r.bottom)),
        Math.hypot(p.x-r.right, Math.max(r.top-p.y, 0, p.y-r.bottom)),
        Math.hypot(p.y-r.top, Math.max(r.left-p.x, 0, p.x-r.right)),
        Math.hypot(p.y-r.bottom, Math.max(r.left-p.x, 0, p.x-r.right)));
    for (const path of canvas.querySelectorAll('.lesson-flow-path')) {
        const source = canvas.querySelector(path.dataset.from);
        const target = canvas.querySelector(path.dataset.to);
        if (!source || !target) { faults.push('missing endpoint'); continue; }
        const matrix = path.getScreenCTM();
        const start = path.getPointAtLength(0).matrixTransform(matrix);
        const end = path.getPointAtLength(path.getTotalLength()).matrixTransform(matrix);
        if (borderDistance(start, source.getBoundingClientRect()) > 3)
            faults.push('detached source: ' + path.dataset.from);
        if (borderDistance(end, target.getBoundingClientRect()) > 3)
            faults.push('detached target: ' + path.dataset.to);
        const points = path.getAttribute('d').match(/-?[\d.]+/g).map(Number);
        for (let i=2; i<points.length; i+=2)
            if (points[i] !== points[i-2] && points[i+1] !== points[i-1])
                faults.push('diagonal route');
    }
    return [...new Set(faults)];
}'''


def run():
    OUT.mkdir(exist_ok=True)
    passed, errors = [], []
    rendered_states = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=os.getenv('CHROMIUM_PATH', '/usr/bin/chromium'),
            headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        page.goto(BASE, wait_until='networkidle')
        page.wait_for_function('window.MemoryLessons && window.MemoryLessonFlow')

        def check(name):
            passed.append(name)
            print('PASS', name, flush=True)

        def select(topic, example=None):
            page.locator('#'+TOPICS[topic]).click()
            if example is not None:
                page.select_option(f'#lesson-{topic}-example', example)

        def state(topic):
            return page.evaluate('id => MemoryTeaching.snapshot(id)', topic)

        def event(topic):
            return page.evaluate('id => MemoryTeaching.event(id)', topic)

        def position(topic):
            return page.evaluate('id => MemoryTeaching.position(id)', topic)

        def validate(topic):
            nonlocal rendered_states
            page.wait_for_function('''id => document.querySelector(
                '#lesson-'+id+' .lesson-canvas').dataset.flowReady === 'true' ''', arg=topic)
            canvas = page.locator(f'#lesson-{topic} .lesson-canvas')
            expect(canvas.locator('.lesson-focus')).to_have_count(1)
            counts = page.evaluate('''id => {
                const e=MemoryTeaching.event(id); e.state=MemoryTeaching.snapshot(id);
                const model=MemoryLessonViews[id](e, MemoryTeaching.position(id));
                return {expected: model.flows?.length || 0,
                    actual: document.querySelectorAll('#lesson-'+id+' .lesson-flow-path').length};
            }''', topic)
            assert counts['actual'] == counts['expected'], (topic, event(topic)['title'], counts)
            geometry = canvas.evaluate(GEOMETRY)
            assert not geometry, (topic, event(topic)['title'], geometry)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), topic
            rendered_states += 1
            return canvas

        def next_step(topic):
            page.locator(f'#lesson-{topic}-next').click()

        def finish(topic):
            for _ in range(300):
                validate(topic)
                if page.locator(f'#lesson-{topic}-next').is_disabled():
                    return
                next_step(topic)
            raise AssertionError(('Timeline did not finish', topic))

        def seek(topic, predicate):
            for _ in range(300):
                validate(topic)
                if predicate(event(topic), state(topic)):
                    return
                assert not page.locator(f'#lesson-{topic}-next').is_disabled(), (topic, event(topic))
                next_step(topic)
            raise AssertionError(('Expected transition missing', topic))

        expected_defaults = {'b': 'translate', 'a': 'sequence', 'x': 'fault', 'v': 'dirty', 'r': 'practice'}
        for topic, example in expected_defaults.items():
            expect(page.locator(f'#lesson-{topic}-example')).to_have_value(example)
        assert state('b')['mode'] == 'translate' and state('b')['offset'] == 24
        assert state('a')['holes'] == [5, 8, 4, 7]
        assert state('x')['pt'] == [5, 6, 1, None]
        assert state('v')['ram'] == [0, 1] and state('v')['pt'][0]['dirty']
        assert state('r')['runtime']['fr'] == [1, 2, 3]
        check('On open, all five lessons select the moderately richer examples with their matching initial states')

        # Relocation uses an offset, rather than treating that offset as a
        # physical address. The two branches share the same four engine events.
        select('b', 'translate')
        assert state('b')['mode'] == 'translate'
        assert state('b')['offset'] == 24 and state('b')['base'] == 100 and state('b')['limit'] == 40
        assert position('b')['total'] == 4
        expect(page.locator('#lesson-b-address')).to_have_value('24')
        label = page.locator('#lesson-b-address').locator('..').locator('.lesson-field-label').text_content()
        assert 'L' in label and ('logic' in label.lower() or 'lệch' in label.lower()), label
        for _ in range(2):
            validate('b')
            assert '100 + 24 = 124' not in page.locator('#lesson-b .lesson-canvas').inner_text()
            next_step('b')
        assert '100 + 24 = 124' in validate('b').inner_text()
        finish('b')
        assert state('b')['pa'] == 124 and state('b')['isValid']
        page.locator('#lesson-b .lesson-settings').evaluate('el => el.open=true')
        page.locator('#lesson-b-address').fill('10')
        page.locator('#lesson-b .lesson-settings button[type="submit"]').click()
        assert state('b')['mode'] == 'translate' and state('b')['offset'] == 10
        finish('b')
        assert state('b')['pa'] == 110
        select('b', 'translate-outside')
        finish('b')
        assert state('b')['offset'] == 40 and state('b')['pa'] is None and not state('b')['isValid']
        assert page.locator('#lesson-b .lesson-flow-path').count() == 0
        check('Relocation: L24→PA124, edited L10→PA110, L40 traps, and the form preserves offset mode')

        select('a', 'sequence')
        allocations = {
            'first': ([0, 1, 2], [1, 2, 1, 7]),
            'best': ([2, 3, 0], [2, 8, 0, 1]),
            'worst': ([1, 3, 0], [2, 4, 4, 1]),
        }
        for algorithm, (holes, final_free) in allocations.items():
            page.select_option('#lesson-a-algorithm', algorithm)
            assert state('a')['holes'] == [5, 8, 4, 7] and state('a')['reqs'] == [4, 6, 3]
            choices = []
            for _ in range(100):
                validate('a')
                current = event('a')
                if current['title'].startswith('Chọn Lỗ'):
                    choices.append(state('a')['runtime']['scan'])
                    before = state('a')['runtime']['free']
                    next_step('a')
                    after = state('a')['runtime']['free']
                    assert sum(before)-sum(after) == state('a')['reqs'][len(choices)-1]
                    continue
                if page.locator('#lesson-a-next').is_disabled():
                    break
                next_step('a')
            assert choices == holes, (algorithm, choices)
            assert state('a')['runtime']['free'] == final_free, algorithm
        check('Four-hole/three-request sequence distinguishes First/Best/Worst-fit with exact residual sizes')

        select('x', 'fault')
        assert state('x')['pt'] == [5, 6, 1, None] and position('x')['total'] == 8
        seek('x', lambda e, s: e['title'].startswith('Tra bảng'))
        assert state('x')['pt'][3] is None and state('x')['faults'] == 1
        canvas = validate('x')
        assert 'Chưa tạo địa chỉ vật lý' in canvas.locator('.paging-address-result').inner_text()
        assert 'Khung 0' not in canvas.inner_text()
        seek('x', lambda e, s: e['kind'] == 'page-in')
        assert state('x')['pt'][3] == 0 and state('x')['freeF'] == [2, 3, 4, 7]
        assert canvas.locator('.hw-ssd').count() == 1
        arrow = page.locator('#lesson-x .lesson-flow-path[data-kind="data"]')
        assert 'storage' in arrow.get_attribute('data-from')
        assert arrow.get_attribute('data-to') == '[data-flow-node="frame"]'
        finish('x')
        final_x = state('x')
        assert final_x['plan']['phys'] == 1 and final_x['plan']['f'] == 0
        assert (final_x['hit'], final_x['miss'], final_x['faults']) == (0, 1, 1)
        check('True page fault: no early frame/PA, SSD loads frame0, TLB is filled, and LA13 resolves to PA1')

        select('v', 'dirty')
        assert state('v')['ram'] == [0, 1] and state('v')['pt'][0]['dirty']
        assert position('v')['total'] == 21
        expect(page.locator('#lesson-v [data-paging-frame="0"] .paging-dirty-bit[data-dirty="true"]')).to_have_count(1)
        expect(page.locator('#lesson-v .paging-state-ledger')).to_have_count(1)
        expect(page.locator('#lesson-v .paging-io-counts')).to_have_count(1)
        dirty_label = page.locator('#lesson-v [data-paging-frame="0"]').inner_text()
        assert re.search(r'D\s*=\s*1', dirty_label) or 'đã sửa' in dirty_label.lower(), dirty_label
        seek('v', lambda e, s: e['kind'] == 'page-out')
        saved = state('v')
        assert saved['ram'] == [0, 1] and saved['reads'] == 0 and saved['writes'] == 1
        assert saved['pt'][0]['present'] and not saved['pt'][0]['dirty']
        expect(page.locator('#lesson-v [data-paging-frame="0"] .paging-dirty-bit[data-dirty="false"]')).to_have_count(1)
        arrow = page.locator('#lesson-v .lesson-flow-path[data-kind="data"]')
        assert arrow.get_attribute('data-from') == '[data-flow-node="frame-0"]'
        assert 'storage' in arrow.get_attribute('data-to')
        page.locator('#lesson-v-prev').click()
        assert state('v')['writes'] == 0 and state('v')['pt'][0]['dirty']
        next_step('v')
        assert state('v') == saved
        next_step('v')
        loaded = state('v')
        assert loaded['ram'] == [2, 1] and loaded['reads'] == 1
        assert not loaded['pt'][0]['present'] and not loaded['pt'][2]['present']
        next_step('v')
        committed = state('v')
        assert committed['pt'][2]['present'] and committed['pt'][2]['frame'] == 0
        page.locator('#lesson-v-prev').click()
        assert state('v') == loaded
        next_step('v')
        assert state('v') == committed
        finish('v')
        final_v = state('v')
        assert final_v['ram'] == [2, 3]
        assert {key: final_v[key] for key in ['accesses', 'hits', 'faults', 'reads', 'writes', 'denied']} == {
            'accesses': 4, 'hits': 2, 'faults': 2, 'reads': 2, 'writes': 1, 'denied': 0}
        check('Dirty sequence: writeback preserves old RAM, load precedes PTE commit, exact rewind and final 2hits/2faults/1write')

        select('r', 'practice')
        for algorithm, expected in R_RESULTS.items():
            page.select_option('#lesson-r-algorithm', algorithm)
            runtime = state('r')['runtime']
            assert runtime['fr'] == [1, 2, 3] and runtime['hits'] == runtime['faults'] == 0
            victims = []
            for _ in range(120):
                validate('r')
                runtime = state('r')['runtime']
                if runtime['phase'] == 'request':
                    assert page.locator('#lesson-r [data-chosen="true"]').count() == 0
                if runtime['phase'] == 'victim':
                    victims.append(runtime['victim'])
                    assert page.locator('#lesson-r [data-chosen="true"]').get_attribute('data-lesson-frame') == str(runtime['slot'])
                if runtime['t'] == 0 and runtime['phase'] == 'apply':
                    assert event('r')['kind'] == 'read' and runtime['hits'] == 1 and runtime['faults'] == 0
                    assert page.locator('#lesson-r .hw-ssd').count() == 0
                if page.locator('#lesson-r-next').is_disabled():
                    break
                next_step('r')
            runtime = state('r')['runtime']
            assert runtime['fr'] == expected['ram'], (algorithm, runtime)
            assert runtime['hits'] == expected['hits'] and runtime['faults'] == expected['faults'], algorithm
            assert victims == expected['victims'], (algorithm, victims)
        check('Warm RAM: resident pages are not counted as new faults; all four algorithms have exact victims and outcomes')

        # Selecting a small example after practice restores its complete initial
        # state, not just its visible selector label.
        for topic, example in [('b', 'inside'), ('a', 'small'), ('x', 'miss'), ('v', 'load'), ('r', 'short')]:
            select(topic, example)
        assert state('b')['mode'] == 'check' and state('b')['addr'] == 125
        assert state('a')['holes'] == [3, 6, 4] and state('a')['reqs'] == [4, 2]
        assert state('x')['pt'] == [5, 6, 1, 2]
        assert state('v')['ram'] == [0, None] and not any(pte['dirty'] for pte in state('v')['pt'])
        assert state('r')['runtime']['fr'] == [None, None, None]
        check('Returning to small examples restores the original configurations and removes warm/dirty/fault state')

        for width in [390, 375]:
            page.set_viewport_size({'width': width, 'height': 844 if width == 390 else 812})
            for topic, example in [('b', 'translate'), ('a', 'sequence'), ('x', 'fault'), ('v', 'dirty'), ('r', 'practice')]:
                select(topic, example)
                if topic == 'a':
                    page.select_option('#lesson-a-algorithm', 'best')
                if topic == 'r':
                    page.select_option('#lesson-r-algorithm', 'CLOCK')
                finish(topic)
                page.screenshot(path=str(OUT/f'{topic}-{width}.png'), full_page=True)
        check('390/375px: all richer examples complete with a single focus, attached orthogonal arrows and no page overflow')
        assert not errors, errors
        check('No JavaScript page errors')
        browser.close()
    (OUT/'results.json').write_text(json.dumps({
        'passed': passed, 'renderedStates': rendered_states, 'pageErrors': errors,
    }, ensure_ascii=False, indent=2))
    print(f'{len(passed)} groups passed; {rendered_states} rendered states; artifacts: {OUT}')


if __name__ == '__main__':
    run()
