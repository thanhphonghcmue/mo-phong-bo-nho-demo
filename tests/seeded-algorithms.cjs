// Independent reference checks for configurable initial RAM and continuation state.
const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const html = fs.readFileSync(
  require("node:path").join(__dirname, "../index.html"),
  "utf8",
);
const code = html.slice(
  html.indexOf("function simR("),
  html.indexOf("function frames("),
);
const simulate = vm.runInNewContext("(" + code + ")");
const plain = (value) => JSON.parse(JSON.stringify(value));
let rng = 5032026;
const random = (n) => (rng = (1664525 * rng + 1013904223) >>> 0) % n,
  shuffle = (a) => {
    a = [...a];
    for (let i = a.length - 1; i > 0; i--) {
      const j = random(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
function reference(refs, n, alg, seed) {
  const memory = [...seed.fr],
    bits = [...seed.bit],
    fifo = [...seed.order],
    recent = new Map(seed.recent.map((p, i) => [p, i - seed.recent.length])),
    loaded = new Map(seed.order.map((p, i) => [p, i - seed.order.length]));
  let hand = seed.ptr;
  return refs.map((page, t) => {
    let frame = memory.indexOf(page),
      hit = frame >= 0,
      victim = null,
      skipped = [];
    if (!hit) {
      if (memory.includes(null)) {
        frame =
          alg === "CLOCK"
            ? Array.from({ length: n }, (_, i) => (hand + i) % n).find(
                (i) => memory[i] === null,
              )
            : memory.indexOf(null);
      } else if (alg === "FIFO") frame = memory.indexOf(fifo.shift());
      else if (alg === "LRU")
        frame = memory
          .map((p, i) => ({ i, time: recent.get(p) }))
          .sort((a, b) => a.time - b.time || a.i - b.i)[0].i;
      else if (alg === "OPT") {
        const future = refs.slice(t + 1);
        frame = memory
          .map((p, i) => ({
            i,
            next: future.includes(p) ? future.indexOf(p) : Infinity,
          }))
          .sort(
            (a, b) => (b.next === a.next ? 0 : b.next - a.next) || a.i - b.i,
          )[0].i;
      } else {
        let examined = 0;
        while (bits[hand] === 1) {
          skipped.push(memory[hand]);
          bits[hand] = 0;
          hand = (hand + 1) % n;
          assert.ok(++examined <= n);
        }
        frame = hand;
      }
      victim = memory[frame];
      memory[frame] = page;
      loaded.set(page, t);
      if (alg === "FIFO") fifo.push(page);
      if (alg === "CLOCK") hand = (frame + 1) % n;
    }
    recent.set(page, t);
    bits[frame] = 1;
    return {
      hit,
      slot: frame,
      victim,
      skipped,
      after: {
        fr: [...memory],
        bit: [...bits],
        ptr: hand,
        load: memory.map((p) => (p === null ? -1 : loaded.get(p))),
        last: memory.map((p) => (p === null ? -1 : recent.get(p))),
      },
    };
  });
}
let traces = 0,
  states = 0,
  continuations = 0;
for (let n = 1; n <= 8; n++)
  for (let sample = 0; sample < 10; sample++) {
    const pool = shuffle(Array.from({ length: 16 }, (_, i) => i)),
      fr = pool.slice(0, n).map((p) => (random(4) === 0 ? null : p)),
      resident = fr.filter((p) => p !== null),
      seed = {
        fr,
        bit: fr.map((p) => (p === null ? 0 : random(2))),
        ptr: random(n),
        order: shuffle(resident),
        recent: shuffle(resident),
      },
      refs = Array.from({ length: 20 }, () => random(20));
    for (const alg of ["FIFO", "LRU", "OPT", "CLOCK"]) {
      const actual = plain(simulate(refs, n, alg, seed)),
        expected = reference(refs, n, alg, seed);
      traces++;
      expected.forEach((want, i) => {
        const got = actual[i];
        for (const key of ["hit", "slot", "victim", "skipped"])
          assert.deepEqual(
            got[key],
            want[key],
            `${alg} n=${n} case=${sample} step=${i} ${key}`,
          );
        for (const key of ["fr", "bit", "ptr", "load", "last"])
          assert.deepEqual(
            got.after[key],
            want.after[key],
            `${alg} n=${n} case=${sample} step=${i} ${key}`,
          );
        assert.equal(got.after.time, i + 1);
        states++;
      });
      if (alg !== "OPT") {
        const first = plain(simulate(refs.slice(0, 9), n, alg, seed)),
          tail = plain(simulate(refs.slice(9), n, alg, first.at(-1).after));
        tail.forEach((s, i) =>
          assert.deepEqual(
            s.after,
            actual[i + 9].after,
            `continuation ${alg} ${i}`,
          ),
        );
        continuations++;
      }
    }
  }
const result = { traces, states, continuations, passed: true };
console.log("PASS", JSON.stringify(result));
fs.mkdirSync("/workspace/artifacts/memory-demo-custom", { recursive: true });
fs.writeFileSync(
  "/workspace/artifacts/memory-demo-custom/seeded-results.json",
  JSON.stringify(result, null, 2),
);
