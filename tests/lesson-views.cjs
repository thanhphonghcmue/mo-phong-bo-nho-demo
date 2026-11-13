// Read-only lesson view regression: decisions must be explained from actual engine states.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'assets/js/lesson-replacement.js'), 'utf8'), context);
const render = context.window.MemoryLessonViews.r;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const simulate = vm.runInNewContext('(' + html.slice(html.indexOf('function simR('), html.indexOf('function frames(')) + ')');
const refs = [1, 2, 3, 1, 4, 2];
const order = view => [...view.html.matchAll(/data-page="(\d+)"/g)].map(match => Number(match[1]));
let checks = 0;

for (const alg of ['FIFO', 'LRU', 'OPT', 'CLOCK']) {
  let hits = 0, faults = 0;
  for (const step of simulate(refs, 3, alg)) {
    const state = { alg, refs, n: 3, runtime: { ...step.before, t: step.t, slot: step.slot, victim: step.victim, phase: 'request', done: step.t, hits, faults } };
    const before = JSON.stringify(state);
    const request = render({ state, beforeState: { runtime: step.before }, kind: 'request' });
    assert.equal(JSON.stringify(state), before, 'view must not mutate engine state');
    assert(!request.html.includes('data-chosen="true"'), 'request must not reveal a precomputed victim');
    assert(!request.title.includes('Chọn Trang'), 'request cannot announce a victim before selection');
    if (alg === 'CLOCK') assert(!request.html.includes('Kim đang xét'), 'idle pointer is not an active scan');
    if (step.victim !== null) {
      state.runtime.phase = 'victim';
      const decision = render({ state, beforeState: { runtime: step.before } });
      assert(decision.html.includes(`data-lesson-frame="${step.slot}" data-chosen="true"`), 'highlight exact selected frame');
      assert(decision.title.includes(String(step.victim)), 'name the actual engine victim');
      if (alg === 'FIFO' && step.t === 4) {
        assert.deepEqual(order(decision), [1, 2, 3], 'FIFO preserves arrival order after page 1 was used again');
        assert.equal(step.victim, 1);
        assert(decision.why.includes('nạp sớm nhất'));
      }
      if (alg === 'LRU' && step.t === 4) {
        assert.deepEqual(order(decision), [2, 3, 1], 'LRU uses last access, unlike FIFO');
        assert.equal(step.victim, 2);
      }
      if (alg === 'OPT') assert(decision.why.includes('phía sau') || decision.why.includes('muộn nhất'));
    }
    if (step.hit) hits++; else faults++;
    const applied = { alg, refs, n: 3, runtime: { ...step.after, t: step.t, slot: step.slot, victim: step.victim, phase: 'apply', done: step.t + 1, hits, faults } };
    const view = render({ state: applied, beforeState: { runtime: step.before }, kind: step.hit ? 'read' : 'page-in' });
    assert.equal(Boolean(view.result), step.t === refs.length - 1, 'only the final step claims completion');
    assert(view.html.includes(`Có sẵn: <b>${hits}</b>`));
    assert(view.html.includes(`cần nạp: <b>${faults}</b>`));
    if (alg === 'FIFO' && step.t === 3) {
      assert.deepEqual(order(view), [1, 2, 3], 'FIFO hit must not reorder');
      assert(view.why.includes('giữ nguyên'));
    }
    if (alg === 'FIFO' && step.t === 4) assert.deepEqual(order(view), [2, 3, 4], 'incoming page joins FIFO tail');
    checks++;
  }
}

const clockBefore = { fr: [1, 2, 3], bit: [1, 0, 1], ptr: 0, load: [0, 1, 2], last: [0, 1, 2] };
const inspect = render({ state: { alg: 'CLOCK', refs: [4], runtime: { ...clockBefore, t: 0, slot: 1, victim: 2, phase: 'inspect' } }, beforeState: { runtime: clockBefore } });
assert(inspect.title.includes('Khung 0'));
assert(inspect.why.includes('R=1'));
assert(!inspect.html.includes('data-chosen="true"'), 'giving a second chance is not selecting the future victim');
const cleared = render({ state: { alg: 'CLOCK', refs: [4], runtime: { ...clockBefore, bit: [0, 0, 1], ptr: 1, t: 0, slot: 1, victim: 2, phase: 'clear' } }, beforeState: { runtime: clockBefore } });
assert(cleared.title.includes('Khung 0'));
assert(cleared.title.includes('Khung 1'));
assert(cleared.why.includes('RAM chưa thay trang'));
assert(!cleared.html.includes('data-chosen="true"'));

console.log(`PASS lesson replacement views: ${checks} engine transitions; FIFO/LRU distinction, OPT evidence, Clock microsteps, no future disclosure, no state mutation.`);
