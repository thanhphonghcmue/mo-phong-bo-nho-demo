"""Browser acceptance for the physical-hardware presentation of all five demos.

Run against python3 -m http.server 8080. Requires Playwright + Chromium.
The blocked-atlas check uses a fresh context so the image cache cannot hide it.
"""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright


BASE = os.getenv('MEMORY_DEMO_URL', 'http://127.0.0.1:8080').rstrip('/')
OUT = Path('/tmp/memory-hardware-review')
TOPICS = {'b': 't0', 'a': 't1', 'x': 't2', 'v': 't4', 'r': 't3'}

# These labels sit on flat canvas/gallery backgrounds. Composite transparent
# ancestors instead of assuming white, and inspect the actual rendered colors.
CONTRAST = r"""() => {
    const parse = value => {
        const m = value.match(/[\d.]+/g);
        return m ? [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]] : [0,0,0,0];
    };
    const over = (a, b) => {
        const alpha = a[3] + b[3] * (1 - a[3]);
        return [0,1,2].map(i => (a[i] * a[3] + b[i] * b[3] * (1 - a[3])) / alpha).concat(alpha);
    };
    const background = el => {
        const ancestors = [];
        for (let node = el; node; node = node.parentElement) ancestors.push(node);
        return ancestors.reverse().reduce((color, node) => over(parse(getComputedStyle(node).backgroundColor), color), [255,255,255,1]);
    };
    const luminance = rgb => rgb.slice(0,3).map(v => {
        v /= 255;
        return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, i) => sum + value * [.2126,.7152,.0722][i], 0);
    const selectors = '.hw-part-detail,.hw-simulation-note,.hw-component-heading span,.hw-cpu-readout>p,.hw-ssd-readout>p,.hardware-guide figcaption strong,.hardware-guide figcaption p,.hardware-guide-note,.hardware-guide summary>small';
    return [...document.querySelectorAll(selectors)]
        .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden')
        .map(el => {
            const bg = background(el), fg = over(parse(getComputedStyle(el).color), bg);
            const light = luminance(fg), dark = luminance(bg);
            return {
                text: el.textContent.trim(), color: getComputedStyle(el).color,
                background: bg.slice(0,3), contrast: (Math.max(light,dark) + .05) / (Math.min(light,dark) + .05),
            };
        });
}"""


