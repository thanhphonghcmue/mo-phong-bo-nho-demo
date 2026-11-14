"""Current-step focus and anchored-route acceptance in the public five demos."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE=os.getenv('MEMORY_DEMO_URL','http://127.0.0.1:8080')
OUT=Path('/tmp/memory-flow-review')
TOPICS={'b':'t0','a':'t1','x':'t2','v':'t4','r':'t3'}

GEOMETRY=r'''canvas=>{
 const faults=[],paths=[...canvas.querySelectorAll('.lesson-flow-path')];
 const borderDistance=(p,r)=>Math.min(
  Math.hypot(p.x-r.left,Math.max(r.top-p.y,0,p.y-r.bottom)),
  Math.hypot(p.x-r.right,Math.max(r.top-p.y,0,p.y-r.bottom)),
  Math.hypot(p.y-r.top,Math.max(r.left-p.x,0,p.x-r.right)),
  Math.hypot(p.y-r.bottom,Math.max(r.left-p.x,0,p.x-r.right)));
 for(const path of paths){
  const from=canvas.querySelector(path.dataset.from),to=canvas.querySelector(path.dataset.to);
  if(!from||!to){faults.push('missing endpoint');continue;}
  const numbers=path.getAttribute('d').match(/-?[\d.]+/g).map(Number);
  for(let i=2;i<numbers.length;i+=2)if(numbers[i]!==numbers[i-2]&&numbers[i+1]!==numbers[i-1])faults.push('diagonal connector');
  const length=path.getTotalLength(),matrix=path.getScreenCTM();
  const at=d=>path.getPointAtLength(d).matrixTransform(matrix);
  if(borderDistance(at(0),from.getBoundingClientRect())>3)faults.push('detached source '+path.dataset.from);
  if(borderDistance(at(length),to.getBoundingClientRect())>3)faults.push('detached target '+path.dataset.to);
  const obstacles=[...canvas.querySelectorAll('[data-flow-node],.hw-visual,.hw-cpu-readout,.hw-ssd-readout,.hw-component-heading,.hw-part-detail,.hw-simulation-note,.hw-model-caption,.hw-ram-footer,.lesson-live-step,.paging-table-label,.paging-os-ribbon,.foundation-check,.foundation-zone,.allocation-hole,.replacement-proof')]
   .filter(el=>el!==from&&el!==to&&!el.contains(from)&&!el.contains(to)&&!from.contains(el)&&!to.contains(el)&&el.getClientRects().length);
  for(let d=8;d<length-8;d+=5){
   const p=at(d);
   if(p.x<0||p.x>innerWidth)faults.push('route outside viewport');
   for(const el of obstacles){const r=el.getBoundingClientRect();
    if(p.x>r.left+2&&p.x<r.right-2&&p.y>r.top+2&&p.y<r.bottom-2){faults.push('route crosses '+(el.dataset.flowNode||el.className));break;}}
  }
 }
 return [...new Set(faults)];
}'''


def run():
 OUT.mkdir(exist_ok=True)
 passed=[];errors=[];states_checked=0
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://fonts.googleapis.com/**',lambda r:r.abort())
  page.goto(BASE,wait_until='networkidle');page.wait_for_function('window.MemoryLessonFlow && window.MemoryLessons')

  def check(name):passed.append(name);print('PASS',name,flush=True)
  def select(id):page.locator('#'+TOPICS[id]).click()
  def current(id):return page.evaluate('''id=>{const e=MemoryTeaching.event(id);return {event:e,state:MemoryTeaching.snapshot(id),position:MemoryTeaching.position(id)}}''',id)
  def validate(id):
   nonlocal states_checked
   page.wait_for_function('id=>document.querySelector("#lesson-"+id+" .lesson-canvas").dataset.flowReady==="true"',arg=id)
   canvas=page.locator('#lesson-'+id+' .lesson-canvas')
   expect(canvas.locator('.lesson-focus')).to_have_count(1)
   assert canvas.locator('.lesson-live-step strong').inner_text().strip()
   assert canvas.locator('.lesson-focus').get_attribute('data-flow-focus')=='true'
   data=page.evaluate('''id=>{const e=MemoryTeaching.event(id);e.state=MemoryTeaching.snapshot(id);const m=MemoryLessonViews[id](e,MemoryTeaching.position(id));const c=document.querySelector('#lesson-'+id+' .lesson-canvas');return {expected:m.flows?.length||0,actual:c.querySelectorAll('.lesson-flow-path').length}}''',id)
   assert data['expected']==data['actual'],(id,current(id)['event']['title'],data)
   geometry=canvas.evaluate(GEOMETRY)
   assert not geometry,(id,current(id)['event']['title'],geometry)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),id
   states_checked+=1
   return canvas
  def step(id):page.locator('#lesson-'+id+'-next').click()
  def finish(id):
   for _ in range(180):
    validate(id)
    if page.locator('#lesson-'+id+'-next').is_disabled():return
    step(id)
   raise AssertionError('Timeline did not finish')
  def seek(id,predicate):
   for _ in range(180):
    canvas=validate(id);data=current(id)
    if predicate(data):return canvas,data
    assert not page.locator('#lesson-'+id+'-next').is_disabled()
    step(id)
   raise AssertionError('Expected step not found')

  select('b');finish('b')
  assert page.locator('#lesson-b .lesson-focus').get_attribute('data-flow-node')=='region-inside'
  assert page.locator('#lesson-b .lesson-flow-path').get_attribute('data-to')=='[data-flow-node="region-inside"]'
  page.select_option('#lesson-b-example','outside');finish('b')
  assert page.locator('#lesson-b .lesson-focus').get_attribute('data-flow-node')=='check-upper'
  assert page.locator('#lesson-b .lesson-focus').get_attribute('data-flow-tone')=='red'
  assert page.locator('#lesson-b .lesson-flow-path').count()==0
  check('Protection: exact check glows; allowed access reaches RAM and blocked access has no data arrow')

  select('a')
  for algorithm in ['first','best','worst']:
   page.select_option('#lesson-a-example','small');page.select_option('#lesson-a-algorithm',algorithm)
   for _ in range(100):
    canvas=validate('a');data=current('a');title=data['event']['title']
    arrows=canvas.locator('.lesson-flow-path[data-kind="data"]')
    assert (arrows.count()>0)==title.startswith('Cập nhật RAM'),title
    if title.startswith('Chọn Lỗ'):assert canvas.locator('.lesson-focus').get_attribute('data-flow-node').startswith('hole-')
    if page.locator('#lesson-a-next').is_disabled():break
    step('a')
  check('All fit rules: scan/choice highlight the exact hole; data moves only when RAM is updated')

  select('x');page.select_option('#lesson-x-example','miss')
  canvas,_=seek('x',lambda d:d['event']['title'].startswith('Tra bảng'))
  assert canvas.locator('.lesson-focus').get_attribute('data-flow-node')=='pte'
  assert canvas.locator('.lesson-flow-path').get_attribute('data-from')=='[data-flow-node="tlb"]'
  finish('x');assert page.locator('#lesson-x .lesson-focus').get_attribute('data-flow-node')=='byte-1'
  page.select_option('#lesson-x-example','hit');finish('x')
  assert page.locator('#lesson-x .hw-ssd').count()==0
  check('Translation: TLB, page-table entry and exact byte are distinct focus targets')

  select('v');page.select_option('#lesson-v-example','load')
  canvas,data=seek('v',lambda d:d['event']['kind']=='page-in')
  assert data['state']['ram']==[0,3] and not data['state']['pt'][3]['present']
  assert canvas.locator('.lesson-focus').get_attribute('data-flow-node')=='frame-1'
  assert 'storage' in canvas.locator('.lesson-flow-path').get_attribute('data-from')
  step('v');canvas=validate('v')
  assert canvas.locator('.lesson-focus').get_attribute('data-flow-node')=='pte'
  assert canvas.locator('.lesson-flow-path').get_attribute('data-from')=='[data-flow-node="os"]'
  assert canvas.locator('.lesson-flow-path').get_attribute('data-kind')=='lookup'
  finish('v')
  check('Demand paging: SSD reaches the chosen frame, then OS updates the page-table entry separately')

  select('r')
  for algorithm in ['FIFO','LRU','OPT','CLOCK']:
   page.select_option('#lesson-r-example','short');page.select_option('#lesson-r-algorithm',algorithm)
   for _ in range(100):
    canvas=validate('r');data=current('r');rt=data['state']['runtime'];phase=rt['phase']
    active=canvas.locator('.lesson-focus').get_attribute('data-flow-node')
    if phase=='victim':assert active==f'frame-{rt["slot"]}'
    if phase=='inspect':assert active==f'frame-{rt["ptr"]}'
    if phase=='clear':assert active==f'bit-{data["event"]["beforeState"]["runtime"]["ptr"]}'
    assert canvas.locator('.lesson-flow-path[data-kind="data"]').count()==(1 if phase=='apply' else 0)
    if phase=='apply':
     arrow=canvas.locator('.lesson-flow-path')
     if data['event']['kind']=='read':
      assert arrow.get_attribute('data-from')==f'[data-flow-node="frame-{rt["slot"]}"]'
      assert canvas.locator('.hw-ssd').count()==0
     else:assert arrow.get_attribute('data-to')==f'[data-flow-node="frame-{rt["slot"]}"]'
    if page.locator('#lesson-r-next').is_disabled():break
    step('r')
  check('FIFO/LRU/OPT/Clock: exact victim/bit glow; SSD loads and RAM hits use the correct direction')

  for width,height in [(390,844),(375,812)]:
   page.set_viewport_size({'width':width,'height':height})
   for id in TOPICS:
    select(id);page.select_option('#lesson-'+id+'-example',index=0)
    if id=='a':page.select_option('#lesson-a-algorithm','best')
    finish(id)
    canvas=validate(id)
    assert canvas.locator('.lesson-live-step strong').evaluate('el=>parseFloat(getComputedStyle(el).fontSize)')>=16
    if id=='v':
     page.locator('#lesson-v-prev').click();validate('v')
     page.locator('#lesson-v-explanation > summary').click()
    page.screenshot(path=str(OUT/f'{id}-{width}-flow.png'),full_page=True)
  check('375/390px: routes remain attached, avoid other labels/parts, and all five scenes fit without page overflow')

  animated=page.locator('.lesson-focus,.lesson-flow-travel').evaluate_all('(els)=>els.map(el=>getComputedStyle(el).animationName)')
  assert animated and all(name=='none' for name in animated),animated
  assert not errors,errors
  check('Reduced-motion keeps static focus/arrows; no JavaScript page errors')
  browser.close()
 (OUT/'flow-results.json').write_text(json.dumps({'passed':passed,'statesChecked':states_checked,'pageErrors':errors},ensure_ascii=False,indent=2))
 print(f'{len(passed)} groups passed; {states_checked} rendered states checked; artifacts: {OUT}')

if __name__=='__main__':run()