def run():
    OUT.mkdir(exist_ok=True)
    checks, errors, contrast_samples = [], [], []

    def passed(name):
        checks.append(name)
        print('PASS', name, flush=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=os.getenv('CHROMIUM_PATH', '/usr/bin/chromium'),
            headless=True, args=['--no-sandbox'])
        context = browser.new_context(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        page.goto(BASE, wait_until='networkidle')
        page.wait_for_function('window.MemoryLessons && window.MemoryHardware')
        page.wait_for_function('document.documentElement.dataset.hwPhotos === "ready"')
        atlas = page.evaluate("""() => new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve({width: image.naturalWidth, height: image.naturalHeight});
            image.onerror = reject;
            image.src = new URL('assets/images/hardware/parts.png', location.href).href;
        })""")
        assert atlas['width'] >= 1000 and atlas['width'] == atlas['height'], atlas
        passed('Hardware atlas decodes in Chromium at full resolution')

        def select(topic):
            page.locator('#' + TOPICS[topic]).click()

        def snapshot(topic):
            return page.evaluate('id => MemoryTeaching.snapshot(id)', topic)

        def event(topic):
            return page.evaluate('id => MemoryTeaching.event(id)', topic)

        def seek(topic, predicate):
            for _ in range(400):
                if predicate(event(topic), snapshot(topic)):
                    return
                button = page.locator(f'#lesson-{topic}-next')
                assert not button.is_disabled(), (topic, event(topic))
                button.click()
            raise AssertionError(('Timeline did not reach expected hardware state', topic))

        def finish(topic):
            seek(topic, lambda _event, _state: page.locator(f'#lesson-{topic}-next').is_disabled())

        def visible_parts(topic):
            canvas = page.locator(f'#lesson-{topic} .lesson-canvas')
            for part in ['cpu', 'ram']:
                assert canvas.locator('.hw-' + part).count() == 1, (topic, part)
                photo = canvas.locator('.hw-photo--' + part)
                assert photo.is_visible(), (topic, part)
                opacity = photo.evaluate('el => getComputedStyle(el).opacity')
                assert opacity == '1', (topic, part, page.viewport_size, opacity, page.evaluate('document.documentElement.dataset.hwPhotos'))
                assert canvas.locator('.hw-visual--' + part).get_attribute('aria-hidden') == 'true'
            assert 'chip' in canvas.inner_text().lower(), topic
            assert canvas.locator('.hw-photo--gpu').count() == 0, topic
            assert canvas.locator('.hw-ram-slots').inner_text().strip(), topic

        for topic in TOPICS:
            select(topic)
            visible_parts(topic)
            contrast_samples.extend(page.evaluate(CONTRAST))
        passed('All five lessons show CPU and a physical DIMM with live, explicitly simulated memory regions')

        # The picture of storage must agree with the engine: a resident page
        # is used in RAM; a missing page is copied from SSD into a real frame.
        select('v')
        page.select_option('#lesson-v-example', 'load')
        seek('v', lambda current, _state: current['kind'] == 'page-in')
        state = snapshot('v')
        assert state['ram'] == [0, 3] and not state['pt'][3]['present']
        assert page.locator('#lesson-v .hw-ssd').count() == 1
        assert 'Trang 3' in page.locator('#lesson-v .hw-ssd-readout').inner_text()
        for frame, contents in enumerate(state['ram']):
            chip = page.locator(f'#lesson-v .hw-ram-slots [data-paging-frame="{frame}"]')
            assert f'Trang {contents}' in chip.inner_text()
        tag_colors = 'el => {const s=getComputedStyle(el);return {ink:s.color,fill:s.backgroundColor}}'
        assert page.locator('#lesson-v .hw-ssd-readout .hw-data-tag').evaluate(tag_colors) == page.locator(
            '#lesson-v [data-paging-frame="1"] .paging-page-tag').evaluate(tag_colors)
        page.screenshot(path=str(OUT / 'demand-ssd-to-ram.png'), full_page=True)
        page.select_option('#lesson-v-example', 'hit')
        before = snapshot('v')['ram']
        finish('v')
        state = snapshot('v')
        assert state['ram'] == before and state['faults'] == 0 and state['reads'] == 0
        assert page.locator('#lesson-v .hw-ssd').count() == 0
        assert 'bỏ qua OS và đĩa' in page.locator('#lesson-v .lesson-canvas').inner_text()
        visible_parts('v')
        passed('Demand paging shows the actual SSD→RAM copy with consistent page color, then removes SSD on a resident hit')

        select('r')
        for algorithm in ['FIFO', 'LRU', 'OPT', 'CLOCK']:
            page.select_option('#lesson-r-example', 'short')
            page.select_option('#lesson-r-algorithm', algorithm)
            seek('r', lambda current, state: state['runtime']['phase'] == 'apply' and current['kind'] != 'read')
            assert page.locator('#lesson-r .hw-ssd').count() == 1, algorithm
            state = snapshot('r')['runtime']
            for frame, contents in enumerate(state['fr']):
                text = page.locator(f'#lesson-r .hw-ram-slots [data-lesson-frame="{frame}"]').inner_text()
                assert ('Trống' if contents is None else f'Trang {contents}') in text
            seek('r', lambda _current, state: state['runtime']['t'] == 3 and state['runtime']['phase'] == 'request')
            before = snapshot('r')['runtime']
            assert before['fr'] == [1, 2, 3]
            assert page.locator('#lesson-r .hw-ssd').count() == 0, algorithm
            page.locator('#lesson-r-next').click()
            state = snapshot('r')['runtime']
            assert event('r')['kind'] == 'read' and state['fr'] == before['fr']
            assert state['hits'] == 1 and state['faults'] == 3, (algorithm, state)
            assert page.locator('#lesson-r .hw-ssd').count() == 0, algorithm
            assert 'không đọc SSD' in page.locator('#lesson-r .replacement-hit-note').inner_text()
            visible_parts('r')
        passed('FIFO/LRU/OPT/Clock physical frame labels match state; SSD is absent before and during hits')

        positions = page.evaluate('Object.fromEntries(["b","a","x","v","r"].map(id => [id, MemoryTeaching.position(id)]))')
        states = {topic: snapshot(topic) for topic in TOPICS}
        guide = page.locator('#hardware-guide')
        assert not guide.evaluate('el => el.open')
        guide.locator('summary').click()
        gpu = guide.locator('figure').filter(has=page.locator('.hw-photo--gpu'))
        assert gpu.is_visible()
        assert 'không tham gia các thuật toán RAM trong 5 demo này' in gpu.inner_text()
        assert 'minh họa' in guide.locator('.hardware-guide-note').inner_text()
        contrast_samples.extend(page.evaluate(CONTRAST))
        page.screenshot(path=str(OUT / 'optional-hardware-gallery.png'), full_page=True)
        guide.locator('summary').click()
        assert page.evaluate('Object.fromEntries(["b","a","x","v","r"].map(id => [id, MemoryTeaching.position(id)]))') == positions
        assert {topic: snapshot(topic) for topic in TOPICS} == states
        passed('Optional GPU gallery teaches its role without adding GPU to an algorithm or changing any timeline')

        for width, height in [(1440, 1000), (390, 844), (375, 812)]:
            page.set_viewport_size({'width': width, 'height': height})
            for topic in TOPICS:
                select(topic)
                page.wait_for_timeout(80)
                assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (topic, width)
                visible_parts(topic)
                controls = page.locator(f'#lesson-{topic} .lesson-controls')
                bounds = controls.bounding_box()
                assert bounds and bounds['x'] >= 0 and bounds['y'] >= 0, (topic, width, bounds)
                assert bounds['x'] + bounds['width'] <= width + 1, (topic, width, bounds)
                assert bounds['y'] + bounds['height'] <= height + 1, (topic, width, bounds)
                for action in ['prev', 'next', 'play', 'reset']:
                    button = page.locator(f'#lesson-{topic}-{action}')
                    assert button.is_visible()
                    assert button.evaluate('''el => {
                        const r = el.getBoundingClientRect();
                        return r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0
                            && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1
                            && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('button') === el;
                    }'''), (topic, action, width)
                contrast_samples.extend(page.evaluate(CONTRAST))
                if width in [1440, 375]:
                    page.screenshot(path=str(OUT / f'{topic}-{width}.png'), full_page=True)
            guide.locator('summary').click()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), ('gallery', width)
            guide.locator('summary').click()
        passed('1440/390/375px: no horizontal overflow; all four sticky playback controls stay in view and unobscured')

        failures = [sample for sample in contrast_samples if sample['contrast'] < 4.5]
        assert not failures, json.dumps(failures, ensure_ascii=False, indent=2)
        passed('Hardware headings, detail text, simulation notes and gallery captions meet 4.5:1 text contrast')

        # Use a separate context: the success path above must not populate this
        # request's cache. Algorithms and physical CSS illustrations remain usable.
        fallback_context = browser.new_context(viewport={'width': 375, 'height': 812}, reduced_motion='reduce')
        fallback = fallback_context.new_page()
        fallback.on('pageerror', lambda error: errors.append(str(error)))
        fallback.route('https://fonts.googleapis.com/**', lambda route: route.abort())
        blocked_requests = []

        def block_atlas(route):
            blocked_requests.append(route.request.url)
            route.abort()

        fallback.route('**/assets/images/hardware/parts.png', block_atlas)
        fallback.goto(BASE, wait_until='networkidle')
        fallback.wait_for_function('window.MemoryLessons && window.MemoryHardware')
        assert blocked_requests
        assert fallback.evaluate('document.documentElement.dataset.hwPhotos') != 'ready'
        for topic, tab in TOPICS.items():
            fallback.locator('#' + tab).click()
            for part in ['cpu', 'ram']:
                illustration = fallback.locator(f'#lesson-{topic} .hw-fallback--{part}')
                assert illustration.is_visible(), (topic, part)
                assert illustration.evaluate('el => getComputedStyle(el).visibility') == 'visible'
                assert fallback.locator(f'#lesson-{topic} .hw-photo--{part}').evaluate('el => getComputedStyle(el).opacity') == '0'
            assert fallback.locator(f'#lesson-{topic} .hw-ram-slots').inner_text().strip()
            assert fallback.evaluate('document.documentElement.scrollWidth <= innerWidth'), topic
        fallback.locator('#t4').click()
        fallback.select_option('#lesson-v-example', 'hit')
        for _ in range(50):
            button = fallback.locator('#lesson-v-next')
            if button.is_disabled():
                break
            button.click()
        else:
            raise AssertionError('Fallback demand paging did not finish')
        state = fallback.evaluate('MemoryTeaching.snapshot("v")')
        assert state['faults'] == 0 and state['reads'] == 0
        assert fallback.locator('#lesson-v .hw-ssd').count() == 0
        fallback.screenshot(path=str(OUT / 'missing-atlas-fallback-375.png'), full_page=True)
        passed('Blocked atlas keeps recognizable CPU/DIMM illustrations, labels and live algorithms usable in all five lessons')
        assert not errors, errors
        passed('No JavaScript page errors in normal or missing-image contexts')
        browser.close()

    (OUT / 'results.json').write_text(json.dumps({
        'passed': checks, 'pageErrors': errors, 'atlas': atlas,
        'minimumTextContrast': round(min(sample['contrast'] for sample in contrast_samples), 3),
    }, ensure_ascii=False, indent=2))
    print(f'{len(checks)} groups passed; screenshots: {OUT}')


if __name__ == '__main__':
    run()
